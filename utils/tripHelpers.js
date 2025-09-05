// utils/tripHelpers.js
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

/** Build MongoDB match filter from query + role */
function buildMatch(req) {
  const q = req.query || {};
  const match = {};

  // Role-based scope
  if (req.user.role === 'driver') {
    match.driverId = new mongoose.Types.ObjectId(req.user.id);
    if (q.onlyDeleted === 'true') {
      match.isDriverDeleted = true;
    } else if (q.includeDeleted === 'true') {
      // no filter
    } else {
      match.isDriverDeleted = { $ne: true };
    }
  } else {
    if (q.onlyDeleted === 'true') match.isDriverDeleted = true;
    else if (q.includeDeleted !== 'true') match.isDriverDeleted = { $ne: true };
  }

  // Date range
  if (q.from || q.to) {
    const field = q.dateField === 'createdAt' ? 'createdAt' : 'bookingDate';
    match[field] = {};
    if (q.from) match[field].$gte = new Date(q.from);
    if (q.to)   match[field].$lte = new Date(q.to);
  }

  if (q.driverId) match.driverId = new mongoose.Types.ObjectId(q.driverId);
  if (q.vehicleId) match.vehicleId = new mongoose.Types.ObjectId(q.vehicleId);
  if (q.vehicleNumber) match.vehicleNumber = q.vehicleNumber.toUpperCase();
  if (q.bookingId) match.bookingId = q.bookingId;
  if (q.search) {
    match.$or = [
      { bookingId: new RegExp(q.search, 'i') },
      { customerName: new RegExp(q.search, 'i') },
      { customerNumber: new RegExp(q.search, 'i') },
      { driverName: new RegExp(q.search, 'i') },
      { vehicleNumber: new RegExp(q.search, 'i') },
    ];
  }

  return match;
}

/** Attach driver & vehicle snapshot fields */
async function attachRefs(data) {
  const out = { ...data };

  if (out.driverId) {
    const drv = await Driver.findById(out.driverId);
    if (!drv) throw new Error('Invalid driverId');
    out.driverName = drv.name;
    out.driverNumber = drv.phone;
  }

  if (out.vehicleId) {
    const veh = await Vehicle.findById(out.vehicleId);
    if (!veh) throw new Error('Invalid vehicleId');
    out.vehicleType = veh.vehicleType;
    out.vehicleNumber = veh.vehicleNumber;
  }

  return out;
}

module.exports = {
  buildMatch,
  attachRefs,
};
