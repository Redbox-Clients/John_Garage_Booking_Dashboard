import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDvLeUC8VNwOJU8g1RM6dlY80XygVzmXh8",
    authDomain: "booking-dashboard-9c44a.firebaseapp.com",
    projectId: "booking-dashboard-9c44a",
    storageBucket: "booking-dashboard-9c44a.firebasestorage.app",
    messagingSenderId: "384393743138",
    appId: "1:384393743138:web:8ec44d7d5991e1753cb37b",
    measurementId: "G-6DVS0QRS1X"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);