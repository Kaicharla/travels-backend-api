const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const Driver = require('../models/Driver');
const { authMiddleware, adminOnly,driverOnly } = require('../middleware/auth');
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


// Get all drivers - Admin only
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const drivers = await Driver.find().select('-password').sort({ createdAt: -1 });
    const total = await Driver.countDocuments();
    res.json({ total, drivers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get current logged-in driver info
router.get('/me', authMiddleware, driverOnly, async (req, res) => {
    try {
      const driver = await Driver.findById(req.user.id).select('-password');
      if (!driver) return res.status(404).json({ message: 'Driver not found' });
      res.json(driver);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
  

// Get single driver - Admin or self
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).select('-password');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    // Allow access if admin or the driver is fetching their own data
    if (req.user.role !== 'admin' && req.user.id !== driver._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

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
  
      const allowed = ['name', 'email', 'phone', 'password', 'isActive'];
      allowed.forEach((field) => {
        if (updates[field] !== undefined) {
          // 🚀 skip empty password update
          if (field === 'password' && !updates.password) return;
          driver[field] = updates[field];
        }
      });
  
      await driver.save();
  
      const driverObj = driver.toObject();
      delete driverObj.password;
      res.json(driverObj);
    } catch (err) {
      if (err.code === 11000)
        return res.status(400).json({ message: 'Email already in use' });
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
