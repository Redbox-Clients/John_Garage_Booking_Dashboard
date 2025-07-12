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
              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'declined' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {booking.status}
            </span>
          </p>

          <div className="pt-4">
            <label htmlFor="status-dropdown" className="block text-sm font-medium text-gray-700 mb-2">Change Status</label>
            <select
              id="status-dropdown"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={booking.status} // Use booking.status
              onChange={(e) => handleStatusChangeRequest(e.target.value)}
            >
              <option value="pending" disabled>Pending</option>
              <option value="Completed">Completed</option>
              <option value="Declined">Declined</option>
            </select>
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