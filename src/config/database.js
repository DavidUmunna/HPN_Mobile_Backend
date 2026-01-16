const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  console.log('MONGODB_URI:', process.env.MONGO_URI);


  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
  });

  logger.info('Connected to MongoDB');
}

module.exports = { connectMongo };
