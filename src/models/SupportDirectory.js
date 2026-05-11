const mongoose = require('mongoose');

const supportDepartmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const supportDirectorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    churchName: { type: String, trim: true, default: 'His Presence Newcastle' },
    mainPhone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    departments: { type: [supportDepartmentSchema], default: [] },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('SupportDirectory', supportDirectorySchema);