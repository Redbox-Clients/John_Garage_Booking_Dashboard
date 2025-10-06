// src/api.js
import axios from 'axios';

export const fetchAllBookings = async () => {
  try {
    // Supabase REST API endpoint for the 'Bookings' table (case-sensitive)
    const url = "https://cxxsmnajkafbrltyjrfi.supabase.co/rest/v1/Bookings";
    const response = await axios.get(url, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eHNtbmFqa2FmYnJsdHlqcmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjQsImV4cCI6MjA2NzM5ODM2NH0.LGWqe-Dma8S-ly3WpLGzeFwCgTS1Ef60Ils2Y2JctS0',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eHNtbmFqa2FmYnJsdHlqcmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjIzNjQsImV4cCI6MjA2NzM5ODM2NH0.LGWqe-Dma8S-ly3WpLGzeFwCgTS1Ef60Ils2Y2JctS0',
        'Content-Type': 'application/json',
      }
    });
    // Supabase returns an array of rows
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Error fetching bookings from Supabase:", error);
    return [];
  }
};

export const declineBooking = async (bookingId) => {
  const response = await axios.post("https://redboxrob.app.n8n.cloud/webhook/43e21861-e5fe-47a9-befa-4d4c8f83d960", 
    { id: String(bookingId) });
  return response.data;
};

export const completeBooking = async (bookingId) => {
  const response = await axios.post("https://redboxrob.app.n8n.cloud/webhook/1f005c03-6bfc-4f4d-84a3-6849d9a9d27b",
     { id: String(bookingId) });
  return response.data;
};

export const approveBooking = async (bookingId) => {
  const response = await axios.post("https://redboxrob.app.n8n.cloud/webhook/d57bb452-db53-4f5f-b03a-a1045219d9f1", { id: String(bookingId) });
  return response.data;
};
