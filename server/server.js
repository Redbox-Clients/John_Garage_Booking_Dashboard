import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// Firebase Admin init (use service account JSON or env vars)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const json = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('Firebase Admin initialized with service account');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const json = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
      console.log('Firebase Admin initialized with service account');
    } else {
      admin.initializeApp();
      console.log('Firebase Admin initialized with default credentials');
    }
  } catch (e) {
    console.error('Failed to init Firebase Admin:', e.message);
  }
}

// Basic security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: allow multiple origins via comma-separated list in ALLOWED_ORIGIN
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, '')) // strip trailing slash
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin or curl
    const cleanOrigin = origin.replace(/\/$/, '');
    if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// Ensure Vary header for caches
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

app.use(express.json());

// Middleware: verify Firebase JWT (from FE)
async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token) {
    console.log('No auth token provided');
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email };
    console.log('Auth successful for user:', decoded.email);
    return next();
  } catch (e) {
    console.error('Token verification failed:', e.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Supabase config (service role stays server-side only)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // never put this in FE

// n8n webhook shared secret header key/value
const N8N_SECRET_HEADER = process.env.N8N_SECRET_HEADER || 'x-internal-secret';
const N8N_SECRET_VALUE = process.env.N8N_SECRET_VALUE || '';

function sbHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
  };
}

// Routes
app.options('*', cors()); // handle preflight

// Public endpoint to get unavailable dates (no auth required for booking form)
app.get('/api/availability', async (_req, res) => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/Bookings?select=appointment_date`;
    const { data } = await axios.get(url, { headers: sbHeaders() });
    
    // Calculate dates with 10 or more bookings
    const bookings = Array.isArray(data) ? data : [];
    const dateOccurrences = bookings.reduce((acc, cur) => {
      acc[cur.appointment_date] = (acc[cur.appointment_date] || 0) + 1;
      return acc;
    }, {});
    
    const unavailableDates = Object.keys(dateOccurrences).filter(
      (date) => dateOccurrences[date] >= 10,
    );
    
    res.json({ unavailableDates });
  } catch (err) {
    console.error('GET /api/availability error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// In-memory store to prevent duplicate submissions (simple solution for now)
const recentSubmissions = new Map();

// Public endpoint to create a booking (no auth required)
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, email, phoneNumber, carReg, carMake, carModel, appointmentDate, carNeeds } = req.body;
    
    console.log('=== BOOKING REQUEST ===');
    console.log('Request body:', req.body);
    
    // Basic validation
    if (!name || !email || !phoneNumber || !carReg || !appointmentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create a unique key for duplicate detection
    const submissionKey = `${email.trim().toLowerCase()}-${carReg.trim().toUpperCase()}-${appointmentDate}`;
    const now = Date.now();
    
    // Check for recent duplicate (within 30 seconds)
    if (recentSubmissions.has(submissionKey)) {
      const lastSubmission = recentSubmissions.get(submissionKey);
      if (now - lastSubmission < 30000) { // 30 seconds
        console.log('Duplicate submission detected, ignoring:', submissionKey);
        return res.status(409).json({ error: 'Duplicate submission detected. Please wait before submitting again.' });
      }
    }
    
    // Record this submission
    recentSubmissions.set(submissionKey, now);
    
    // Clean up old entries (older than 5 minutes)
    for (const [key, timestamp] of recentSubmissions.entries()) {
      if (now - timestamp > 300000) { // 5 minutes
        recentSubmissions.delete(key);
      }
    }
    
    // Check if the requested date is fully booked (10+ bookings)
    try {
      const availabilityCheckUrl = `${SUPABASE_URL}/rest/v1/Bookings?appointment_date=eq.${appointmentDate}&select=id`;
      const { data: dateBookings } = await axios.get(availabilityCheckUrl, { headers: sbHeaders() });
      
      if (dateBookings && dateBookings.length >= 10) {
        console.log(`Date ${appointmentDate} is fully booked with ${dateBookings.length} bookings`);
        return res.status(409).json({ 
          error: 'Selected date is fully booked. Please choose another date.',
          reason: 'date_fully_booked',
          currentBookings: dateBookings.length
        });
      }
      console.log(`Date ${appointmentDate} availability check passed: ${dateBookings.length}/10 bookings`);
    } catch (availErr) {
      console.log('Error checking date availability (continuing anyway):', availErr.message);
    }
    
    // Check if the date is within valid booking range (not too far in future, not too soon, not in past)
    try {
      const bookingDate = new Date(appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const twoWeeksFromToday = new Date(today);
      twoWeeksFromToday.setDate(today.getDate() + 14);
      
      const threeMonthsFromToday = new Date(today);
      threeMonthsFromToday.setMonth(today.getMonth() + 3);
      
      if (bookingDate < today) {
        return res.status(400).json({ 
          error: 'Cannot book appointments for past dates.',
          reason: 'date_in_past'
        });
      }
      
      if (bookingDate <= twoWeeksFromToday) {
        return res.status(400).json({ 
          error: 'Appointments cannot be booked within the next two weeks.',
          reason: 'date_too_soon'
        });
      }
      
      if (bookingDate > threeMonthsFromToday) {
        return res.status(400).json({ 
          error: 'Bookings cannot be made more than 3 months in advance.',
          reason: 'date_too_far'
        });
      }
      
      // Check if it's a weekend
      const dayOfWeek = bookingDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return res.status(400).json({ 
          error: 'Weekends are not available for appointments.',
          reason: 'weekend_not_allowed'
        });
      }
      
      console.log(`Date ${appointmentDate} range validation passed`);
    } catch (dateErr) {
      console.log('Error validating date range (continuing anyway):', dateErr.message);
    }
    
    // Check if booking already exists in database
    try {
      const existingUrl = `${SUPABASE_URL}/rest/v1/Bookings?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&reg=eq.${encodeURIComponent(carReg.trim().toUpperCase())}&appointment_date=eq.${appointmentDate}&select=id,status`;
      const { data: existingBookings } = await axios.get(existingUrl, { headers: sbHeaders() });
      
      if (existingBookings && existingBookings.length > 0) {
        console.log('Existing booking found:', existingBookings);
        return res.status(409).json({ 
          error: 'A booking with these details already exists.',
          existingBooking: existingBookings[0]
        });
      }
    } catch (checkErr) {
      console.log('Error checking existing bookings (continuing anyway):', checkErr.message);
    }

    // Check if the requested date is available (not fully booked)
    try {
      const availabilityUrl = `${SUPABASE_URL}/rest/v1/Bookings?appointment_date=eq.${appointmentDate}&select=id`;
      const { data: dateBookings } = await axios.get(availabilityUrl, { headers: sbHeaders() });
      
      const bookingCount = Array.isArray(dateBookings) ? dateBookings.length : 0;
      console.log(`Date ${appointmentDate} currently has ${bookingCount} bookings`);
      
      if (bookingCount >= 10) {
        console.log(`Date ${appointmentDate} is fully booked (${bookingCount} bookings)`);
        return res.status(409).json({ 
          error: `The selected date ${appointmentDate} is fully booked. Please choose another date.`,
          reason: 'date_fully_booked',
          currentBookings: bookingCount
        });
      }
    } catch (availErr) {
      console.log('Error checking date availability (continuing anyway):', availErr.message);
    }
    
    // Prepare booking data for n8n webhook (let n8n handle Supabase creation)
    const bookingPayload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      carReg: carReg.trim().toUpperCase(),
      carMake: carMake?.trim() || '',
      carModel: carModel?.trim() || '',
      appointmentDate: appointmentDate,
      carNeeds: carNeeds?.trim() || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      apiKey: "" // As per original form
    };
    
    console.log('Sending to n8n webhook:', bookingPayload);
    
    // Trigger n8n webhook for booking creation (n8n will handle Supabase insertion)
    const n8nUrl = process.env.N8N_BOOKING_WEBHOOK_URL || 'https://redboxrob.app.n8n.cloud/webhook/797f3300-663d-42bb-9337-92790b5d26a8';
    
    const response = await axios.post(n8nUrl, bookingPayload);
    console.log('Booking webhook response:', response.data);
    
    // Return success response
    res.status(201).json({ 
      message: 'Booking submitted successfully', 
      bookingId: response.data?.id || 'pending',
      status: 'pending'
    });
    
  } catch (err) {
    console.error('POST /api/bookings error', err?.response?.data || err.message);
    
    // Remove from recent submissions on error
    const submissionKey = `${req.body.email?.trim().toLowerCase()}-${req.body.carReg?.trim().toUpperCase()}-${req.body.appointmentDate}`;
    recentSubmissions.delete(submissionKey);
    
    // If n8n webhook fails, provide helpful error message
    if (err.response?.status >= 400) {
      res.status(500).json({ error: 'Failed to process booking. Please try again or contact support.' });
    } else {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }
});

// Public endpoint to cancel a booking (no auth required)
app.post('/api/bookings/cancel', async (req, res) => {
  try {
    const { bookingId } = req.body;
    
    if (!bookingId) {
      return res.status(400).json({ error: 'Missing bookingId' });
    }
    
    // Trigger n8n webhook for cancellation
    const n8nUrl = process.env.N8N_CANCEL_WEBHOOK_URL || 'https://redboxrob.app.n8n.cloud/webhook/9069c6f8-96b2-44a7-bda9-ce78fae02e3e';
    const response = await axios.post(n8nUrl, { bookingId });
    
    res.json(response.data);
  } catch (err) {
    console.error('POST /api/bookings/cancel error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

app.get('/api/bookings', verifyAuth, async (_req, res) => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/Bookings?select=*`;
    const { data } = await axios.get(url, { headers: sbHeaders() });
    res.json(data);
  } catch (err) {
    console.error('GET /api/bookings error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

app.post('/api/bookings/:id/approve', verifyAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${SUPABASE_URL}/rest/v1/Bookings?id=eq.${id}`;
    const { data } = await axios.patch(url, { status: 'approved' }, {
      headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    });

    const n8nUrl = process.env.N8N_APPROVE_WEBHOOK_URL;
    if (n8nUrl && N8N_SECRET_VALUE) {
      await axios.post(n8nUrl, { id: String(id) }, { headers: { [N8N_SECRET_HEADER]: N8N_SECRET_VALUE } });
    }

    res.json(Array.isArray(data) ? data[0] : data);
  } catch (err) {
    console.error('POST /api/bookings/:id/approve error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

app.post('/api/bookings/:id/decline', verifyAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${SUPABASE_URL}/rest/v1/Bookings?id=eq.${id}`;
    const { data } = await axios.patch(url, { status: 'declined' }, {
      headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    });

    const n8nUrl = process.env.N8N_DECLINE_WEBHOOK_URL;
    if (n8nUrl && N8N_SECRET_VALUE) {
      await axios.post(n8nUrl, { id: String(id) }, { headers: { [N8N_SECRET_HEADER]: N8N_SECRET_VALUE } });
    }

    res.json(Array.isArray(data) ? data[0] : data);
  } catch (err) {
    console.error('POST /api/bookings/:id/decline error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to decline' });
  }
});

app.post('/api/bookings/:id/complete', verifyAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const url = `${SUPABASE_URL}/rest/v1/Bookings?id=eq.${id}`;
    const { data } = await axios.patch(url, { status: 'completed' }, {
      headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
    });

    const n8nUrl = process.env.N8N_COMPLETE_WEBHOOK_URL;
    if (n8nUrl && N8N_SECRET_VALUE) {
      await axios.post(n8nUrl, { id: String(id) }, { headers: { [N8N_SECRET_HEADER]: N8N_SECRET_VALUE } });
    }

    res.json(Array.isArray(data) ? data[0] : data);
  } catch (err) {
    console.error('POST /api/bookings/:id/complete error', err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to complete' });
  }
});

// Admin endpoint to clean up duplicate bookings (auth required)
app.post('/api/admin/cleanup-duplicates', verifyAuth, async (req, res) => {
  try {
    console.log('Starting cleanup of duplicate bookings...');
    
    // Get all bookings
    const url = `${SUPABASE_URL}/rest/v1/Bookings?select=*&order=created_at.asc`;
    const { data: allBookings } = await axios.get(url, { headers: sbHeaders() });
    
    if (!allBookings || allBookings.length === 0) {
      return res.json({ message: 'No bookings found', deletedCount: 0 });
    }
    
    // Group bookings by email, reg, and appointment_date
    const groups = {};
    allBookings.forEach(booking => {
      const key = `${booking.email}-${booking.reg}-${booking.appointment_date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(booking);
    });
    
    // Find duplicates to delete (keep the one with valid status, or the earliest one)
    const toDelete = [];
    let duplicateGroups = 0;
    
    Object.keys(groups).forEach(key => {
      const bookings = groups[key];
      if (bookings.length > 1) {
        duplicateGroups++;
        console.log(`Found ${bookings.length} duplicates for ${key}`);
        
        // Sort by: has valid status first, then by creation date
        bookings.sort((a, b) => {
          // Prioritize bookings with valid status
          const aHasStatus = a.status && a.status !== null;
          const bHasStatus = b.status && b.status !== null;
          
          if (aHasStatus && !bHasStatus) return -1;
          if (!aHasStatus && bHasStatus) return 1;
          
          // If both have same status validity, sort by creation date
          return new Date(a.created_at) - new Date(b.created_at);
        });
        
        // Keep the first one (best one), mark others for deletion
        const toKeep = bookings[0];
        const duplicatesToDelete = bookings.slice(1);
        
        console.log(`Keeping booking ID ${toKeep.id} (status: ${toKeep.status})`);
        duplicatesToDelete.forEach(dup => {
          console.log(`Marking for deletion: ID ${dup.id} (status: ${dup.status})`);
          toDelete.push(dup.id);
        });
      }
    });
    
    // Delete the duplicates
    let deletedCount = 0;
    for (const id of toDelete) {
      try {
        const deleteUrl = `${SUPABASE_URL}/rest/v1/Bookings?id=eq.${id}`;
        await axios.delete(deleteUrl, { headers: sbHeaders() });
        deletedCount++;
        console.log(`Deleted booking ID ${id}`);
      } catch (deleteErr) {
        console.error(`Failed to delete booking ID ${id}:`, deleteErr.message);
      }
    }
    
    res.json({
      message: `Cleanup completed. Found ${duplicateGroups} groups with duplicates.`,
      deletedCount,
      duplicateGroups
    });
    
  } catch (err) {
    console.error('Cleanup error:', err.message);
    res.status(500).json({ error: 'Failed to cleanup duplicates' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on :${PORT}`));
