# Checkout Workflow — Feature Specification

## Overview

After a user checks in, they can tap **Check Out** to record the time they left church.
Only valid once per day's record; a user cannot check out without first checking in that day.

---

## Business Rules

- Checkout requires today's attendance record to exist → `404` if no check-in found for today
- Checkout rejects if `checkedOutAt` is already set → `409 Already checked out`
- No location data is required for checkout — timestamp only
- `checkedOutAt` is included in every attendance response once set
- **Auto-checkout**: if the user has not manually checked out, the system automatically sets `checkedOutAt` to exactly **3 hours 30 minutes** after the check-in `timestamp`
  - This is computed on read, not stored — `toAttendanceResponse` calculates `autoCheckedOutAt = timestamp + 210 minutes` and returns it as `checkedOutAt` whenever the stored value is `null` and the auto-checkout time has already passed
  - The manual `POST /attendance/check-out` stores the real time and always takes precedence over the auto value

---

## Backend Changes

### 1. Repository — `src/repositories/attendanceRepository.js`

Add `checkOutAttendance(id, timestamp)`:
- Calls `Attendance.findByIdAndUpdate(id, { checkedOutAt: timestamp }, { new: true })`
- Export the function

### 2. Service — `src/services/attendanceService.js`

Add `checkOut(userId)`:
1. Build today's `attendanceDateKey` from `new Date()`
2. Call `findByUserAndAttendanceDateKey(userId, attendanceDateKey)`
3. If no record → throw `AppError('No check-in found for today', 404)`
4. If `record.checkedOutAt` already set → throw `AppError('Already checked out', 409)`
5. Call `checkOutAttendance(record._id, new Date())`
6. Return `toAttendanceResponse(updatedRecord)`

Update `toAttendanceResponse` to include `checkedOutAt` in every response. If `record.checkedOutAt` is null, compute an automatic value:
```js
const AUTO_CHECKOUT_MS = 3.5 * 60 * 60 * 1000; // 3h 30m
const autoCheckout = new Date(record.timestamp.getTime() + AUTO_CHECKOUT_MS);
const checkedOutAt = record.checkedOutAt
  ? record.checkedOutAt
  : (new Date() >= autoCheckout ? autoCheckout : null);
```
Return `checkedOutAt` (ISO string or null) in the response.

Export `checkOut` from the module.

### 3. Controller — `src/controllers/attendanceController.js`

Add `checkOutController`:
```js
async function checkOutController(req, res, next) {
  try {
    const record = await checkOut(req.session.userId);
    res.json({ record });
  } catch (err) {
    next(err);
  }
}
```

Export `checkOutController`.

### 4. Route — `src/routes/attendanceRoutes.js`

```
POST /attendance/check-out  →  requireAuth  →  checkOutController
```

---

## Frontend Changes — `HPN_Web`

### 5. Types — `src/types/index.ts`

Add `checkedOutAt?: string` to the `AttendanceEntry` interface.

### 6. AttendancePage — `src/pages/AttendancePage.tsx`

**State:**
- Add `isCheckingOut: boolean` (default `false`)

**`mapToEntry` helper:**
- Map `item.checkedOutAt` → `entry.checkedOutAt`

**Today's Check-In section:**
- When `isUpdatingToday && !latestRecord.checkedOutAt`: render a **Check Out** button
- On click: `POST /attendance/check-out`, set `isCheckingOut` during request
- On success: update `latestRecord` with the returned record (now has `checkedOutAt`)
- When `latestRecord.checkedOutAt` is set: show "Checked out at HH:MM" in green below the check-in time

**History cards:**
- When a record has `checkedOutAt`: render a grey badge "Checked out · HH:MM" below the check-in timestamp

---

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/attendance/check-out` | `requireAuth` | Record checkout time for today's attendance |

### Response shape

```json
{
  "record": {
    "id": "...",
    "timestamp": "2026-05-17T10:00:00.000Z",
    "checkedOutAt": "2026-05-17T12:30:00.000Z",
    "day": "Sunday",
    "location": { "latitude": 54.971, "longitude": -1.612 },
    "dependents": []
  }
}
```

### Error responses

| Status | Condition |
|--------|-----------|
| `404` | No check-in record found for today |
| `409` | Already checked out |
| `401` | Not authenticated |
