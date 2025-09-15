const mongoose = require('mongoose');
const BookingCounter = require('./BookingCounter');

async function nextBookingId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD

  const doc = await BookingCounter.findOneAndUpdate(
    { date: datePart },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `${datePart}${String(doc.seq).padStart(3,'0')}`; // YYYYMMDD001
}

const tripSchema = new mongoose.Schema({
  // Booking
  bookingId: { type: String, unique: true, index: true },
  bookingDate: { type: String },

  // Associations (store both id and snapshot info)
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', index: true },
  driverName: String,
  driverNumber: String,

  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
  vehicleType: String,
  vehicleNumber: { type: String, uppercase: true, index: true },

  // Customer
  customerName: String,
  customerNumber: String,

  // Trip timing/route
  startDate: { type: Date },
  fromLocation: String,
  endDate: { type: Date },
  endLocation: String,

    // New odometer readings
    startingReading: { type: Number, default: 0 },
    endingReading: { type: Number, default: 0 },

  // Money
  tripAmount: { type: Number, default: 0 },
  advanceAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ['Cash','UPI','Credit Card'], default: 'Cash' },
  tripAmountReceivedBy: String,

  // Fuel & Charges
  fuelType: { type: String, enum: ['Petrol','Diesel','CNG','Petrol & CNG'] },
  fuelAmount: { type: String, default: 0 },
  tolls: { type: Number, default: 0 },
  parkingCharges: { type: Number, default: 0 },
  driverBeta: { type: Number, default: 0 },

  description: String,

  // Audit
  createdByRole: { type: String, enum: ['admin','driver'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

  // Soft delete (driver)
  isDriverDeleted: { type: Boolean, default: false, index: true },
  driverDeletedAt: Date,
  driverDeletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
}, { timestamps: true });

tripSchema.index({ bookingDate: 1 });
tripSchema.index({ createdAt: 1 });

tripSchema.pre('validate', async function(next) {
  // bookingId
  if (!this.bookingId) {
    this.bookingId = await nextBookingId();
  }
  // balance
  if (this.isModified('tripAmount') || this.isModified('advanceAmount') || this.balanceAmount === undefined) {
    const trip = Number(this.tripAmount || 0);
    const adv = Number(this.advanceAmount || 0);
    this.balanceAmount = Math.max(0, trip - adv);
  }
  next();
});

tripSchema.virtual('totalExpenses').get(function() {
  let fuel = 0;

  if (this.fuelAmount) {
    // If fuelAmount is a number string, just parse it
    if (!isNaN(Number(this.fuelAmount))) {
      fuel = Number(this.fuelAmount);
    } else {
      // If fuelAmount is like "Petrol: 120, CNG: 120"
      const matches = this.fuelAmount.match(/\d+/g); // get all numbers
      if (matches) {
        fuel = matches.map(Number).reduce((a, b) => a + b, 0);
      }
    }
  }

  const tolls = Number(this.tolls || 0);
  const parking = Number(this.parkingCharges || 0);
  const beta = Number(this.driverBeta || 0);
  return fuel + tolls + parking + beta;
});

tripSchema.virtual('profit').get(function() {
  const tripAmt = Number(this.tripAmount || 0);
  return tripAmt - this.totalExpenses;
});


// Ensure virtuals are included in JSON responses
tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });


module.exports = mongoose.model('Trip', tripSchema);
