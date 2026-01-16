#!/usr/bin/env node
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

loadEnv();

const email = process.env.SEED_USER_EMAIL || 'admin@example.com';
const password = process.env.SEED_USER_PASSWORD || 'changeme123';
const name = process.env.SEED_USER_NAME || 'Admin User';
const role = process.env.SEED_USER_ROLE || 'admin';
const phone = process.env.SEED_USER_PHONE || '';
const overwrite = process.env.SEED_USER_OVERWRITE === 'true';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hpn_mobile';
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await connectMongo();

  let user = await User.findOne({ email });
  if (user) {
    if (!overwrite) {
      console.log(`User already exists: ${email} (id: ${user._id.toString()})`);
      return;
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.name = name;
    user.role = role;
    user.phone = phone;
    await user.save();
    console.log('Updated existing user:', { id: user._id.toString(), email: user.email, role: user.role });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  user = await User.create({ email, passwordHash, name, role, phone });
  console.log('Seeded user:', { id: user._id.toString(), email: user.email, role: user.role });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
