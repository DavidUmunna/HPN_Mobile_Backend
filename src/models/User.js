const mongoose = require('mongoose');

function normalizeExtendedJsonDate(value) {
  if (!value || value instanceof Date) return value;

  if (typeof value === 'object' && '$date' in value) {
    const normalized = new Date(value.$date);
    return Number.isNaN(normalized.getTime()) ? value : normalized;
  }

  return value;
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    
    role: { type: String, enum: ['member', 'staff', 'admin'], default: 'member' },
    isOnboarded: { type: Boolean, default: false },
    mustChangePassword: { type: Boolean, default: false },
    dependents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dependent' }],
    stripeCustomerId: { type: String, trim: true },
    resetPasswordTokenHash: { type: String, trim: true },
    resetPasswordExpiresAt: { type: Date },
  },
  { timestamps: true, strict: true }
);

userSchema.pre('validate', function normalizeLegacyTimestamps() {
  this.createdAt = normalizeExtendedJsonDate(this.createdAt);
  this.updatedAt = normalizeExtendedJsonDate(this.updatedAt);
});

//userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
