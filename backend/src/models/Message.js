const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encrypted_message: { type: String, required: true },
  auth_tag: { type: String, required: true }, // GCM auth tag
  iv: { type: String, required: true },
  encrypted_session_key_user: { type: String, required: true },
  encrypted_session_key_admin: { type: String, required: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now }
});

// Create a TTL index to automatically delete documents when expires_at is reached
MessageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Message', MessageSchema);
