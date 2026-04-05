if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { logger } = require('./utils/logger');
const { connectMongo } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { verifyTransporter } = require('./utils/mailer');

const PORT = process.env.PORT || 4000;

function shouldVerifySmtpOnStartup() {
  return process.env.SMTP_VERIFY_ON_STARTUP === 'true';
}

async function start() {
  try {
    await connectMongo();
    await connectRedis();
    if (process.env.SMTP_HOST && shouldVerifySmtpOnStartup()) {
      try {
        await verifyTransporter();
      } catch (error) {
        logger.warn('SMTP startup verification failed; continuing without blocking API startup', {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          error,
        });
      }
    }
    const app = require('./app'); // defer app creation until redis is ready

    
   

    app.listen(PORT,"0.0.0.0" ,() => logger.info(`API listening on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    console.log("error from server",err)
    process.exit(1);
  }
}

start();
