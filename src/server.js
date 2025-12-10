const { loadEnv } = require('./config/env');

loadEnv();

const { logger } = require('./utils/logger');
const { connectMongo } = require('./config/database');
const { connectRedis } = require('./config/redis');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectMongo();
    await connectRedis();
    const app = require('./app'); // defer app creation until redis is ready
    app.listen(PORT, () => logger.info(`API listening on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

start();
