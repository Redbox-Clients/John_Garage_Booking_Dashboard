// src/components/BookingTable.jsx
import React from 'react';

const BookingTable = ({ bookings, handleViewBooking, isUpdatingStatus }) => {
  // Ensure bookings is an array to prevent errors if data is not yet loaded or is malformed
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isUpdatingStatus ? (
            <tr>
              <td colSpan="7" className="py-8 text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-sm text-gray-600">Updating booking status...</p>
                </div>
              </td>
            </tr>
          ) : safeBookings.length > 0 ? (
            safeBookings.map((booking) => (
              <tr
                key={booking.id}
                role="button"
                tabIndex={0}
                onClick={() => handleViewBooking(booking)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewBooking(booking);
                  }
                }}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label={`View booking ${booking.id}`}
              >
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{booking.name}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{booking.email}</td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{booking.phone}</td>
                {/* Concatenating car make, model, and registration */}
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">{`${booking.make || ''} ${booking.model || ''} (${booking.reg || ''})`.trim()}</td>
                {/* Booking Date column */}
                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700">
                  {booking.appointment_date ? new Date(booking.appointment_date).toLocaleDateString('en-GB') : 'N/A'}
                </td>
                {/* Status column */}
                <td className="px-6 py-2 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                </td>
                {/* Actions column */}
                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewBooking(booking);
                    }}
                    className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100 transition-colors duration-150"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              {/* Message displayed when no bookings are found for the selected date */}
              <td colSpan="7" className="py-4 text-center text-sm text-gray-500 w-full">
                No bookings for this date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;