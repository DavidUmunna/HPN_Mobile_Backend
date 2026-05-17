#!/usr/bin/env node
'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const { connectMongo } = require('../src/config/database');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');

const CHURCH_LATITUDE = 54.97104234664124;
const CHURCH_LONGITUDE = -1.6129550644455481;
const RECORD_COUNT = 15;

/** Return the most recent Sunday on or before `date`. */
function lastSunday(date) {
  const d = new Date(date);
  d.setUTCHours(10, 30, 0, 0); // 10:30 AM service time
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // rewind to Sunday
  return d;
}

/** Tiny jitter so coordinates aren't identical on every record. */
function jitter(value, range = 0.0003) {
  return value + (Math.random() * 2 - 1) * range;
}

async function main() {
  const email = (process.env.SEED_USER_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('SEED_USER_EMAIL is required in .env');

  await connectMongo();

  const user = await User.findOne({ email }).lean();
  if (!user) throw new Error(`Seed user not found: ${email}`);

  console.log(`Seeding attendance for ${user.email} (${user._id})`);

  // Build 15 weekly Sundays going back from today
  const today = new Date();
  const records = [];

  for (let i = 0; i < RECORD_COUNT; i++) {
    const base = new Date(today);
    base.setUTCDate(base.getUTCDate() - i * 7);
    const sunday = lastSunday(base);

    records.push({
      userId: user._id,
      timestamp: sunday,
      day: 'Sunday',
      attendanceDateKey: sunday.toISOString().slice(0, 10),
      location: {
        latitude: jitter(CHURCH_LATITUDE),
        longitude: jitter(CHURCH_LONGITUDE),
      },
      dependents: [],
    });
  }

  let created = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      await Attendance.create(record);
      console.log(`  ✓ ${record.attendanceDateKey}`);
      created++;
    } catch (err) {
      if (err?.code === 11000) {
        console.log(`  – ${record.attendanceDateKey} already exists, skipping`);
        skipped++;
      } else {
        throw err;
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
