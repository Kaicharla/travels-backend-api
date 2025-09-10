const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Trip = require('../models/trips');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { authMiddleware } = require('../middleware/auth');
const { buildMatch, attachRefs } = require('../utils/tripHelpers');


// CREATE trip (admin or driver)
router.post('/', authMiddleware, async (req, res) => {
  try {
    let data = { ...req.body };

    // Always set createdBy
    data.createdByRole = req.user.role;
    data.createdBy = req.user.id;

    if (req.user.role === 'admin') {
      // ✅ Admin can attachRefs to get driver + vehicle snapshot
      if (data.driverId || data.vehicleId) {
        data = await attachRefs(data);
      }
    }

    if (req.user.role === 'driver') {
      // ✅ Force driverId to logged-in user
      data.driverId = req.user.id;

      // 🚫 Do NOT attach driver snapshot (so driverName, driverNumber not overwritten)
      // ✅ But still allow vehicle snapshot if driver selected a vehicle
      if (data.vehicleId) {
        data = await attachRefs({
          ...data,
          driverId: data.driverId // keep driverId intact
        });

        // Ensure driverName / driverNumber are not added for drivers
        delete data.driverName;
        delete data.driverNumber;
      }
    }

    const trip = new Trip(data);
    await trip.save();
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// LIST trips
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sort  = req.query.sort || '-createdAt';
    const match = buildMatch(req);

    // 🚀 Always fetch all trips (no pagination needed)
    const rows = await Trip.find(match).sort(sort);
    const total = rows.length;

    res.json({ total, page: 1, limit: total, rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// GET /trips/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Match trips depending on user role
    const match = { isDriverDeleted: { $ne: true } }; // exclude soft deleted

    if (req.user.role === 'driver') {
      match.driverId = new mongoose.Types.ObjectId(req.user.id);
    }

    const trips = await Trip.find(match);

    // Aggregate totals manually
    let totalTrips = trips.length;
    let totalTripAmount = 0;
    let totalExpenses = 0;
    let totalProfit = 0;

    trips.forEach(trip => {
      const tripAmt = Number(trip.tripAmount || 0);

      // calculate fuel
      let fuel = 0;
      if (trip.fuelAmount) {
        if (!isNaN(Number(trip.fuelAmount))) {
          fuel = Number(trip.fuelAmount);
        } else {
          const matches = trip.fuelAmount.match(/\d+/g);
          if (matches) fuel = matches.map(Number).reduce((a,b)=>a+b,0);
        }
      }

      const expenses = fuel + Number(trip.tolls || 0) + Number(trip.parkingCharges || 0) + Number(trip.driverBeta || 0);
      const profit = tripAmt - expenses;

      totalTripAmount += tripAmt;
      totalExpenses += expenses;
      totalProfit += profit;
    });

    res.json({
      totalTrips,
      totalTripAmount,
      totalExpenses,
      totalProfit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// GET single
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (req.user.role === 'driver' && String(trip.driverId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (req.user.role === 'driver' && trip.isDriverDeleted && req.query.includeDeleted !== 'true') {
      return res.status(404).json({ message: 'Trip not found' });
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (req.user.role === 'driver' && String(trip.driverId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let updates = { ...req.body };
    if (updates.driverId || updates.vehicleId) {
      updates = await attachRefs(updates);
    }

    if (req.user.role === 'driver') {
      delete updates.isDriverDeleted;
      delete updates.driverDeletedAt;
      delete updates.driverDeletedBy;
      delete updates.createdBy;
      delete updates.createdByRole;
    }

    Object.assign(trip, updates);
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    if (req.user.role === 'driver') {
      if (String(trip.driverId) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });

      if (!trip.isDriverDeleted) {
        trip.isDriverDeleted = true;
        trip.driverDeletedAt = new Date();
        trip.driverDeletedBy = req.user.id;
        await trip.save();
      }
      return res.json({ message: 'Trip marked deleted by driver', trip });
    }

    const hard = req.query.hard === 'true';
    if (hard) {
      await Trip.findByIdAndDelete(trip._id);
      return res.json({ message: 'Trip permanently deleted by admin' });
    } else {
      if (!trip.isDriverDeleted) {
        trip.isDriverDeleted = true;
        trip.driverDeletedAt = new Date();
      }
      await trip.save();
      return res.json({ message: 'Trip soft-deleted by admin', trip });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// RESTORE
router.post('/:id/restore', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    trip.isDriverDeleted = false;
    trip.driverDeletedAt = null;
    trip.driverDeletedBy = null;
    await trip.save();
    res.json({ message: 'Trip restored', trip });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;
