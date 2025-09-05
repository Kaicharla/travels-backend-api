const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { authMiddleware, adminOnly, driverOnly } = require('../middleware/auth');

// Create vehicle - Admin only
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { vehicleType, seatingCapacity, vehicleNumber } = req.body;

        if (!vehicleType || !seatingCapacity || !vehicleNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // check duplicate vehicle number
        const exists = await Vehicle.findOne({ vehicleNumber });
        if (exists) return res.status(400).json({ message: "Vehicle number already exists" });

        const vehicle = new Vehicle({ vehicleType, seatingCapacity, vehicleNumber });
        await vehicle.save();

        res.status(201).json(vehicle);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Get all vehicles - Admin & Driver
router.get('/', authMiddleware, async (req, res) => {
    try {
        const vehicles = await Vehicle.find().sort({ createdAt: -1 });
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Get single vehicle - Admin & Driver
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.json(vehicle);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Update vehicle - Admin only
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { vehicleType, seatingCapacity, vehicleNumber } = req.body;

        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

        if (vehicleType !== undefined) vehicle.vehicleType = vehicleType;
        if (seatingCapacity !== undefined) vehicle.seatingCapacity = seatingCapacity;
        if (vehicleNumber !== undefined) vehicle.vehicleNumber = vehicleNumber;

        await vehicle.save();
        res.json(vehicle);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Vehicle number already exists" });
        }
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Delete vehicle - Admin only
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
        if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
        res.json({ message: "Vehicle deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
