const express = require('express');
const User = require('../models/User');
const { hashPassword, comparePassword, generateToken, protect } = require('../crypto');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, public_key } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const password_hash = await hashPassword(password);
    user = await User.create({ email, password_hash, public_key });
    
    res.status(201).json({
      _id: user._id,
      email: user.email,
      public_key: user.public_key,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      _id: user._id,
      email: user.email,
      public_key: user.public_key,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/users', protect, async (req, res) => {
  try {
    // Return all users except the requester
    const users = await User.find({ _id: { $ne: req.user.id } }).select('-password_hash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
