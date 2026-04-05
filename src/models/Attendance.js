const mongoose = require('mongoose');

function buildAttendanceDateKey(timestamp) {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(timestamp.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function buildDayLabel(timestamp) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[timestamp.getDay()];
}

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, required: true },
    day: { type: String, required: true },
    attendanceDateKey: { type: String, required: true },
    dependents: [
      {
        dependentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dependent' },
        name: { type: String, trim: true, required: true },
        age: { type: Number, required: true, min: 0 },
      },
    ],
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { userId: 1, attendanceDateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      attendanceDateKey: { $exists: true, $type: 'string' },
    },
  }
);

attendanceSchema.pre('validate', function setAttendanceDayFields() {
  if (this.timestamp instanceof Date && !Number.isNaN(this.timestamp.getTime())) {
    this.attendanceDateKey = buildAttendanceDateKey(this.timestamp);
    this.day = buildDayLabel(this.timestamp);
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
