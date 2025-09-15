const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// CREATE Ad
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date, paymentMode, amount } = req.body;
    if (!date || !paymentMode || !amount) return res.status(400).json({ message: 'All fields are required' });

    const ad = new Ad({ date, paymentMode, amount });
    await ad.save();
    res.status(201).json({ message: 'Ad created', ad });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// READ all Ads
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const ads = await Ad.find().sort({ date: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// READ single Ad
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// UPDATE Ad
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date, paymentMode, amount } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      req.params.id,
      { date, paymentMode, amount },
      { new: true }
    );
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    res.json({ message: 'Ad updated', ad });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE Ad
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
