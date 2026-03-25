const express = require('express');
const AdminConfig = require('../models/AdminConfig');
const Message = require('../models/Message');
const User = require('../models/User');
const { comparePassword, generateToken, protect } = require('../crypto');

const router = express.Router();

// Public endpoint to get admin's public key for encryption
router.get('/config', async (req, res) => {
  try {
    const config = await AdminConfig.findOne({ username: 'admin' });
    if (!config) return res.status(404).json({ message: 'Admin config not found' });
    res.json({ admin_public_key: config.admin_public_key });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { master_key } = req.body;
    const config = await AdminConfig.findOne({ username: 'admin' });
    if (!config) return res.status(404).json({ message: 'Admin config not found' });

    const isMatch = await comparePassword(master_key, config.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid master key' });

    // In a real app we might want a different JWT secret for admin, but for this constraint we'll use the same and mark context
    // Actually, AdminConfig is just another document. Let's return its _id in JWT.
    const token = generateToken(config._id);

    res.json({
      token,
      encrypted_admin_private_key: config.encrypted_admin_private_key,
      salt: config.salt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin endpoint to fetch all messages
router.get('/messages', protect, async (req, res) => {
  try {
    // Only an admin should be able to call this (we just verify if user.id matches admin config)
    const config = await AdminConfig.findOne({ username: 'admin' });
    if (req.user.id !== config._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const messages = await Message.find().sort({ created_at: -1 }).populate('sender_id receiver_id', 'email public_key');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
