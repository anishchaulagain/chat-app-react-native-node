const express = require('express');
const Message = require('../models/Message');
const { protect } = require('../crypto');

const router = express.Router();

router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender_id: req.user.id, receiver_id: req.params.userId },
        { sender_id: req.params.userId, receiver_id: req.user.id }
      ]
    }).sort({ created_at: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
