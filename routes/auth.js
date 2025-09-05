const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');
const { loginValidators } = require('../utils/validators');


const JWT_SECRET = process.env.JWT_SECRET || 'replace_with_a_strong_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';


// Admin register (one-time / for setup) - OPTIONAL
router.post('/admin/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
        const exists = await Admin.findOne({ email });
        if (exists) return res.status(400).json({ message: 'Admin already exists' });
        const admin = new Admin({ name, email, password });
        await admin.save();
        res.status(201).json({ message: 'Admin created' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Login (shared for both admin and driver)
router.post('/login', loginValidators, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });


    const { email, password } = req.body;


    try {
        // Try admin first
        let user = await Admin.findOne({ email });
        let role = 'admin';
        if (!user) {
            user = await Driver.findOne({ email });
            role = 'driver';
        }
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });


        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });


        const payload = { id: user._id.toString(), role: role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });


        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


module.exports = router;