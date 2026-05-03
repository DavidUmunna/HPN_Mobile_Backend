// Polyfill globalThis.crypto for MongoDB driver v6 (Mongoose 9) on Node < 19
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto').webcrypto;
}

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { logger } = require('./utils/logger');
const { connectMongo } = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectMongo();
    await connectRedis();
    const app = require('./app'); // defer app creation until redis is ready

    
   

    app.listen(PORT,"0.0.0.0" ,() => logger.info(`API listening on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    console.log("error from server",err)
    process.exit(1);
  }
}

start();
