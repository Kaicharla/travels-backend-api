const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const { authMiddleware, adminOnly, driverOnly } = require('../middleware/auth');

// 👉 Create Maintenance (Admin + Driver)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      date,
      maintenanceType,
      maintenanceCost,
      vehicleId,
      kmAtMaintenance,
      nextOilChangeKm,
      originalOdometerKm,
      driverId,
      company,
      paymentMode,
      description
    } = req.body;

    let driver;
    if (req.user.role === 'driver') {
      // driver auto-fills
      driver = await Driver.findById(req.user.id);
      if (!driver) return res.status(404).json({ message: 'Driver not found' });
    } else if (req.user.role === 'admin') {
      // admin chooses driver
      driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ message: 'Driver not found' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const maintenance = new Maintenance({
        date,
        maintenanceType,
        maintenanceCost,
        vehicle: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber, // save vehicle number
        kmAtMaintenance,
        nextOilChangeKm,
        originalOdometerKm,
        driver: driver._id,
        driverName: driver.name,             // save driver name
        driverPhone: driver.phone,           // save driver phone
        company,
        paymentMode,
        description
      });      
    await maintenance.save();

    res.status(201).json(await maintenance.populate('driver vehicle'));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 👉 Get all maintenances (Admin = all, Driver = only their own)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'driver') {
      query.driver = req.user.id;
    }

    const maintenances = await Maintenance.find(query)
      .populate('driver', 'name phone')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .sort({ createdAt: -1 });

    res.json(maintenances);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 👉 Get single maintenance
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('driver', 'name phone')
      .populate('vehicle', 'vehicleNumber vehicleType');

    if (!maintenance) return res.status(404).json({ message: 'Maintenance not found' });

    // Driver can only access their own
    if (req.user.role === 'driver' && maintenance.driver._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(maintenance);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 👉 Update maintenance (Admin = any, Driver = only their own)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: 'Maintenance not found' });

    if (req.user.role === 'driver' && maintenance.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    Object.assign(maintenance, req.body);

    await maintenance.save();

    res.json(await maintenance.populate('driver vehicle'));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// 👉 Delete maintenance (Admin = any, Driver = only their own)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: 'Maintenance not found' });

    if (req.user.role === 'driver' && maintenance.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await maintenance.deleteOne();

    res.json({ message: 'Maintenance deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
