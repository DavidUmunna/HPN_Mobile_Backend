const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');

const routes = require('./routes');
const { sessionConfig, sessionStore } = require('./config/session');
const { rateLimiter } = require('./middlewares/rateLimiter');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
const origins=[process.env.CLIENT_ORIGIN, 
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://app.hispresencenewcastle.org.uk',
  'https://hpnnginxgateway-production.up.railway.app',
  "https://hpn-admin-production.up.railway.app",
  'http://192.168.113.206:4000'].filter(Boolean);
app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);
app.use('/api/giving/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

  app.use(session(sessionConfig(sessionStore)));
app.use(rateLimiter);

app.use('/api', routes);
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>HPN Backend</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .card {
            background: #1e293b;
            padding: 30px 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ HPN Mobile Backend</h1>
          <p>Backend is running successfully.</p>
          <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
        </div>
      </body>
    </html>
  `);
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
