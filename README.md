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

Bulk-register users from JSON or CSV:
```bash
npm run bulk:users -- --file ./imports/users.json
npm run bulk:users -- --file ./imports/users.csv --default-password ChangeMe123 --skip-existing
npm run bulk:users -- --file ./imports/users.csv --dry-run
```

Supported import columns:
```text
name,email,password,phone,role
```

Full endpoint reference:
- `docs/API_REFERENCE.md`

## Key endpoints (all under `/api`)
- Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- Giving: `GET /giving/categories`, `GET /giving/summary`, `GET /giving/transactions`, `GET /giving/payment-intents/:paymentIntentId/status`, `POST /giving/intent`, `POST /giving/intent/cancel`, `POST /giving/setup-intent`, `POST /giving/webhook`
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
- Password reset UI: the backend only sends reset links and validates reset tokens. Set `RESET_PASSWORD_URL` or `CLIENT_RESET_PASSWORD_URL` to your frontend reset page, or set `CLIENT_ORIGIN` and the backend will use `${CLIENT_ORIGIN}/reset-password`.
- Email delivery: password reset emails are sent through Resend. Set `RESEND_API_KEY` and `EMAIL_FROM` in the backend environment.

## Push notifications (Expo)
- Register device token: `POST /notifications/push-tokens` body `{ token, platform }` where `token` is an Expo push token.
- Unregister device token: `DELETE /notifications/push-tokens` body `{ token }`.
- Admin broadcast: `POST /notifications` as an admin user sends to all users by default; send `{ audience: 'self' }` to target only yourself.
- Config: optional `EXPO_ACCESS_TOKEN` for higher throughput.

## Giving flow (Stripe one-time payments)
- `GET /giving/categories`: returns the allowed giving categories.
- `GET /giving/summary`: returns `{ totalGiven, thisMonth, transactionCount, currency }` for the signed-in user.
- `GET /giving/transactions`: returns `{ transactions }` for the signed-in user. Only `succeeded` donations are listed.
- `POST /giving/intent`: body `{ amount, category, type, currency? }` with `type = One-Time` -> creates a Stripe card PaymentIntent and a pending donation record. Response includes `clientSecret`, `paymentIntentId`, and `donationId`.
- `POST /giving/intent/cancel`: body `{ paymentIntentId }` -> cancels a pending PaymentIntent and marks the donation `cancelled`.
- `GET /giving/payment-intents/:paymentIntentId/status`: returns the donation status for settlement polling and updates pending records from Stripe when possible.
- `POST /giving/webhook`: Stripe webhook endpoint that marks donations `succeeded` or `failed` after Stripe sends payment events.
- Frontend flow: create intent, confirm with Stripe Elements using `clientSecret`, then poll `GET /giving/payment-intents/:paymentIntentId/status` until the donation settles.
- Local webhook forwarding: `stripe listen --forward-to http://localhost:4000/api/giving/webhook`
- Env: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` belong in the backend environment. `VITE_STRIPE_PUBLISHABLE_KEY` belongs in the web app environment.

## Email configuration
- Required for password reset: `RESEND_API_KEY` and `EMAIL_FROM`
- Example values:
  - `RESEND_API_KEY=re_...`
  - `EMAIL_FROM=noreply@your-domain.com`
- `EMAIL_FROM` must use a sender/domain verified in Resend.
