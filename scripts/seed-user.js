#!/usr/bin/env node

require('dotenv').config();

const mongoose = require('mongoose');

const { connectMongo } = require('../src/config/database');
const { signup } = require('../src/services/authService');

async function main() {
  const email = (process.env.SEED_USER_EMAIL || '').trim().toLowerCase();
  const password = (process.env.SEED_USER_PASSWORD || '').trim();
  const firstName = (process.env.SEED_USER_FIRST_NAME || 'Seed').trim();
  const lastName = (process.env.SEED_USER_LAST_NAME || 'User').trim();
  const phone = (process.env.SEED_USER_PHONE || '').trim() || undefined;
  const role = (process.env.SEED_USER_ROLE || 'member').trim().toLowerCase();

  if (!email || !password) {
    throw new Error('SEED_USER_EMAIL and SEED_USER_PASSWORD are required.');
  }

  await connectMongo();
  const result = await signup({ email, password, firstName, lastName, phone, role });
  console.log(`Created ${result.user.email} with role ${result.user.role}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });