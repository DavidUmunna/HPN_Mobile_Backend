const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

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

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const signupUser = async ({ email, password = 'password123', name = 'Test User', role } = {}) => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email, password, name, role })
    .expect(201);
  return res.body;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('Health endpoints', () => {
  test('GET /api/health returns html', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});

describe('Auth endpoints', () => {
  test('signup, login, me, logout', async () => {
    const signup = await signupUser({ email: 'user1@example.com' });
    expect(signup.user.email).toBe('user1@example.com');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user1@example.com', password: 'password123' })
      .expect(200);
    expect(loginRes.body.user.email).toBe('user1@example.com');
    expect(loginRes.body.token).toBeTruthy();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set(authHeader(loginRes.body.token))
      .expect(200);
    expect(meRes.body.user.email).toBe('user1@example.com');

    await request(app)
      .post('/api/auth/logout')
      .set(authHeader(loginRes.body.token))
      .expect(204);
  });

  test('admin login honors role', async () => {
    await signupUser({ email: 'member@example.com', role: 'member' });
    await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'member@example.com', password: 'password123' })
      .expect(403);

    await signupUser({ email: 'admin@example.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/admin/login')
      .send({ email: 'admin@example.com', password: 'password123' })
      .expect(200);
    expect(res.body.user.role).toBe('admin');
  });

  test('forgot/reset password endpoints', async () => {
    await signupUser({ email: 'reset@example.com' });
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset@example.com' })
      .expect(200);

    const pageRes = await request(app).get('/api/auth/reset-password?token=testtoken').expect(200);
    expect(pageRes.text).toMatch(/Reset Password/);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken', password: 'newpassword123' })
      .expect(400);
  });
});

describe('Attendance endpoints', () => {
  test('check-in, list, latest, detail', async () => {
    const { token } = await signupUser({ email: 'attendee@example.com' });
    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set(authHeader(token))
      .send({ latitude: 12.34, longitude: 56.78 })
      .expect(201);

    const recordId = checkInRes.body.record.id;
    expect(recordId).toBeTruthy();

    const latestRes = await request(app)
      .get('/api/attendance/latest')
      .set(authHeader(token))
      .expect(200);
    expect(latestRes.body.record.id).toBe(recordId);

    const listRes = await request(app)
      .get('/api/attendance')
      .set(authHeader(token))
      .expect(200);
    expect(listRes.body.records).toHaveLength(1);

    const detailRes = await request(app)
      .get(`/api/attendance/${recordId}`)
      .set(authHeader(token))
      .expect(200);
    expect(detailRes.body.record.id).toBe(recordId);
  });
});

describe('Event endpoints', () => {
  test('list, create, get, rsvp', async () => {
    const { token } = await signupUser({ email: 'events@example.com' });

    const listRes = await request(app)
      .get('/api/events')
      .set(authHeader(token))
      .expect(200);
    expect(listRes.body.events).toHaveLength(0);

    const createRes = await request(app)
      .post('/api/events')
      .set(authHeader(token))
      .send({
        title: 'Test Event',
        startTime: new Date().toISOString(),
        location: 'Main Hall',
      })
      .expect(201);
    const eventId = createRes.body.event.id;

    const getRes = await request(app)
      .get(`/api/events/${eventId}`)
      .set(authHeader(token))
      .expect(200);
    expect(getRes.body.event.id).toBe(eventId);

    const rsvpRes = await request(app)
      .post(`/api/events/${eventId}/rsvp`)
      .set(authHeader(token))
      .expect(200);
    expect(rsvpRes.body.status).toBe('registered');
  });
});

describe('Prayer endpoints', () => {
  test('prayer flow', async () => {
    const { token } = await signupUser({ email: 'prayer@example.com' });

    const listRes = await request(app)
      .get('/api/prayers')
      .set(authHeader(token))
      .expect(200);
    expect(listRes.body.prayers).toHaveLength(0);

    const createRes = await request(app)
      .post('/api/prayers')
      .set(authHeader(token))
      .send({ request: 'Please pray for peace.' })
      .expect(201);
    const prayerId = createRes.body.prayer.id;

    const toggleRes = await request(app)
      .post(`/api/prayers/${prayerId}/pray`)
      .set(authHeader(token))
      .expect(200);
    expect(toggleRes.body.status).toBe('praying');

    const prayingRes = await request(app)
      .get(`/api/prayers/${prayerId}/prayers`)
      .set(authHeader(token))
      .expect(200);
    expect(prayingRes.body.count).toBe(1);

    const commentsRes = await request(app)
      .get(`/api/prayers/${prayerId}/comments`)
      .set(authHeader(token))
      .expect(200);
    expect(commentsRes.body.comments).toHaveLength(0);

    const addCommentRes = await request(app)
      .post(`/api/prayers/${prayerId}/comments`)
      .set(authHeader(token))
      .send({ body: 'Standing with you.' })
      .expect(201);
    const commentId = addCommentRes.body.comment.id;

    const deleteRes = await request(app)
      .delete(`/api/prayers/${prayerId}/comments/${commentId}`)
      .set(authHeader(token))
      .expect(200);
    expect(deleteRes.body.deleted).toBe(true);
  });
});

describe('Notification endpoints', () => {
  test('register/unregister push tokens and list notifications', async () => {
    const { token } = await signupUser({ email: 'notify@example.com' });
    const expoToken = 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

    const registerRes = await request(app)
      .post('/api/notifications/push-tokens')
      .set(authHeader(token))
      .send({ token: expoToken, platform: 'android' })
      .expect(201);
    expect(registerRes.body.pushToken.token).toBe(expoToken);

    const seedRes = await request(app)
      .post('/api/notifications')
      .set(authHeader(token))
      .send({ title: 'Hello', body: 'World', type: 'general' })
      .expect(201);
    const notificationId = seedRes.body.notification.id;

    const listRes = await request(app)
      .get('/api/notifications')
      .set(authHeader(token))
      .expect(200);
    expect(listRes.body.notifications.length).toBeGreaterThanOrEqual(1);

    const readRes = await request(app)
      .post(`/api/notifications/${notificationId}/read`)
      .set(authHeader(token))
      .expect(200);
    expect(readRes.body.notification.read).toBe(true);

    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set(authHeader(token))
      .expect(200);
    expect(readAllRes.body.updated).toBeGreaterThanOrEqual(0);

    const unregisterRes = await request(app)
      .delete('/api/notifications/push-tokens')
      .set(authHeader(token))
      .send({ token: expoToken })
      .expect(200);
    expect(unregisterRes.body.pushToken.enabled).toBe(false);
  });

  test('admin broadcast, delete, clear', async () => {
    const admin = await signupUser({ email: 'notify-admin@example.com', role: 'admin' });
    const member = await signupUser({ email: 'notify-member@example.com' });

    await request(app)
      .post('/api/notifications')
      .set(authHeader(admin.token))
      .send({ title: 'Broadcast', body: 'Test', audience: 'all' })
      .expect(201);

    const memberList = await request(app)
      .get('/api/notifications')
      .set(authHeader(member.token))
      .expect(200);
    expect(memberList.body.notifications.length).toBeGreaterThanOrEqual(1);

    const adminList = await request(app)
      .get('/api/notifications')
      .set(authHeader(admin.token))
      .expect(200);
    const adminNotificationId = adminList.body.notifications[0].id;

    const deleteRes = await request(app)
      .delete(`/api/notifications/${adminNotificationId}`)
      .set(authHeader(admin.token))
      .expect(200);
    expect(deleteRes.body.deleted).toBe(true);

    const clearRes = await request(app)
      .delete('/api/notifications')
      .set(authHeader(admin.token))
      .expect(200);
    expect(clearRes.body.deleted).toBeGreaterThanOrEqual(0);
  });
});

describe('Sync endpoints', () => {
  test('POST /api/sync', async () => {
    const { token } = await signupUser({ email: 'sync@example.com' });
    const res = await request(app)
      .post('/api/sync')
      .set(authHeader(token))
      .send({ items: [] })
      .expect(200);
    expect(res.body.applied).toBeDefined();
    expect(res.body.conflicts).toBeDefined();
    expect(res.body.serverSnapshot).toBeDefined();
  });
});

describe('Giving endpoints', () => {
  test('categories, summary, transactions', async () => {
    const { token } = await signupUser({ email: 'giving@example.com' });

    const categoriesRes = await request(app)
      .get('/api/giving/categories')
      .set(authHeader(token))
      .expect(200);
    expect(categoriesRes.body.categories.length).toBeGreaterThan(0);

    const summaryRes = await request(app)
      .get('/api/giving/summary')
      .set(authHeader(token))
      .expect(200);
    expect(summaryRes.body.totalGiven).toBeDefined();

    const transactionsRes = await request(app)
      .get('/api/giving/transactions')
      .set(authHeader(token))
      .expect(200);
    expect(Array.isArray(transactionsRes.body.transactions)).toBe(true);
  });

  test('payment intent, subscription, setup intent error when Stripe not configured', async () => {
    const { token } = await signupUser({ email: 'giving2@example.com' });

    await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 10, category: 'Tithe', type: 'One-Time' })
      .expect(500);

    await request(app)
      .post('/api/giving/subscription')
      .set(authHeader(token))
      .send({ amount: 10, category: 'Tithe', type: 'Monthly' })
      .expect(500);

    await request(app)
      .post('/api/giving/setup-intent')
      .set(authHeader(token))
      .expect(500);
  });

  test('webhook returns error without stripe secrets', async () => {
    await request(app)
      .post('/api/giving/webhook')
      .set('stripe-signature', 'test-signature')
      .send({})
      .expect(500);
  });
});

describe('Admin endpoints', () => {
  test('list users, summaries, update email', async () => {
    const admin = await signupUser({ email: 'admin2@example.com', role: 'admin' });
    const member = await signupUser({ email: 'member2@example.com' });

    const usersRes = await request(app)
      .get('/api/admin/users')
      .set(authHeader(admin.token))
      .expect(200);
    expect(usersRes.body.users.length).toBeGreaterThanOrEqual(2);

    const attendanceRes = await request(app)
      .get('/api/admin/attendance/summary')
      .set(authHeader(admin.token))
      .expect(200);
    expect(attendanceRes.body.totalCheckIns).toBeDefined();

    const eventsRes = await request(app)
      .get('/api/admin/events/summary')
      .set(authHeader(admin.token))
      .expect(200);
    expect(eventsRes.body.totalEvents).toBeDefined();

    const updateRes = await request(app)
      .patch(`/api/admin/users/${member.user.id}/email`)
      .set(authHeader(admin.token))
      .send({ email: 'member2-updated@example.com' })
      .expect(200);
    expect(updateRes.body.user.email).toBe('member2-updated@example.com');
  });
});
