import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelBooking } from '../api';

const CancelBooking = () => {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  // Get bookingId directly from window.location.search
  const searchParams = new URLSearchParams(window.location.search);
  let bookingId = searchParams.get('bookingId');
  
  // Fix the timestamp format - replace space with + for timezone offset
  if (bookingId && bookingId.includes(' 00:00')) {
    bookingId = bookingId.replace(' 00:00', '+00:00');
  }

  const handleCancel = async () => {
    if (!bookingId) {
      setError('No booking ID provided');
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const data = await cancelBooking(bookingId);
      console.log('Cancellation response:', data);
      setCancelled(true);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src="/carlogo.jpg" alt="The Garage Dunboyne" className="h-12 w-12 rounded-full" />
                <h1 className="text-2xl font-bold text-gray-900">Cancel Booking</h1>
              </div>
              <Link
                to="/booking"
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Booking</h1>
              <p className="text-gray-600">
                No booking ID provided. Please use the link from your booking confirmation email.
              </p>
            </div>
            
            <Link
              to="/booking"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Make a New Booking
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/carlogo.jpg" alt="The Garage Dunboyne" className="h-12 w-12 rounded-full" />
              <h1 className="text-2xl font-bold text-gray-900">
                {cancelled ? 'Booking Cancelled' : 'Cancel Booking'}
              </h1>
            </div>
            <Link
              to="/booking"
              className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          {!cancelled ? (
            <>
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Cancel Booking</h1>
                <p className="text-gray-600">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={`
                    w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors
                    ${cancelling 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                    }
                  `}
                >
                  {cancelling ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </button>
                
                <Link
                  to="/booking"
                  className="block w-full py-3 px-6 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Booking
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Cancelled</h1>
                <p className="text-green-600 font-medium mb-6">
                  Your booking has been successfully cancelled.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to="/booking"
                  className="block w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Book New Appointment
                </Link>
                
                <button
                  onClick={() => window.location.href = 'https://thegaragedunboyne.ie'}
                  className="block w-full py-3 px-6 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Website
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CancelBooking;
