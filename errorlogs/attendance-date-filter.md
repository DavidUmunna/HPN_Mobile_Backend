## Date filter for admin attendance list returns whole unfiltered list in production

**Affected route:** `GET /api/admin/attendance?date=YYYY-MM-DD`
**Affected service:** `listAttendanceRecords` in `src/services/adminService.js`

### Problem

The date filter worked correctly in development but was silently ignored in production, returning the full unfiltered list of attendance records regardless of the `date` query parameter.

The filter was built using the `attendanceDateKey` field:

```js
if (date) {
  filter.attendanceDateKey = String(date).trim();
}
```

`attendanceDateKey` is a field added to the `Attendance` schema and computed via a Mongoose `pre('validate')` hook:

```js
attendanceSchema.pre('validate', function setAttendanceDayFields() {
  if (this.timestamp instanceof Date && !Number.isNaN(this.timestamp.getTime())) {
    this.attendanceDateKey = buildAttendanceDateKey(this.timestamp);
  }
});
```

`pre('validate')` only fires on `save()` / `create()`. It does **not** backfill existing documents. Production had attendance records created before `attendanceDateKey` was added to the schema — those documents never had the field set. Querying `{ attendanceDateKey: 'YYYY-MM-DD' }` returned 0 matches for any date that had only old records, making it appear as though the filter was not being applied at all.

In development, all records were created after the field was introduced, so the filter worked correctly.

### Resolution

Replaced the `attendanceDateKey` exact-match filter with a UTC `timestamp` range query. The `timestamp` field is `required: true` and exists on every attendance document from day one.

```js
if (date) {
  const start = new Date(`${String(date).trim()}T00:00:00.000Z`);
  const end = new Date(`${String(date).trim()}T23:59:59.999Z`);
  if (!Number.isNaN(start.getTime())) {
    filter.timestamp = { $gte: start, $lte: end };
  }
}
```

This returns all records whose `timestamp` falls within the chosen UTC calendar day, regardless of when the document was created or whether `attendanceDateKey` is present.

### Notes

- For a UK-based church, check-ins between 23:00–00:00 BST (22:00–23:00 UTC) would be attributed to the previous UTC calendar day. This is an acceptable edge case given that no services run at that hour.
- The `attendanceDateKey` field and its compound unique index (`userId + attendanceDateKey`) are still retained on the schema for the one-per-day uniqueness constraint on new check-ins.
