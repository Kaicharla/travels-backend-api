const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');


const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_a_strong_secret';


async function authMiddleware(req, res, next) {
    const authHeader = req.header('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'No token provided' });


    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // payload contains { id, role }
        req.user = payload;
        // optionally fetch full user if needed
        if (payload.role === 'admin') req.userModel = await Admin.findById(payload.id).select('-password');
        else if (payload.role === 'driver') req.userModel = await Driver.findById(payload.id).select('-password');
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token', error: err.message });
    }
}


function adminOnly(req, res, next) {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    next();
}


function driverOnly(req, res, next) {
    if (!req.user || req.user.role !== 'driver') return res.status(403).json({ message: 'Drivers only' });
    next();
}


module.exports = {
    authMiddleware,
    adminOnly,
    driverOnly
};