# Backend API

Node.js + Express backend for the HPN mobile app with session auth, offline sync, events, prayers, notifications, attendance, and admin summaries.

## Stack
- Node.js, Express
- MongoDB via Mongoose
- Redis (or in-memory fallback for tests/dev) for session storage
- Joi validation, Helmet, CORS, rate limiting, Winston logging

## Structure
```
backend/
  src/
    app.js                  # Express app wiring
    server.js               # Startup (env, DBs, Redis, listen)
    config/                 # env, Mongo, Redis, session
    controllers/            # Request handlers (thin)
    services/               # Business logic
    repositories/           # Data access
    models/                 # Mongoose schemas
    routes/                 # Express routers
    middlewares/            # Auth, validation, errors, rate limits
    utils/                  # Logger, errors, pagination
    validations/            # Joi schemas
  scripts/
    seed-user.js            # Seed an initial user
  .env.example
  package.json
```

## Setup
```bash
cp backend/.env.example backend/.env
cd backend
npm install
npm run dev
```

Ensure MongoDB (MONGODB_URI) and Redis (REDIS_URL) are reachable. If REDIS_URL is not set, sessions fall back to in-memory (not for production).

Seed an admin user:
```bash
SEED_USER_EMAIL=admin@example.com SEED_USER_PASSWORD=changeme123 SEED_USER_ROLE=admin npm run seed:user
```

## Key endpoints (all under `/api`)
- Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Sync: `POST /sync`
- Events: `GET/POST /events`, `GET /events/:id`, `POST /events/:id/rsvp`
- Prayers: `GET /prayers`, `POST /prayers`, `POST /prayers/:id/pray`
- Notifications: `GET /notifications`, `POST /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id`, `DELETE /notifications`
- Attendance: `POST /attendance/check-in`, `GET /attendance/latest`
- Admin (requires admin role): `GET /admin/users`, `GET /admin/attendance/summary`, `GET /admin/events/summary`
