const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { driverCreateValidators } = require('../utils/validators');

// Create driver - Admin only
router.post('/', authMiddleware, adminOnly, driverCreateValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password, phone } = req.body;
        if (await Driver.findOne({ email })) return res.status(400).json({ message: 'Driver email already exists' });

        const driver = new Driver({ name, email, password, phone });
        await driver.save();
        const driverObj = driver.toObject();
        delete driverObj.password;
        res.status(201).json(driverObj);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get all drivers - Admin only (with simple pagination)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const drivers = await Driver.find()
            .select('-password')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });
        const total = await Driver.countDocuments();
        res.json({ total, page, limit, drivers });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get single driver - Admin only
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id).select('-password');
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        res.json(driver);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update driver - Admin only
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const updates = { ...req.body };
        const driver = await Driver.findById(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        // apply allowed updates
        const allowed = ['name', 'email', 'phone', 'password', 'isActive'];
        allowed.forEach((field) => {
            if (updates[field] !== undefined) driver[field] = updates[field];
        });

        await driver.save();
        const driverObj = driver.toObject();
        delete driverObj.password;
        res.json(driverObj);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Email already in use' });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Delete driver - Admin only
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const driver = await Driver.findByIdAndDelete(req.params.id);
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        res.json({ message: 'Driver deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
