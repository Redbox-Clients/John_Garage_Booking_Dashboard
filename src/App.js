import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {isLoggedIn ? <Dashboard onSignOut={handleLogout} /> : <SignIn onLogin={() => setIsLoggedIn(true)} />}
    </div>
  );
};

export default App;