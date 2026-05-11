const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    location: { type: String },
    category: { type: String, default: 'General' },
    maxAttendees: { type: Number },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('Event', eventSchema);
