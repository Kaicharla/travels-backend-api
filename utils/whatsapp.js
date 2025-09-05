// utils/whatsapp.js

// WhatsApp message template
const formatTripMessage = (trip) => {
  return `
  Trip details
  Pick-up Date: ${trip.startDate ? new Date(trip.startDate).toLocaleDateString("en-IN") : "-"}
  Pick-up Time: ${trip.startDate ? new Date(trip.startDate).toLocaleTimeString("en-IN") : "-"}
  From: ${trip.fromLocation || "-"}
  To: ${trip.endLocation || "-"}
  Cost: ${trip.tripAmount || 0}/-
  Passenger name: ${trip.customerName || "-"}
  Passenger number: +91 ${trip.customerNumber || "-"}
  Driver name: ${trip.driver?.name || "-"}
  Phone number: +91 ${trip.driver?.mobile || "-"}
  Vehicle: ${trip.vehicle?.vehicleNumber || "-"}
  Seating capacity: ${trip.vehicle?.seatingCapacity || "-"}
  Mode of Payment: ${trip.paymentMode || "-"}
  Number: +91 ${trip.driver?.mobile || "-"} - ${trip.driver?.name || "-"}
  `;
};

module.exports = { formatTripMessage };   // ✅ export properly
