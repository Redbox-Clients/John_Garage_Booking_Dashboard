import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchAvailability, createBooking } from '../api';

// Helper function to get days in a month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the day of the week for the first day of the month
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
};

// Main Booking Form component
export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '+353', // Initialized with the +353 prefix
    carReg: '',
    carMake: '',
    carModel: '',
    appointmentDate: '', // Will store the selected date string (YYYY-MM-DD)
    carNeeds: '',
  });

  const [loading, setLoading] = useState(false); // For form submission
  const [message, setMessage] = useState(''); // General form messages (success/error)
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // States for custom datepicker logic
  const [unavailableDates, setUnavailableDates] = useState([]); // Stores dates from API (YYYY-MM-DD)
  const [fetchingAvailability, setFetchingAvailability] = useState(true); // Loading state for availability fetch
  const [availabilityError, setAvailabilityError] = useState(null); // Error for availability fetch
  const [calendarState, setCalendarState] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  });
  const [showCalendar, setShowCalendar] = useState(false); // To toggle calendar visibility
  const [dateSelectionError, setDateSelectionError] = useState(null);

  // Fetch unavailable dates from API on component mount
  useEffect(() => {
    const fetchUnavailableDatesFromAPI = async () => {
      try {
        setFetchingAvailability(true);
        setAvailabilityError(null);
        const dates = await fetchAvailability();
        setUnavailableDates(dates);
      } catch (e) {
        console.error('Failed to fetch unavailable dates:', e);
        setAvailabilityError('Failed to load unavailable dates. Please try again later.');
      } finally {
        setFetchingAvailability(false);
      }
    };

    fetchUnavailableDatesFromAPI();
  }, []);

  // Helper to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get today's date (start of the disabled range)
  const todayDate = useMemo(() => {
    const today = new Date();
    // Normalize to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Calculate the date two weeks from today (end of the disabled range)
  const twoWeeksFromToday = useMemo(() => {
    const today = new Date();
    const twoWeeksLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
    // Normalize to end of day for accurate comparison to include the full day
    twoWeeksLater.setHours(23, 59, 59, 999);
    return twoWeeksLater;
  }, []);

  // Calculate the date 3 months from today (maximum booking limit)
  const threeMonthsFromToday = useMemo(() => {
    const today = new Date();
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    // Normalize to end of day for accurate comparison
    threeMonthsLater.setHours(23, 59, 59, 999);
    return threeMonthsLater;
  }, []);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calendarState.year, calendarState.month);
    const firstDayOfWeek = getFirstDayOfMonth(calendarState.year, calendarState.month); // 0 for Sunday

    const days = [];
    // Add leading empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(calendarState.year, calendarState.month, i);
      // Normalize to start of day for consistent comparison
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  }, [calendarState]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    setCalendarState(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCalendarState(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const handleDayClick = (date) => {
    if (!date) return;

    const dateString = formatDate(date);

    // Check if the date is a weekend (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      setMessage(`Weekends are not available for appointments. Please choose a weekday.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Weekends are not available for appointments. Please choose a weekday.`);
      return;
    }

    // Check if the date is specifically unavailable from API
    if (unavailableDates.includes(dateString)) {
      setMessage(`Date ${dateString} is unavailable. Please choose another date.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Date ${dateString} is unavailable. Please choose another date.`);
    }
    // Check if the date is in the disabled range (today up to two weeks from today)
    else if (date >= todayDate && date <= twoWeeksFromToday) {
      setMessage(`Appointments cannot be booked within the next two weeks. Please select a date after ${formatDate(twoWeeksFromToday)}.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Appointments cannot be booked within the next two weeks. Please select a date after ${formatDate(twoWeeksFromToday)}.`);
    }
    // Check if the date is in the past
    else if (date < todayDate) {
      setMessage(`You cannot select a past date (${dateString}).`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`You cannot select a past date (${dateString}).`);
    }
    // Check if the date is more than 3 months from today
    else if (date > threeMonthsFromToday) {
      setMessage(`Bookings cannot be made more than 3 months in advance. Please select a date before ${formatDate(threeMonthsFromToday)}.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Bookings cannot be made more than 3 months in advance. Please select a date before ${formatDate(threeMonthsFromToday)}.`);
    }
    else {
      setFormData(prevData => ({ ...prevData, appointmentDate: dateString }));
      setMessage('');
      setMessageType('');
      setDateSelectionError(null);
      setShowCalendar(false); // Hide calendar after selection
    }
  };

  // Handle input changes for form fields other than date
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading) {
      console.log('Form already submitting, ignoring duplicate submission');
      return;
    }

    // Check if all required fields are filled
    const requiredFields = ['name', 'email', 'phoneNumber', 'carReg', 'appointmentDate'];
    const missingFields = requiredFields.filter(field => !formData[field].trim());

    if (missingFields.length > 0) {
      setMessage(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setMessageType('error');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setMessage('Please enter a valid email address.');
      setMessageType('error');
      return;
    }

    // Phone number validation (basic)
    if (formData.phoneNumber.length < 10) {
      setMessage('Please enter a valid phone number.');
      setMessageType('error');
      return;
    }

    console.log('Starting form submission...');
    setLoading(true);
    setMessage('');

    try {
      await createBooking({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        carReg: formData.carReg,
        carMake: formData.carMake,
        carModel: formData.carModel,
        appointmentDate: formData.appointmentDate,
        carNeeds: formData.carNeeds,
      });

      setMessage('Booking submitted successfully! You will receive a confirmation email shortly.');
      setMessageType('success');
      
      // Refresh availability data to update calendar after successful booking
      try {
        console.log('Refreshing availability data after successful booking...');
        const updatedDates = await fetchAvailability();
        setUnavailableDates(updatedDates);
        console.log('Availability data refreshed successfully');
      } catch (e) {
        console.warn('Failed to refresh availability data:', e);
        // Don't show error to user for this non-critical operation
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phoneNumber: '+353',
        carReg: '',
        carMake: '',
        carModel: '',
        appointmentDate: '',
        carNeeds: '',
      });
    } catch (error) {
      console.error('Booking submission error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const errorData = error.response?.data;
        if (errorData?.reason === 'date_fully_booked') {
          setMessage(`The selected date is fully booked (${errorData.currentBookings || 'maximum'} bookings). Please choose another date.`);
          setMessageType('error');
          // Clear the selected date so user must pick a new one
          setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
          // Refresh availability data to update the calendar
          try {
            console.log('Refreshing availability after fully booked error...');
            const dates = await fetchAvailability();
            setUnavailableDates(dates);
            console.log('Availability data refreshed after error');
          } catch (err) {
            console.error('Error refreshing availability:', err);
          }
        } else if (errorData?.reason === 'duplicate_booking' || errorData?.existingBooking) {
          setMessage('A booking with these details already exists. Please check your existing bookings or use different details.');
          setMessageType('error');
        } else {
          // Generic duplicate/conflict error
          setMessage(errorData?.error || 'A booking conflict occurred. Please try different details.');
          setMessageType('error');
        }
      } else if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.reason === 'date_too_far') {
          setMessage('Bookings cannot be made more than 3 months in advance. Please choose a closer date.');
          setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
        } else if (errorData?.reason === 'date_too_soon') {
          setMessage('Appointments cannot be booked within the next two weeks. Please choose a later date.');
          setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
        } else if (errorData?.reason === 'date_in_past') {
          setMessage('Cannot book appointments for past dates. Please choose a future date.');
          setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
        } else if (errorData?.reason === 'weekend_not_allowed') {
          setMessage('Weekends are not available for appointments. Please choose a weekday.');
          setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
        } else {
          setMessage(errorData?.error || 'Invalid booking details. Please check your information and try again.');
        }
        setMessageType('error');
      } else {
        setMessage('Failed to submit booking. Please try again or contact support if the problem persists.');
        setMessageType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get earliest available date for display
  const getEarliestAvailableDate = () => {
    const startDate = new Date(twoWeeksFromToday);
    startDate.setDate(startDate.getDate() + 1); // Start from the day after two weeks

    // Calculate the maximum number of days to check (from start date to 3 months limit)
    const maxCheckDate = new Date(threeMonthsFromToday);
    const daysDiff = Math.ceil((maxCheckDate - startDate) / (1000 * 60 * 60 * 24));
    const maxDaysToCheck = Math.min(daysDiff, 365); // Safety limit of 1 year

    for (let i = 0; i < maxDaysToCheck; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);
      
      // Stop if we've exceeded the 3-month limit
      if (checkDate > threeMonthsFromToday) {
        break;
      }
      
      // Skip weekends
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
        continue;
      }
      
      const dateString = formatDate(checkDate);
      if (!unavailableDates.includes(dateString)) {
        return dateString;
      }
    }
    return null; // No available date found within the 3-month window
  };

  const earliestAvailable = getEarliestAvailableDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/carlogo.jpg" alt="The Garage Dunboyne" className="h-12 w-12 rounded-full" />
              <h1 className="text-2xl font-bold text-gray-900">Book Your Appointment</h1>
            </div>
            <Link
              to="/cancel-booking"
              className="text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Cancel Booking
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Availability Info */}
            {fetchingAvailability && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-700">Loading availability...</p>
              </div>
            )}
            
            {availabilityError && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg">
                <p className="text-red-700">{availabilityError}</p>
              </div>
            )}

            {!fetchingAvailability && earliestAvailable && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-700">
                  <span className="font-semibold">Next available date:</span> {earliestAvailable}
                </p>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                messageType === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <p className="font-medium">{message}</p>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="+353 xx xxx xxxx"
                />
              </div>

              {/* Car Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="carReg" className="block text-sm font-medium text-gray-700 mb-2">
                    Car Registration *
                  </label>
                  <input
                    type="text"
                    id="carReg"
                    name="carReg"
                    value={formData.carReg}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., 191-D-12345"
                  />
                </div>
                
                <div>
                  <label htmlFor="carMake" className="block text-sm font-medium text-gray-700 mb-2">
                    Car Make
                  </label>
                  <input
                    type="text"
                    id="carMake"
                    name="carMake"
                    value={formData.carMake}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., Toyota"
                  />
                </div>
                
                <div>
                  <label htmlFor="carModel" className="block text-sm font-medium text-gray-700 mb-2">
                    Car Model
                  </label>
                  <input
                    type="text"
                    id="carModel"
                    name="carModel"
                    value={formData.carModel}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., Corolla"
                  />
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appointment Date *
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white hover:bg-gray-50"
                  >
                    {formData.appointmentDate || 'Select a date'}
                  </button>
                  
                  {dateSelectionError && (
                    <p className="text-red-600 text-sm">{dateSelectionError}</p>
                  )}
                  
                  {showCalendar && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-lg">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          ←
                        </button>
                        <h3 className="font-semibold text-lg">
                          {monthNames[calendarState.month]} {calendarState.year}
                        </h3>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          →
                        </button>
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((date, index) => {
                          if (!date) {
                            return <div key={index} className="p-2"></div>;
                          }
                          
                          const dateString = formatDate(date);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          const isUnavailable = unavailableDates.includes(dateString);
                          const isInDisabledRange = date >= todayDate && date <= twoWeeksFromToday;
                          const isPast = date < todayDate;
                          const isTooFarFuture = date > threeMonthsFromToday;
                          const isDisabled = isWeekend || isUnavailable || isInDisabledRange || isPast || isTooFarFuture;
                          const isSelected = formData.appointmentDate === dateString;
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleDayClick(date)}
                              disabled={isDisabled}
                              className={`
                                p-2 text-sm rounded transition-colors
                                ${isSelected ? 'bg-indigo-600 text-white' : ''}
                                ${isDisabled 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'hover:bg-indigo-100 text-gray-700'
                                }
                                ${isWeekend ? 'bg-red-50' : ''}
                                ${isUnavailable ? 'bg-red-100' : ''}
                                ${isInDisabledRange ? 'bg-yellow-50' : ''}
                                ${isTooFarFuture ? 'bg-gray-100' : ''}
                              `}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 text-xs text-gray-600 space-y-1">
                        <p><span className="inline-block w-3 h-3 bg-red-50 border rounded mr-2"></span>Weekends unavailable</p>
                        <p><span className="inline-block w-3 h-3 bg-red-100 border rounded mr-2"></span>Fully booked</p>
                        <p><span className="inline-block w-3 h-3 bg-yellow-50 border rounded mr-2"></span>Too soon (2 week minimum)</p>
                        <p><span className="inline-block w-3 h-3 bg-gray-100 border rounded mr-2"></span>Too far (3 month maximum)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Car Needs */}
              <div>
                <label htmlFor="carNeeds" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Required
                </label>
                <textarea
                  id="carNeeds"
                  name="carNeeds"
                  value={formData.carNeeds}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Please describe what service your car needs (e.g., NCT, service, repair issue, etc.)"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`
                  w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-300
                  ${loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Book Appointment'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
