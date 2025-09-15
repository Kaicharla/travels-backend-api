const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Trip = require('../models/trips');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { authMiddleware, adminOnly } = require('../middleware/auth');
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
      data.driverId = req.user.id;
    
      if (data.vehicleId) {
        data = await attachRefs({
          ...data,
          driverId: data.driverId
        });
      }
    }
    

    const trip = new Trip(data);
    await trip.save();
    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// LIST trips for driver only
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sort = req.query.sort || '-createdAt';
    let match = { isDriverDeleted: { $ne: true } }; // exclude soft-deleted trips

    // If user is driver, show only their trips
    if (req.user.role === 'driver') {
      match.driverId = new mongoose.Types.ObjectId(req.user.id);
    }

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
    const match = { isDriverDeleted: { $ne: true } };

    if (req.user.role === 'driver') {
      match.driverId = new mongoose.Types.ObjectId(req.user.id);
    }

    // Fetch trips
    const trips = await Trip.find(match);

    // Fetch maintenance linked to driver (if role=driver)
    let maintenanceMatch = {};
    if (req.user.role === 'driver') {
      maintenanceMatch.driver = new mongoose.Types.ObjectId(req.user.id);
    }
    const maintenances = await mongoose.model("Maintenance").find(maintenanceMatch);

    // Fetch ads (right now, assuming ads are company-wide, not per driver)
    const ads = await mongoose.model("Ad").find({});

    // Aggregate totals
    let totalTrips = trips.length;
    let totalTripAmount = 0;
    let totalExpenses = 0;
    let totalProfit = 0;

    trips.forEach(trip => {
      const tripAmt = Number(trip.tripAmount || 0);

      // Fuel
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

    // Add maintenance expenses
    const totalMaintenance = maintenances.reduce((sum, m) => sum + Number(m.maintenanceCost || 0), 0);
    totalExpenses += totalMaintenance;

    // Add ad expenses
    const totalAds = ads.reduce((sum, ad) => sum + Number(ad.amount || 0), 0);
    totalExpenses += totalAds;

    // Recalculate profit
    totalProfit = totalTripAmount - totalExpenses;

    res.json({
      totalTrips,
      totalTripAmount,
      totalExpenses,
      totalMaintenance,
      totalAds,
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

router.get('/:id/whatsapp', authMiddleware, adminOnly, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const { sendTo } = req.query; // "customer" or "driver"

    let phone = '';
    if (sendTo === 'customer') {
      if (!trip.customerNumber) return res.status(400).json({ message: 'Customer number not available' });
      phone = trip.customerNumber.replace(/\D/g, ''); // clean digits
    } else if (sendTo === 'driver') {
      if (!trip.driverNumber) return res.status(400).json({ message: 'Driver number not available' });
      phone = trip.driverNumber.replace(/\D/g, '');
    } else {
      return res.status(400).json({ message: 'sendTo must be "customer" or "driver"' });
    }

    const message = `
Trip details
Pick-up Date: ${trip.startDate || '-'}
From: ${trip.fromLocation || '-'}
To: ${trip.endLocation || '-'}
Cost: ₹${trip.tripAmount || '-'}
Passenger name: ${trip.customerName || '-'}
Passenger number: ${trip.customerNumber || '-'}
Driver name: ${trip.driverName || '-'}
Phone number: ${trip.driverNumber || '-'}
Vehicle: ${trip.vehicleType || '-'}
Seating capacity: -
Mode of Payment: ${trip.paymentMode || '-'}
Booking Number: ${trip.bookingId || '-'}
    `;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    // ✅ Instead of redirecting, send JSON
    res.json({ whatsappUrl: waUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;
