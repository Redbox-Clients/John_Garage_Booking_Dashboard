// src/components/BookingModal.jsx
import React from 'react';

function formatDateGB(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB');
}

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BookingModal = ({ booking, onClose, onStatusChange, isUpdatingStatus, updateStatusError, handleStatusChangeRequest }) => {
  // If no booking object is provided, render nothing
  if (!booking) return null;

  const handleDownloadPdf = () => {
    const carDetails = `${booking.make || ''} ${booking.model || ''} (${booking.reg || ''})`.trim();

    // Print-friendly HTML. Users choose "Save as PDF" in the print dialog.
    // Important: don't auto-print inside the HTML itself, or we can trigger the dialog twice.
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Booking ${escapeHtml(booking.id)}</title>
    <style>
      :root { --text:#111827; --muted:#6b7280; --border:#e5e7eb; }
      * { box-sizing:border-box; }
      body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:var(--text); margin:0; padding:24px; }
      .wrap { max-width:760px; margin:0 auto; }
      header { display:flex; align-items:baseline; justify-content:space-between; gap:16px; padding-bottom:12px; border-bottom:1px solid var(--border); margin-bottom:16px; }
      h1 { font-size:20px; margin:0; }
      .meta { color:var(--muted); font-size:12px; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 24px; }
      .row { padding:10px 12px; border:1px solid var(--border); border-radius:10px; }
      .label { color:var(--muted); font-size:12px; margin-bottom:4px; }
      .value { font-size:14px; white-space:pre-wrap; word-break:break-word; }
      .full { grid-column:1 / -1; }
      @page { margin: 12mm; }
      @media print { body { padding:0; } .row { break-inside:avoid; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <div>
          <h1>Booking Details</h1>
          <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString('en-GB'))}</div>
        </div>
        <div class="meta">Booking ID: ${escapeHtml(booking.id)}</div>
      </header>

      <section class="grid">
        <div class="row">
          <div class="label">Appointment Date</div>
          <div class="value">${escapeHtml(formatDateGB(booking.date))}</div>
        </div>
        <div class="row">
          <div class="label">Status</div>
          <div class="value">${escapeHtml(booking.status)}</div>
        </div>

        <div class="row">
          <div class="label">Customer Name</div>
          <div class="value">${escapeHtml(booking.name)}</div>
        </div>
        <div class="row">
          <div class="label">Phone</div>
          <div class="value">${escapeHtml(booking.phone)}</div>
        </div>

        <div class="row full">
          <div class="label">Email</div>
          <div class="value">${escapeHtml(booking.email)}</div>
        </div>

        <div class="row full">
          <div class="label">Car Details</div>
          <div class="value">${escapeHtml(carDetails)}</div>
        </div>

        <div class="row full">
          <div class="label">Service Required</div>
          <div class="value">${escapeHtml(booking.details)}</div>
        </div>
      </section>
    </div>
  </body>
</html>`;

    // Prefer hidden iframe so we can print without popups.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    // Ensure same-origin about:blank iframe document exists before writing.
    iframe.src = 'about:blank';

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    };

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      alert('Unable to open print preview. Please try a different browser.');
      cleanup();
      return;
    }

    // Write the HTML
    doc.open();
    doc.write(html);
    doc.close();

    // Wait until the iframe doc is ready + fonts/layout applied, otherwise some browsers print blank.
    const w = iframe.contentWindow;
    if (!w) {
      cleanup();
      return;
    }

    const doPrint = () => {
      try {
        w.onafterprint = cleanup;
        w.focus();
        w.print();
        setTimeout(cleanup, 3000);
      } catch {
        cleanup();
      }
    };

    const readyState = w.document?.readyState;
    if (readyState === 'complete') {
      // Give it a tick to paint.
      setTimeout(doPrint, 250);
    } else {
      // Print once the iframe window fires load.
      iframe.onload = () => setTimeout(doPrint, 250);
    }
  };

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
          <p><span className="font-semibold">Booking Date:</span> {formatDateGB(booking.date)}</p>
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
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Download PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;