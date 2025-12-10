#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(process.cwd(), 'backend', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const email = process.env.SEED_USER_EMAIL || 'admin@example.com';
const password = process.env.SEED_USER_PASSWORD || 'changeme123';
const name = process.env.SEED_USER_NAME || 'Admin User';
const role = process.env.SEED_USER_ROLE || 'admin';
const phone = process.env.SEED_USER_PHONE || '';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);

  let user = await User.findOne({ email });
  if (user) {
    console.log(`User already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  user = await User.create({ email, passwordHash, name, role, phone });
  console.log('Seeded user:', { id: user._id.toString(), email: user.email, role: user.role });
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
