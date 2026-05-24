const mongoose = require('mongoose');

const dependentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('Dependent', dependentSchema);
