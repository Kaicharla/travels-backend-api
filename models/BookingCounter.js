const mongoose = require('mongoose');

const bookingCounterSchema = new mongoose.Schema({
  date: { type: String, unique: true }, // YYYYMMDD
  seq: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('BookingCounter', bookingCounterSchema);
