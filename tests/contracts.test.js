const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Joi = require('joi');

jest.mock('../src/utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}));

jest.mock('../src/services/pushNotificationService', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
  sendPushToUsers: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
  sendPushToTokens: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
}));

const app = require('../src/app');

let mongoServer;
let emailCounter = 0;

const makeEmail = (prefix = 'user') => `${prefix}-${Date.now()}-${emailCounter++}@example.com`;

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const signupUser = async ({ email, password = 'password123', name = 'Test User', role } = {}) => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: email || makeEmail(), password, name, role })
    .expect(201);
  return res.body;
};

const assertSchema = (schema, data) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) throw error;
};

const isoDate = Joi.string().isoDate();
const objectId = Joi.string().hex().length(24);
const optionalIso = Joi.alternatives().try(isoDate, Joi.valid(null));
const optionalText = Joi.string().allow('', null);

const errorSchema = Joi.object({
  message: Joi.string().required(),
  details: Joi.any().optional(),
}).required();

const userSchema = Joi.object({
  id: objectId.required(),
  email: Joi.string().email().required(),
  name: optionalText.optional(),
  phone: optionalText.optional(),
  role: Joi.string().valid('member', 'staff', 'admin').required(),
  isOnboarded: Joi.boolean().optional(),
}).unknown(true);

const authResponseSchema = Joi.object({
  user: userSchema.required(),
  token: Joi.string().required(),
}).required();

const adminUserSchema = Joi.object({
  id: objectId.required(),
  email: Joi.string().email().required(),
  name: optionalText.optional(),
  role: Joi.string().valid('member', 'staff', 'admin').required(),
  createdAt: isoDate.optional(),
}).unknown(true);

const adminListUserSchema = adminUserSchema.keys({
  createdAt: isoDate.required(),
});

const attendanceSchema = Joi.object({
  id: objectId.required(),
  timestamp: isoDate.required(),
  day: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).required(),
  userId: objectId.required(),
  userName: optionalText.optional(),
  dependents: Joi.array()
    .items(
      Joi.object({
        id: objectId.required(),
        name: Joi.string().required(),
        age: Joi.number().required(),
      })
    )
    .optional(),
}).unknown(true);

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).required(),
  limit: Joi.number().integer().min(1).required(),
  totalRecords: Joi.number().integer().min(0).required(),
  totalPages: Joi.number().integer().min(1).required(),
}).required();

const attendanceAnalyticsUserSchema = Joi.object({
  id: objectId.required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('member', 'staff', 'admin').required(),
}).unknown(true);

const eventSchema = Joi.object({
  id: objectId.required(),
  title: Joi.string().required(),
  description: optionalText.optional(),
  startTime: isoDate.required(),
  endTime: optionalIso.optional(),
  location: optionalText.optional(),
  category: optionalText.optional(),
  maxAttendees: Joi.number().allow(null).optional(),
  attendeesCount: Joi.number().required(),
  isRegistered: Joi.boolean().required(),
}).unknown(true);

const prayerSchema = Joi.object({
  id: objectId.required(),
  authorName: optionalText.optional(),
  request: Joi.string().required(),
  category: Joi.string().required(),
  prayersCount: Joi.number().required(),
  commentsCount: Joi.number().required(),
  isPraying: Joi.boolean().required(),
  createdAt: isoDate.required(),
}).unknown(true);

const commentSchema = Joi.object({
  id: objectId.required(),
  prayerId: objectId.required(),
  authorName: Joi.string().required(),
  body: Joi.string().required(),
  createdAt: isoDate.required(),
  isAuthor: Joi.boolean().required(),
}).unknown(true);

const notificationSchema = Joi.object({
  id: objectId.required(),
  title: Joi.string().required(),
  body: Joi.string().required(),
  type: Joi.string().valid('event', 'prayer', 'giving', 'general').required(),
  read: Joi.boolean().required(),
  createdAt: isoDate.required(),
}).unknown(true);

const pushTokenSchema = Joi.object({
  id: objectId.required(),
  token: Joi.string().required(),
  platform: Joi.string().valid('ios', 'android', 'web').required(),
  enabled: Joi.boolean().required(),
  lastSeenAt: isoDate.required(),
}).unknown(true);

const donationSchema = Joi.object({
  id: objectId.required(),
  amount: Joi.number().required(),
  currency: Joi.string().required(),
  category: Joi.string().required(),
  type: Joi.string().required(),
  status: Joi.string().required(),
  createdAt: isoDate.required(),
}).unknown(true);

const syncItemSchema = Joi.object({
  _id: objectId.required(),
  userId: objectId.required(),
  key: Joi.string().required(),
  data: Joi.object().unknown(true).required(),
  deviceUpdatedAt: isoDate.required(),
  serverUpdatedAt: isoDate.required(),
  conflict: Joi.boolean().required(),
  conflictReason: Joi.string().allow(null).optional(),
}).unknown(true);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGO_URI = uri;
  process.env.CLIENT_ORIGIN = 'http://localhost:3000';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('Contract: health', () => {
  test('GET /api/health returns html', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});

describe('Contract: auth', () => {
  test('signup, login, me, logout', async () => {
    const signup = await signupUser({ email: makeEmail('auth') });
    assertSchema(authResponseSchema, signup);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: signup.user.email, password: 'password123' })
      .expect(200);
    assertSchema(authResponseSchema, loginRes.body);
    const meRes = await request(app)
      .get('/api/auth/me')
      .set(authHeader(loginRes.body.token))
      .expect(200);
    assertSchema(Joi.object({ user: userSchema.required() }).required(), meRes.body);

    await request(app)
      .post('/api/auth/logout')
      .set(authHeader(loginRes.body.token))
      .expect(204);
  });

  test('attendance management contracts', async () => {
    const admin = await signupUser({ email: makeEmail('attendance-admin'), role: 'admin' });
    const member = await signupUser({ email: makeEmail('attendance-member') });

    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set(authHeader(member.token))
      .send({ latitude: 10.1, longitude: -20.2 })
      .expect(201);

    const attendanceId = checkInRes.body.record.id;

    const listRes = await request(app)
      .get('/api/admin/attendance?page=1&limit=10')
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(
      Joi.object({
        records: Joi.array().items(attendanceSchema).required(),
        pagination: paginationSchema,
      }).required(),
      listRes.body
    );

    const detailRes = await request(app)
      .get(`/api/admin/attendance/${attendanceId}`)
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(Joi.object({ record: attendanceSchema.required() }).required(), detailRes.body);

    const exportRes = await request(app)
      .get('/api/admin/attendance/export')
      .set(authHeader(admin.token))
      .expect(200);
    expect(exportRes.headers['content-type']).toMatch(/spreadsheetml.sheet/);

    const deleteRes = await request(app)
      .delete(`/api/admin/attendance/${attendanceId}`)
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(
      Joi.object({
        deleted: Joi.boolean().valid(true).required(),
        id: objectId.required(),
      }).required(),
      deleteRes.body
    );
  });

  test('forgot/reset contracts', async () => {
    await signupUser({ email: makeEmail('reset') });
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: makeEmail('missing') })
      .expect(200);
    assertSchema(Joi.object({ message: Joi.string().required() }).required(), forgotRes.body);

    const redirectRes = await request(app).get('/api/auth/reset-password?token=token').expect(302);
    expect(redirectRes.headers.location).toBe('http://localhost:3000/reset-password?token=token');

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken', password: 'newpassword123' })
      .expect(400);
    assertSchema(errorSchema, resetRes.body);
  });
});

describe('Contract: attendance', () => {
  test('check-in and reads', async () => {
    const { token } = await signupUser({ email: makeEmail('attendance') });
    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set(authHeader(token))
      .send({ latitude: 10.1, longitude: -20.2 })
      .expect(201);
    assertSchema(Joi.object({ record: attendanceSchema.required() }).required(), checkInRes.body);

    const latestRes = await request(app)
      .get('/api/attendance/latest')
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({
        record: Joi.alternatives().try(attendanceSchema, Joi.valid(null)).required(),
      }).required(),
      latestRes.body
    );

    const listRes = await request(app)
      .get('/api/attendance')
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ records: Joi.array().items(attendanceSchema).required() }).required(), listRes.body);

    const recordId = checkInRes.body.record.id;
    const detailRes = await request(app)
      .get(`/api/attendance/${recordId}`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ record: attendanceSchema.required() }).required(), detailRes.body);
  });
});

describe('Contract: events', () => {
  test('list/create/get/rsvp', async () => {
    const { token } = await signupUser({ email: makeEmail('events') });
    const listRes = await request(app).get('/api/events').set(authHeader(token)).expect(200);
    assertSchema(Joi.object({ events: Joi.array().items(eventSchema).required() }).required(), listRes.body);

    const createRes = await request(app)
      .post('/api/events')
      .set(authHeader(token))
      .send({ title: 'Event', startTime: new Date().toISOString() })
      .expect(201);
    assertSchema(Joi.object({ event: eventSchema.required() }).required(), createRes.body);

    const eventId = createRes.body.event.id;
    const getRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ event: eventSchema.required() }).required(), getRes.body);

    const rsvpRes = await request(app)
      .post(`/api/events/${eventId}/rsvp`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({
        event: eventSchema.required(),
        status: Joi.string().required(),
      }).required(),
      rsvpRes.body
    );
  });
});

describe('Contract: prayers', () => {
  test('prayer lifecycle', async () => {
    const { token } = await signupUser({ email: makeEmail('prayers') });
    const listRes = await request(app).get('/api/prayers').set(authHeader(token)).expect(200);
    assertSchema(Joi.object({ prayers: Joi.array().items(prayerSchema).required() }).required(), listRes.body);

    const createRes = await request(app)
      .post('/api/prayers')
      .set(authHeader(token))
      .send({ request: 'Please pray.' })
      .expect(201);
    assertSchema(Joi.object({ prayer: prayerSchema.required() }).required(), createRes.body);

    const prayerId = createRes.body.prayer.id;
    const prayRes = await request(app)
      .post(`/api/prayers/${prayerId}/pray`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({ prayer: prayerSchema.required(), status: Joi.string().required() }).required(),
      prayRes.body
    );

    const prayingRes = await request(app)
      .get(`/api/prayers/${prayerId}/prayers`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({
        count: Joi.number().required(),
        users: Joi.array()
          .items(Joi.object({ id: objectId.required(), name: Joi.string().required() }).unknown(true))
          .required(),
      }).required(),
      prayingRes.body
    );

    const commentsRes = await request(app)
      .get(`/api/prayers/${prayerId}/comments`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ comments: Joi.array().items(commentSchema).required() }).required(), commentsRes.body);

    const addCommentRes = await request(app)
      .post(`/api/prayers/${prayerId}/comments`)
      .set(authHeader(token))
      .send({ body: 'Amen.' })
      .expect(201);
    assertSchema(Joi.object({ comment: commentSchema.required() }).required(), addCommentRes.body);

    const commentId = addCommentRes.body.comment.id;
    const deleteRes = await request(app)
      .delete(`/api/prayers/${prayerId}/comments/${commentId}`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ deleted: Joi.boolean().required() }).required(), deleteRes.body);
  });
});

describe('Contract: notifications', () => {
  test('personal notifications contract', async () => {
    const { token } = await signupUser({ email: makeEmail('notify') });
    const expoToken = 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

    const registerRes = await request(app)
      .post('/api/notifications/push-tokens')
      .set(authHeader(token))
      .send({ token: expoToken, platform: 'android' })
      .expect(201);
    assertSchema(Joi.object({ pushToken: pushTokenSchema.required() }).required(), registerRes.body);

    const seedRes = await request(app)
      .post('/api/notifications')
      .set(authHeader(token))
      .send({ title: 'Hello', body: 'World', type: 'general' })
      .expect(201);
    assertSchema(Joi.object({ notification: notificationSchema.required() }).required(), seedRes.body);

    const listRes = await request(app)
      .get('/api/notifications')
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ notifications: Joi.array().items(notificationSchema).required() }).required(), listRes.body);

    const notificationId = seedRes.body.notification.id;
    const readRes = await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ notification: notificationSchema.required() }).required(), readRes.body);

    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ updated: Joi.number().required() }).required(), readAllRes.body);

    const unregisterRes = await request(app)
      .delete('/api/notifications/push-tokens')
      .set(authHeader(token))
      .send({ token: expoToken })
      .expect(200);
    assertSchema(Joi.object({ pushToken: pushTokenSchema.required() }).required(), unregisterRes.body);
  });

  test('admin broadcast contract', async () => {
    const admin = await signupUser({ email: makeEmail('notify-admin'), role: 'admin' });
    await signupUser({ email: makeEmail('notify-member') });

    const broadcastRes = await request(app)
      .post('/api/notifications')
      .set(authHeader(admin.token))
      .send({ title: 'Broadcast', body: 'Test', audience: 'all' })
      .expect(201);
    assertSchema(
      Joi.object({
        notification: notificationSchema.required(),
        summary: Joi.object({
          recipients: Joi.number().required(),
          delivered: Joi.number().required(),
          failed: Joi.number().required(),
        }).required(),
      }).required(),
      broadcastRes.body
    );
  });
});

describe('Contract: sync', () => {
  test('sync contract', async () => {
    const { token } = await signupUser({ email: makeEmail('sync') });
    const res = await request(app)
      .post('/api/sync')
      .set(authHeader(token))
      .send({ items: [] })
      .expect(200);
    assertSchema(
      Joi.object({
        applied: Joi.array().items(syncItemSchema).required(),
        conflicts: Joi.array().required(),
        serverSnapshot: Joi.array().items(syncItemSchema).required(),
      }).required(),
      res.body
    );
  });
});

describe('Contract: giving', () => {
  test('list/summary contracts', async () => {
    const { token } = await signupUser({ email: makeEmail('giving') });
    const categoriesRes = await request(app)
      .get('/api/giving/categories')
      .set(authHeader(token))
      .expect(200);
    assertSchema(Joi.object({ categories: Joi.array().items(Joi.string()).required() }).required(), categoriesRes.body);

    const summaryRes = await request(app)
      .get('/api/giving/summary')
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({
        totalGiven: Joi.number().required(),
        thisMonth: Joi.number().required(),
        transactionCount: Joi.number().required(),
        currency: Joi.string().required(),
      }).required(),
      summaryRes.body
    );

    const transactionsRes = await request(app)
      .get('/api/giving/transactions')
      .set(authHeader(token))
      .expect(200);
    assertSchema(
      Joi.object({ transactions: Joi.array().items(donationSchema).required() }).required(),
      transactionsRes.body
    );
  });

  test('intent/subscription/setup/webhook error contracts', async () => {
    const { token } = await signupUser({ email: makeEmail('giving-errors') });
    const intentRes = await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 10, category: 'Tithe', type: 'One-Time' })
      .expect(500);
    assertSchema(errorSchema, intentRes.body);

    const subscriptionRes = await request(app)
      .post('/api/giving/subscription')
      .set(authHeader(token))
      .send({ amount: 10, category: 'Tithe', type: 'Monthly' })
      .expect(500);
    assertSchema(errorSchema, subscriptionRes.body);

    const setupRes = await request(app)
      .post('/api/giving/setup-intent')
      .set(authHeader(token))
      .expect(500);
    assertSchema(errorSchema, setupRes.body);

    const webhookRes = await request(app)
      .post('/api/giving/webhook')
      .set('stripe-signature', 'sig')
      .send({})
      .expect(500);
    assertSchema(errorSchema, webhookRes.body);
  });
});

describe('Contract: admin', () => {
  test('admin summary contracts', async () => {
    const admin = await signupUser({ email: makeEmail('admin'), role: 'admin' });
    const member = await signupUser({ email: makeEmail('member') });

    const usersRes = await request(app)
      .get('/api/admin/users')
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(
      Joi.object({ users: Joi.array().items(adminListUserSchema).required() }).required(),
      usersRes.body
    );

    const attendanceRes = await request(app)
      .get('/api/admin/attendance/summary')
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(
      Joi.object({
        totalCheckIns: Joi.number().required(),
        recent: Joi.array().items(attendanceSchema).required(),
        analytics: Joi.object({
          attendanceLabel: Joi.alternatives().try(Joi.string(), Joi.valid(null)).required(),
          totalEligibleUsers: Joi.number().required(),
          attendedCount: Joi.number().required(),
          absentCount: Joi.number().required(),
          attendedUsers: Joi.array().items(attendanceAnalyticsUserSchema).required(),
          absentUsers: Joi.array().items(attendanceAnalyticsUserSchema).required(),
        }).required(),
      }).required(),
      attendanceRes.body
    );

    const eventsRes = await request(app)
      .get('/api/admin/events/summary')
      .set(authHeader(admin.token))
      .expect(200);
    assertSchema(
      Joi.object({
        totalEvents: Joi.number().required(),
        totalRegistrations: Joi.number().required(),
      }).required(),
      eventsRes.body
    );

    const updateRes = await request(app)
      .patch(`/api/admin/users/${member.user.id}/email`)
      .set(authHeader(admin.token))
      .send({ email: makeEmail('updated') })
      .expect(200);
    assertSchema(Joi.object({ user: adminUserSchema.required() }).required(), updateRes.body);
  });
});
