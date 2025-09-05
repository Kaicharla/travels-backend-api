const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        vehicleType: { type: String, required: true },   // e.g. Car, Bus, Van, Truck
        seatingCapacity: { type: Number, required: true },
        vehicleNumber: { type: String, required: true, unique: true, uppercase: true } // e.g. MH12AB1234
    },
    { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
