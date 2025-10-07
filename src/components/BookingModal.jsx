// src/components/BookingModal.jsx
import React from 'react';

const BookingModal = ({ booking, onClose, onStatusChange, isUpdatingStatus, updateStatusError, handleStatusChangeRequest }) => {
  // If no booking object is provided, render nothing
  if (!booking) return null; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300 scale-95 animate-scale-in-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900">Booking Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors duration-150" aria-label="Close Modal">
            ✕
          </button>
        </div>

        <div className="space-y-4 text-gray-700">
          <p><span className="font-semibold">Booking ID:</span> {booking.id}</p>
          <p><span className="font-semibold">Booking Date:</span> {booking.date ? new Date(booking.date).toLocaleDateString('en-GB') : 'N/A'}</p>
          <p><span className="font-semibold">Customer Name:</span> {booking.name}</p>
          <p><span className="font-semibold">Email:</span> {booking.email}</p>
          <p><span className="font-semibold">Phone:</span> {booking.phone}</p>
          {/* Displaying concatenated car details */}
          <p><span className="font-semibold">Car Details:</span> {`${booking.make || ''} ${booking.model || ''} (${booking.reg || ''})`.trim()}</p>
          <p><span className="font-semibold">Details:</span> {booking.details}</p>
          <p>
            <span className="font-semibold">Current Status:</span>{' '}
            {/* Dynamic styling for status badge */}
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
              booking.status === 'Completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'Declined' ? 'bg-red-100 text-red-800' :
              booking.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'declined' ? 'bg-red-100 text-red-800' :
              booking.status === 'approved' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {booking.status}
            </span>
          </p>

          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Pending Button */}
              {booking.status && booking.status.toLowerCase() === 'pending' && (
                <button
                  onClick={() => handleStatusChangeRequest('pending')}
                  disabled={true}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-yellow-100 text-yellow-800 cursor-not-allowed opacity-60"
                >
                  Pending
                </button>
              )}
              
              {/* Approved Button */}
              {!(booking.status && ((booking.status.toLowerCase() === 'declined') || (booking.status.toLowerCase() === 'completed') || (booking.status.toLowerCase() === 'approved'))) && (
                <button
                  onClick={() => handleStatusChangeRequest('Approved')}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                >
                  Approve
                </button>
              )}
              
              {/* Completed Button */}
              {!(booking.status && ((booking.status.toLowerCase() === 'declined') || (booking.status.toLowerCase() === 'completed'))) && (
                <button
                  onClick={() => handleStatusChangeRequest('Completed')}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                >
                  Complete
                </button>
              )}
              
              {/* Declined Button */}
              {!(booking.status && ((booking.status.toLowerCase() === 'declined') || (booking.status.toLowerCase() === 'completed'))) && (
                <button
                  onClick={() => handleStatusChangeRequest('Declined')}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                >
                  Decline
                </button>
              )}
            </div>
          </div>

          {isUpdatingStatus && <p>Updating status...</p>}
          {updateStatusError && <p className="text-red-500">{updateStatusError}</p>}

          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;