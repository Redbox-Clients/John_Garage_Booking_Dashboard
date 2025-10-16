import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import BookingForm from './components/BookingForm';
import CancelBooking from './components/CancelBooking';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setIsLoggedIn(!!user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* Public routes */}
          <Route path="/booking" element={<BookingForm />} />
          <Route path="/cancel-booking" element={<CancelBooking />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={isLoggedIn ? <Dashboard onSignOut={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/login" 
            element={!isLoggedIn ? <SignIn onLogin={() => setIsLoggedIn(true)} /> : <Navigate to="/dashboard" replace />} 
          />
          
          {/* Default route */}
          <Route 
            path="/" 
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/booking"} replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;