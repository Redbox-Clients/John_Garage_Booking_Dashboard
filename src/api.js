// src/api.js
import axios from 'axios';

export const fetchAllBookings = async () => { // Removed 'date' parameter
  try {
    // This URL will now always fetch all bookings, as per your clarification.
    const url = "https://redboxrob.app.n8n.cloud/webhook/d1193ebf-bc94-4ee8-a9f2-9ef90ad80284"; 
      
    const response = await axios.get(url);
    // Ensure response.data is an array; if not, return empty array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching bookings:", error);
    // Important: Return an empty array on error to prevent breaking components expecting an array
    return []; 
  }
};

export const declineBooking = async (bookingId) => {
  const response = await axios.post("https://redboxrob.app.n8n.cloud/webhook/43e21861-e5fe-47a9-befa-4d4c8f83d960", 
    { bookingId });
  return response.data;
};

export const completeBooking = async (bookingId) => {
  const response = await axios.post("https://redboxrob.app.n8n.cloud/webhook/1f005c03-6bfc-4f4d-84a3-6849d9a9d27b",
     { bookingId });
  return response.data;
};
