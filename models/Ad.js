const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    paymentMode: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', adSchema);
