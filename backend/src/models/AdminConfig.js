const mongoose = require('mongoose');

const AdminConfigSchema = new mongoose.Schema({
  username: { type: String, default: 'admin', unique: true },
  password_hash: { type: String, required: true }, // Hash of master key for login
  admin_public_key: { type: String, required: true },
  encrypted_admin_private_key: { type: String, required: true },
  salt: { type: String, required: true }
});

module.exports = mongoose.model('AdminConfig', AdminConfigSchema);
