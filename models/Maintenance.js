const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    maintenanceType: { type: String, required: true },
    maintenanceCost: { type: Number, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    vehicleNumber: { type: String }, // denormalized
    kmAtMaintenance: { type: Number, required: true },
    nextOilChangeKm: { type: Number },
    originalOdometerKm: { type: Number, required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    driverName: { type: String },   // denormalized
    driverPhone: { type: String },  // denormalized
    company: { type: String },
    paymentMode: { type: String, enum: ['Cash', 'Card', 'Online', 'Other'], default: 'Cash' },
    description: { type: String }
  },
  { timestamps: true }
);


module.exports = mongoose.model('Maintenance', maintenanceSchema);
