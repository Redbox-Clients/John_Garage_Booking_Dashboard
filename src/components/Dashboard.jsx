import React, { useState, useEffect, useMemo } from 'react';
import BookingTable from './BookingTable';
import BookingModal from './BookingModal';
import { fetchAllBookings } from '../api';
import { declineBooking, completeBooking, approveBooking } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to get days in a month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the day of the week for the first day of the month
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
};

// Helper to format date to YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to update a booking's status in the allRawBookings array
function updateBookingStatusInList(bookings, bookingId, newStatus) {
  return bookings.map(b =>
    b.id === bookingId ? { ...b, status: newStatus } : b
  );
}

// Helper to generate PDF for the day's bookings
function generateBookingsPDF(bookings, dateString) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Bookings for ' + dateString, 10, 15);
  doc.setFontSize(12);
  const headers = ['Name', 'Email', 'Phone', 'Car Details', 'Status'];
  let startY = 25;
  autoTable(doc, {
    head: [headers],
    body: bookings.map(b => [
      b.name,
      b.email,
      b.phone,
      `${b.make || ''} ${b.model || ''} (${b.reg || ''})`.trim(),
      b.status
    ]),
    startY,
    theme: 'grid',
    headStyles: { fillColor: [220, 220, 220] },
    styles: { fontSize: 10 },
    margin: { left: 10, right: 10 },
  });
  doc.save(`bookings-${dateString}.pdf`);
}

const Dashboard = ({ onSignOut }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allRawBookings, setAllRawBookings] = useState([]); // New state to store all fetched bookings
  const [selectedBooking, setSelectedBooking] = useState(null);

  // States for custom datepicker logic (availability fetching, calendar display)
  const [fetchingAvailability, setFetchingAvailability] = useState(true); 
  const [availabilityError, setAvailabilityError] = useState(null); 
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth()); 
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear()); 
  const [showCalendar, setShowCalendar] = useState(false); 
  const [dateSelectionError, setDateSelectionError] = useState(null); 

  // Effect to fetch all bookings ONCE when the component mounts
  useEffect(() => {
    const fetchInitialBookings = async () => {
      try {
        setFetchingAvailability(true); // Can reuse this loading state for initial fetch
        setAvailabilityError(null);
        const data = await fetchAllBookings(); // Call API without date parameter
        setAllRawBookings(data); // Store all raw bookings
      } catch (error) {
        console.error('Failed to fetch all bookings:', error);
        setAvailabilityError('Failed to load all bookings. Please check your API.');
      } finally {
        setFetchingAvailability(false);
      }
    };

    fetchInitialBookings();
  }, []); // Empty dependency array means this runs only once on mount

  // Use useMemo to filter bookings based on currentDate from allRawBookings
  const bookings = useMemo(() => {
    const formattedCurrentDate = formatDate(currentDate);
    console.log("Current date:", formattedCurrentDate);
    console.log("All bookings:", allRawBookings.map(b => b.appointment_date));
    return allRawBookings
      .filter(booking => {
        return booking.appointment_date === formattedCurrentDate;
      })
      .map(booking => ({
        // Map webhook data keys to expected keys for BookingTable and BookingModal
        id: String(booking.id), 
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        make: booking.make,
        model: booking.model,
        reg: booking.reg,
        details: booking.details,
        status: booking.status,
        appointment_date: booking.appointment_date,
        // Add any other fields your BookingTable/Modal might expect
      }));
  }, [allRawBookings, currentDate]); // Re-calculate when allRawBookings or currentDate changes

  const handleViewBooking = (booking) => setSelectedBooking(booking);
  const handleCloseModal = () => setSelectedBooking(null);

  // --- Date Navigation Logic (for prev/next day buttons) ---
  const handlePrevDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate); 
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDay = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate); 
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayOfWeek = getFirstDayOfMonth(calendarYear, calendarMonth);

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarYear, calendarMonth, i);
      date.setHours(0, 0, 0, 0); 
      days.push(date);
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    setCalendarMonth(prevMonth => {
      if (prevMonth === 0) {
        setCalendarYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prevMonth => {
      if (prevMonth === 11) {
        setCalendarYear(prevYear => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  };

  const handleCalendarDayClick = (date) => {
    if (!date) return;

    setCurrentDate(date); 
    setDateSelectionError(null); 
    setShowCalendar(false); 
  };

  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { booking, status } or null

  const handleStatusChangeRequest = (status) => {
    setPendingStatusChange({ booking: selectedBooking, status });
  };

  // Calculate the date 3 months ago from today
  const threeMonthsAgo = useMemo(() => {
    const today = new Date();
    const threeMonthsAgoDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    threeMonthsAgoDate.setHours(0, 0, 0, 0);
    return threeMonthsAgoDate;
  }, []);

  // Calculate the date 3 months ahead from today
  const threeMonthsAhead = useMemo(() => {
    const today = new Date();
    const threeMonthsAheadDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    threeMonthsAheadDate.setHours(23, 59, 59, 999);
    return threeMonthsAheadDate;
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white p-4 flex flex-row items-center shadow-md">
        {/* Left: Logo/Title */}
        <div className="flex-1 flex items-center min-w-0">
          <h1 className="text-l font-bold text-gray-800 truncate">The Garage Dunboyne</h1>
        </div>
        {/* Center: Date selection/calendar */}
        <div className="flex-1 flex justify-center min-w-0">
          <div className="flex items-center space-x-2 relative">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              aria-label="Previous Day"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <div
              className="text-lg font-semibold text-gray-700 min-w-[200px] text-center p-2 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              {currentDate.toDateString()}
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              aria-label="Next Day"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            {/* Custom Datepicker Calendar (unchanged) */}
            {showCalendar && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-72 sm:w-80">
                {fetchingAvailability ? (
                  <div className="text-center text-gray-600 mb-4">Loading calendar data...</div>
                ) : availabilityError ? (
                  <div className="text-center text-red-600 mb-4">{availabilityError}</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <button type="button" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      <span className="text-lg font-semibold text-gray-800">
                        {monthNames[calendarMonth]} {calendarYear}
                      </span>
                      <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {dayNames.map(day => (
                        <div key={day} className="font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((date, index) => {
                        const dateString = date ? formatDate(date) : null;
                        const isSelected = dateString && formatDate(currentDate) === dateString;

                        // Disable if more than 3 months ago or more than 3 months ahead
                        const isTooOld = date && date < threeMonthsAgo;
                        const isTooFar = date && date > threeMonthsAhead;
                        const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6); // Sunday=0, Saturday=6

                        let dayClasses = "p-2 rounded-md transition duration-150 ease-in-out";
                        if (date) {
                          if (isTooOld || isTooFar || isWeekend) {
                            dayClasses += " bg-gray-100 text-gray-400 cursor-not-allowed";
                          } else if (isSelected) {
                            dayClasses += " bg-indigo-600 text-white font-bold";
                          } else {
                            dayClasses += " hover:bg-indigo-100 cursor-pointer";
                          }
                        } else {
                          dayClasses += " invisible"; // For empty cells
                        }

                        return (
                          <div
                            key={index}
                            className={dayClasses}
                            onClick={() => !(isTooOld || isTooFar || isWeekend) && handleCalendarDayClick(date)} 
                          >
                            {date ? date.getDate() : ''}
                          </div>
                        );
                      })}
                    </div>
                    {dateSelectionError && (
                      <p className="text-red-600 text-sm mt-3 text-center">{dateSelectionError}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      All dates are selectable.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right: Buttons */}
      
        <div className="flex-1 flex justify-end items-center space-x-2 min-w-0">
          <button
            onClick={() => window.open('https://thegaragedunboynebookingform.netlify.app/', '_blank')}
            className="px-4 py-2 rounded-lg transition-colors bg-blue-400 hover:bg-blue-500 text-white"
          >
            Book Appointment
        </button>
          <button
            onClick={() => bookings.length > 0 && generateBookingsPDF(bookings, formatDate(currentDate))}
            className={`px-4 py-2 rounded-lg transition-colors mr-2 ${bookings.length > 0 ? 'bg-gray-300 hover:bg-gray-400 text-gray-800 cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            disabled={bookings.length === 0}
            title={bookings.length === 0 ? 'No bookings for this day' : 'Download PDF for This Day'}
          >
            Download PDF
          </button>
          <button onClick={onSignOut} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">Sign Out</button>
        </div>
      </header>
      <main className="p-4 flex-grow">
        <BookingTable bookings={bookings} handleViewBooking={handleViewBooking} />
      </main>
      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          onClose={handleCloseModal}
          handleStatusChangeRequest={handleStatusChangeRequest}
        />
      )}
      {pendingStatusChange && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {pendingStatusChange.status === 'Approved' ? (
            <div className="bg-white p-6 rounded shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-2 text-blue-700">Approve Booking</h2>
              <p className="mb-4">Are you sure you want to <span className="font-semibold text-blue-600">approve</span> this booking? This will notify the customer and mark the booking as approved.</p>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setPendingStatusChange(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button
                  onClick={async () => {
                    const { booking, status } = pendingStatusChange;
                    try {
                      await approveBooking(booking.id);
                      // Update the booking status in the main grid immediately
                      setAllRawBookings(prev => updateBookingStatusInList(prev, booking.id, status));
                      setSelectedBooking({ ...booking, status });
                      // Optionally, refetch all bookings in the background for sync
                      fetchAllBookings().then(setAllRawBookings);
                    } catch (e) {
                      alert("Failed to approve booking.");
                    } finally {
                      setPendingStatusChange(null);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Yes, Approve
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded shadow-lg">
              <p>
                Are you sure you want to mark this booking as <b>{pendingStatusChange.status}</b>?
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setPendingStatusChange(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button
                  onClick={async () => {
                    const { booking, status } = pendingStatusChange;
                    try {
                      if (status === "Declined") {
                        await declineBooking(booking.id);
                      } else if (status === "Completed") {
                        await completeBooking(booking.id);
                      }
                      const updatedData = await fetchAllBookings();
                      setAllRawBookings(updatedData);
                      setSelectedBooking({ ...booking, status });
                    } catch (e) {
                      alert("Failed to update booking status.");
                    } finally {
                      setPendingStatusChange(null);
                    }
                  }}
                  className={`px-4 py-2 text-white rounded ${
                    pendingStatusChange.status === 'Completed' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
