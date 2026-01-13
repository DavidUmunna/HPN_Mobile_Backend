const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['member', 'staff', 'admin'], default: 'member' },
    stripeCustomerId: { type: String, trim: true },
  },
  { timestamps: true }
);

//userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
