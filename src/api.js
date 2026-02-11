// src/api.js
import axios from 'axios';
import { auth } from './firebase';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://garage-booking-ygrt.onrender.com';

async function getAuthHeader() {
  const currentUser = auth.currentUser;
  console.log('Current user:', currentUser?.email || 'No user');
  
  if (!currentUser) {
    console.warn('No authenticated user found');
    return {};
  }
  
  try {
    const idToken = await currentUser.getIdToken();
    console.log('Got ID token:', idToken ? 'yes' : 'no');
    return { Authorization: `Bearer ${idToken}` };
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return {};
  }
}

// Public API functions (no auth required)
export const fetchAvailability = async () => {
  try {
    const { data } = await axios.get(`${API_BASE}/api/availability`);
    return data.unavailableDates || [];
  } catch (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
};

export const createBooking = async (bookingData) => {
  try {
    // If a user is signed in, include the ID token so the backend can apply the 2-week override.
    const headers = await getAuthHeader();
    const { data } = await axios.post(`${API_BASE}/api/bookings`, bookingData, { headers });
    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const cancelBooking = async (bookingId) => {
  try {
    // Optional: include auth when available.
    const headers = await getAuthHeader();
    const { data } = await axios.post(`${API_BASE}/api/bookings/cancel`, { bookingId }, { headers });
    return data;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    throw error;
  }
};

// Protected API functions (auth required)
export const fetchAllBookings = async () => {
  try {
    const headers = await getAuthHeader();
    const { data } = await axios.get(`${API_BASE}/api/bookings`, { headers });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
};

export const declineBooking = async (bookingId) => {
  const headers = await getAuthHeader();
  const { data } = await axios.post(`${API_BASE}/api/bookings/${bookingId}/decline`, {}, { headers });
  return data;
};

export const completeBooking = async (bookingId) => {
  const headers = await getAuthHeader();
  const { data } = await axios.post(`${API_BASE}/api/bookings/${bookingId}/complete`, {}, { headers });
  return data;
};

export const approveBooking = async (bookingId) => {
  const headers = await getAuthHeader();
  const { data } = await axios.post(`${API_BASE}/api/bookings/${bookingId}/approve`, {}, { headers });
  return data;
};

// Admin function to cleanup duplicate bookings
export const cleanupDuplicates = async () => {
  try {
    const headers = await getAuthHeader();
    const { data } = await axios.post(`${API_BASE}/api/admin/cleanup-duplicates`, {}, { headers });
    return data;
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    throw error;
  }
};
