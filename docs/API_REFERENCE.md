# HPN Backend API Reference

This document reflects the current backend behavior in `HPN_Mobile_Backend` as of 2026-04-06.

Base path: `/api`

## Authentication model

- `requireAuth` accepts either a session cookie or `Authorization: Bearer <jwt>`.
- Web flows typically use both: the backend sets a session and also returns a JWT.
- `requireAdmin` requires an authenticated user whose stored role is `admin`.
- Admin routes are all behind both `requireAuth` and `requireAdmin`.

## Platform usage legend

- `HPN_Web`: currently used by the member-facing web app.
- `hpn-admin`: currently used by the admin dashboard.
- `Manual / backend-only`: implemented in the backend but not visibly surfaced in the current checked client code, or intended for direct integration tools like Stripe or Postman.

## Auth endpoints

### `POST /api/auth/signup`
- Auth: public
- Used by: `HPN_Web`, `hpn-admin`
- Body: `{ email, password, name?, phone?, role? }`
- Validation: email required, password minimum 8, role optional and limited to `member | staff | admin`
- What happens:
  - rejects if the email already exists
  - hashes the password with bcrypt
  - creates the user with default `mustChangePassword: true`
  - creates a server session for the new user
- Response: `201 { user, token }`

### `POST /api/auth/login`
- Auth: public
- Used by: `HPN_Web`
- Body: `{ email, password }`
- Validation: both required, password minimum 8
- What happens:
  - checks credentials
  - stores `session.userId`
  - returns a JWT for bearer-auth clients
- Response: `200 { user, token }`

### `POST /api/auth/admin/login`
- Auth: public
- Used by: `hpn-admin`
- Body: `{ email, password }`
- What happens:
  - same credential check as normal login
  - additionally rejects non-admin users with `403 Forbidden`
  - stores `session.userId` and `session.role`
- Response: `200 { user }`

### `POST /api/auth/logout`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - destroys the server session
  - clears the session cookie
- Response: `204 No Content`

### `GET /api/auth/me`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - returns the currently authenticated user profile
- Response: `200 { user }`

### `PATCH /api/auth/me`
- Auth: required
- Used by: `HPN_Web`
- Body: any subset of `{ name, email, phone, address, avatarUrl, isOnboarded, isonboarded, is_onboarded }`
- What happens:
  - normalizes onboarding field aliases
  - updates the current user only
  - rejects duplicate email changes
- Response: `200 { user }`

### `POST /api/auth/change-password`
- Auth: required
- Used by: `HPN_Web`
- Body: `{ currentPassword, newPassword }`
- What happens:
  - verifies current password
  - rejects if new password equals current password
  - stores the new bcrypt hash
  - clears `mustChangePassword`
- Response: `200 { user }`

### `POST /api/auth/forgot-password`
- Auth: public
- Used by: `HPN_Web`, `hpn-admin`
- Body: `{ email }`
- What happens:
  - if the email exists, generates a raw reset token and stores only its SHA-256 hash plus expiry
  - builds a frontend reset URL using `RESET_PASSWORD_URL`, `CLIENT_RESET_PASSWORD_URL`, or `CLIENT_ORIGIN + /reset-password`
  - emails the link through Resend
  - if the email does not exist, still returns success text
- Response: `200 { message }`

### `GET /api/auth/reset-password?token=...`
- Auth: public
- Used by: Manual / backend-only redirect target
- What happens:
  - validates the token exists in query string
  - redirects the caller to the configured frontend reset page with the same token
- Response: `302` redirect
- Use this when:
  - testing old reset links that still point to the backend
  - verifying redirect behavior from email links

### `POST /api/auth/reset-password`
- Auth: public
- Used by: `HPN_Web`, `hpn-admin`
- Body: `{ password, token? }`
- Query: optional `token`
- What happens:
  - accepts the reset token from body or query string
  - finds the user by hashed token and expiry
  - stores the new bcrypt password hash
  - clears reset token fields and `mustChangePassword`
- Response: `200 { user }`

## Attendance endpoints

### `POST /api/attendance/check-in`
- Auth: required
- Used by: `HPN_Web`
- Body: `{ latitude, longitude, timestamp?, dependents? }`
- Dependents shape: `[{ name, age }]`, maximum 10
- What happens:
  - creates a same-day attendance record for the current user, or updates that same-day record if one already exists
  - stores geolocation and dependents
- Response:
  - `201 { record }` on first check-in for that day
  - `200 { record }` when updating an existing same-day record

### `GET /api/attendance/latest`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - returns the latest attendance record for the current user
- Response: `200 { record }`

### `GET /api/attendance`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - returns the current user’s attendance history
- Response: `200 { records }`

### `GET /api/attendance/:id`
- Auth: required
- Used by: Manual / backend-only for member clients
- What happens:
  - returns one attendance record owned by the current user
  - rejects access to another user’s record
- Response: `200 { record }`

## Admin attendance endpoints

### `GET /api/admin/attendance/summary`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - returns system-wide attendance totals
  - returns the latest check-ins
  - computes attendance analytics for the latest attendance day
  - includes `newMembers`, which are recently registered members who have checked in
- Response:
  - `{ totalCheckIns, recent, newMembers, analytics }`

### `GET /api/admin/attendance?page=1&limit=10`
- Auth: admin required
- Used by: `hpn-admin`
- Query: `page`, `limit`
- What happens:
  - returns paginated attendance across all users
  - each record includes `userName`, `userRegisteredAt`, and `isNewMember` when available
- Response: `{ records, pagination }`

### `GET /api/admin/attendance/:id`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - returns one system-wide attendance record with populated user metadata
- Response: `200 { record }`

### `DELETE /api/admin/attendance/:id`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - permanently deletes one attendance record
- Response: `200 { deleted: true, id }`

### `GET /api/admin/attendance/export`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - generates an Excel workbook of all attendance rows with location and dependents columns
- Response:
  - binary `.xlsx`
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## Admin user endpoints

### `GET /api/admin/users`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - returns all users sorted newest first
- Response: `200 { users }`

### `PATCH /api/admin/users/:id/email`
- Auth: admin required
- Used by: `hpn-admin`
- Body: `{ email }`
- What happens:
  - updates a single user email after duplicate-email checks
- Response: `200 { user }`

### `DELETE /api/admin/users/:id`
- Auth: admin required
- Used by: available in `hpn-admin` API layer, not clearly surfaced in the currently checked pages
- What happens:
  - permanently deletes the user record
- Response: `200 { message, id }`

## Admin event summary

### `GET /api/admin/events/summary`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - returns total event count and total registrations across all events
- Response: `200 { totalEvents, totalRegistrations }`

## Event endpoints

### `GET /api/events`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- Query: `search?`, `category?`
- What happens:
  - lists events and annotates them for the current user, including RSVP state
- Response: `200 { events }`

### `POST /api/events`
- Auth: required
- Used by: available in `hpn-admin` API layer, not visibly surfaced in the checked `HPN_Web` event page
- Body: `{ title, description?, startTime, endTime?, location?, category?, maxAttendees? }`
- What happens:
  - creates a new event associated with the current user
- Response: `201 { event }`

### `GET /api/events/:id`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - returns one event with user-specific RSVP info
- Response: `200 { event }`

### `POST /api/events/:id/rsvp`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - toggles RSVP for the current user
  - returns the updated event plus a status string
- Response: `200 { event, status }`

## Prayer endpoints

### `GET /api/prayers`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- Query: `category?`
- What happens:
  - lists prayer requests with prayer/comment counts and whether the current user is praying
- Response: `200 { prayers }`

### `POST /api/prayers`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- Body: `{ request, category?, authorName? }`
- What happens:
  - creates a new prayer request
- Response: `201 { prayer }`

### `POST /api/prayers/:id/pray`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - toggles whether the current user is praying for that request
- Response: `200 { prayer, status }`

### `GET /api/prayers/:id/prayers`
- Auth: required
- Used by: available in `hpn-admin` API layer, not visibly surfaced in checked `HPN_Web` pages
- Query: `limit?`, `offset?`
- What happens:
  - returns the users currently marked as praying for the request
- Response: `200 { count, users }`

### `GET /api/prayers/:id/comments`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- Query: `limit?`, `offset?`
- What happens:
  - lists comments for a prayer request
- Response: `200 { comments }`

### `POST /api/prayers/:id/comments`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- Body: `{ body }`
- What happens:
  - adds a comment to a prayer request
- Response: `201 { comment }`

### `DELETE /api/prayers/:id/comments/:commentId`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - deletes the specified prayer comment if the current user is allowed
- Response: `200 { deleted }`

## Notification endpoints

### `GET /api/notifications`
- Auth: required
- Used by: `HPN_Web`, `hpn-admin`
- What happens:
  - returns notifications for the current user
- Response: `200 { notifications }`

### `POST /api/notifications/:id/read`
- Auth: required
- Used by: `hpn-admin`
- What happens:
  - marks one notification as read for the current user
- Response: `200 { notification }`

### `POST /api/notifications/read-all`
- Auth: required
- Used by: `hpn-admin`
- What happens:
  - marks all notifications as read for the current user
- Response: `200 { updated }`

### `POST /api/notifications/mark-all-read`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - alias of `POST /api/notifications/read-all`
  - marks all notifications as read for the current user
- Response: `200 { updated }`

### `POST /api/notifications`
- Auth: required
- Used by: `hpn-admin`
- Body: `{ title, body, type?, audience? }`
- What happens:
  - for non-admin users or `audience: self`, creates a notification for the current user
  - for admins with `audience !== self`, broadcasts a notification to all users
- Response:
  - self notification: `201 { notification }`
  - broadcast path: `201` with service-specific broadcast result

### `POST /api/notifications/push-tokens`
- Auth: required
- Used by: Manual / backend-only from the currently checked web/admin clients
- Body: `{ token, platform }`
- What happens:
  - stores or updates an Expo push token for the current user
- Response: `201 { pushToken }`

### `DELETE /api/notifications/push-tokens`
- Auth: required
- Used by: Manual / backend-only from the currently checked web/admin clients
- Body: `{ token }`
- What happens:
  - unregisters a push token
- Response: `200 { pushToken }`

### `DELETE /api/notifications/:id`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - deletes one notification record
- Response: `200 { deleted }`

### `DELETE /api/notifications`
- Auth: admin required
- Used by: `hpn-admin`
- What happens:
  - clears notification records
- Response: `200 { deleted }`

## Giving endpoints

### `GET /api/giving/categories`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - returns the allowed categories from `GIVING_CATEGORIES`
- Response: `200 { categories }`

### `GET /api/giving/summary`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - returns user giving totals
- Response: `200 { totalGiven, thisMonth, transactionCount, currency }`

### `GET /api/giving/transactions`
- Auth: required
- Used by: `HPN_Web`
- Query: `limit?`, `offset?`
- What happens:
  - returns paged giving transactions for the current user
- Response: `200 { transactions }`

### `GET /api/giving/payment-intents/:paymentIntentId/status`
- Auth: required
- Used by: `HPN_Web`
- What happens:
  - returns the current donation/payment settlement status for one payment intent
- Response: `200 { status, ... }`

### `POST /api/giving/intent`
- Auth: required
- Used by: `HPN_Web`
- Body: `{ amount, category, type, currency? }`
- What happens:
  - creates a Stripe PaymentIntent for one-time giving
  - creates a pending donation record
- Response: `201 { clientSecret, paymentIntentId, donationId, ... }`

### `POST /api/giving/intent/cancel`
- Auth: required
- Used by: `HPN_Web`
- Body: `{ paymentIntentId }`
- What happens:
  - cancels a pending Stripe PaymentIntent and updates donation state
- Response: `200 { ... }`

### `POST /api/giving/subscription`
- Auth: required
- Used by: Manual / backend-only from the currently checked clients
- Body: `{ amount, category, type, currency? }`
- What happens:
  - creates a subscription-style giving flow when Stripe is configured
- Response: `201 { ... }`

### `POST /api/giving/setup-intent`
- Auth: required
- Used by: Manual / backend-only from the currently checked clients
- What happens:
  - creates a Stripe SetupIntent for saving payment details
- Response: `201 { ... }`

### `POST /api/giving/webhook`
- Auth: Stripe-signed webhook, not user-authenticated
- Used by: Stripe / manual backend integration only
- What happens:
  - requires raw request body
  - validates `stripe-signature`
  - processes Stripe events and updates giving records
- Response: `200 { received: true }`

## Sync endpoint

### `POST /api/sync`
- Auth: required
- Used by: Manual / backend-only from the currently checked web/admin code
- Body: `{ items: [{ key, data, deviceUpdatedAt, serverUpdatedAt? }] }`
- What happens:
  - merges client sync items for the current user
  - returns applied items, conflicts, and server snapshot data
- Response: `200 { applied, conflicts, serverSnapshot }`

## Health endpoint

### `GET /api/health`
- Auth: public
- Used by: browser/manual monitoring
- What happens:
  - renders an HTML health page from the current health report
  - returns HTTP `503` when the report status is `fail`, otherwise `200`
- Response: HTML

## How to call endpoints not surfaced in the current platforms

These are the common direct-call cases.

### Admin login for Postman or curl

```bash
curl -X POST http://localhost:4000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"changeme123"}'
```

### Attendance export

```bash
curl -L http://localhost:4000/api/admin/attendance/export \
  -H "Cookie: sid=<session-cookie>" \
  --output attendance-export.xlsx
```

### Manual sync push

```bash
curl -X POST http://localhost:4000/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "items": [
      {
        "key": "profile",
        "data": {"theme":"dark"},
        "deviceUpdatedAt": "2026-04-06T12:00:00.000Z"
      }
    ]
  }'
```

### Push token registration

```bash
curl -X POST http://localhost:4000/api/notifications/push-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"token":"ExponentPushToken[xxxx]","platform":"ios"}'
```

### Stripe webhook forwarding during local development

```bash
stripe listen --forward-to http://localhost:4000/api/giving/webhook
```

### Backend reset redirect check

Open this in a browser:

```text
http://localhost:4000/api/auth/reset-password?token=<raw-reset-token>
```

The backend should redirect you to the configured frontend reset page with `?token=...` attached.

## Known platform mismatches worth fixing

- `HPN_Web` notifications page currently posts to `/api/notifications/mark-all-read`, but the backend route is `POST /api/notifications/read-all`.
- Some flows exist only in backend or admin service layers today and are not exposed in member-facing pages, including sync, push-token registration, subscription giving, setup intent creation, and direct attendance detail lookup.