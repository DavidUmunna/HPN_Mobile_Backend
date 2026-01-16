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
- Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- Giving: `GET /giving`, `POST /giving`
- Sync: `POST /sync`
- Events: `GET/POST /events`, `GET /events/:id`, `POST /events/:id/rsvp`
- Prayers: `GET /prayers`, `POST /prayers`, `POST /prayers/:id/pray`
- Notifications: `GET /notifications`, `POST /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `DELETE /notifications/:id`, `DELETE /notifications`
- Attendance: `POST /attendance/check-in`, `GET /attendance/latest`
- Admin (requires admin role): `GET /admin/users`, `PATCH /admin/users/:id/email`, `GET /admin/attendance/summary`, `GET /admin/events/summary`

## Auth flows
- Session cookies (web): login/signup set `session.userId`; cookie keeps you logged in.
- JWT (native/mobile): login/signup responses include `{ user, token }`. Send `Authorization: Bearer <token>` on future requests. Middleware accepts either session or bearer.
- Config: `JWT_SECRET` (default `dev-secret-change-me`), `JWT_EXPIRES_IN` (default `7d`).

## Giving flow (Stripe, Apple Pay / Google Pay via Payment Sheet)
- `GET /giving`: returns `{ transactions, totalGiven, thisMonth }` for the signed-in user.
- `POST /giving`: body `{ amount, category, type, currency? }` -> creates a Stripe PaymentIntent with automatic payment methods enabled so Apple Pay / Google Pay work via Payment Sheet. Response includes the donation record plus `paymentIntentClientSecret` and `paymentProvider`.
- Env: `STRIPE_SECRET_KEY` required for real payments (if absent, donations are marked succeeded without charging for local/dev). Set `APP_URL`/`CLIENT_ORIGIN` as usual for CORS/cookies.
