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

describe('Security: authentication', () => {
  test('protected routes require auth', async () => {
    const protectedRoutes = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'post', path: '/api/auth/logout' },
      { method: 'post', path: '/api/attendance/check-in', body: { latitude: 1, longitude: 2 } },
      { method: 'get', path: '/api/attendance' },
      { method: 'get', path: '/api/events' },
      { method: 'post', path: '/api/events', body: { title: 'Event', startTime: new Date().toISOString() } },
      { method: 'get', path: '/api/prayers' },
      { method: 'post', path: '/api/prayers', body: { request: 'Please pray.' } },
      { method: 'get', path: '/api/notifications' },
      { method: 'post', path: '/api/notifications', body: { title: 'Hello', body: 'World' } },
      {
        method: 'post',
        path: '/api/notifications/push-tokens',
        body: { token: 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]', platform: 'android' },
      },
      { method: 'post', path: '/api/sync', body: { items: [] } },
      { method: 'get', path: '/api/giving/summary' },
      { method: 'get', path: '/api/admin/users' },
    ];

    for (const route of protectedRoutes) {
      const req = request(app)[route.method](route.path);
      if (route.body) req.send(route.body);
      await req.expect(401);
    }
  });

  test('invalid bearer tokens are rejected', async () => {
    await request(app)
      .get('/api/auth/me')
      .set(authHeader('not-a-valid-token'))
      .expect(401);
  });
});

describe('Security: authorization', () => {
  test('non-admin users cannot access admin endpoints', async () => {
    const member = await signupUser({ email: makeEmail('member'), role: 'member' });

    await request(app).get('/api/admin/users').set(authHeader(member.token)).expect(403);

    await request(app).get('/api/admin/events/summary').set(authHeader(member.token)).expect(403);
  });

  test('non-admin users cannot delete notifications', async () => {
    const member = await signupUser({ email: makeEmail('member-notify'), role: 'member' });
    const fakeId = '507f1f77bcf86cd799439011';

    await request(app)
      .delete(`/api/notifications/${fakeId}`)
      .set(authHeader(member.token))
      .expect(403);
  });

  test('users cannot delete other users comments', async () => {
    const author = await signupUser({ email: makeEmail('author') });
    const other = await signupUser({ email: makeEmail('other') });

    const prayerRes = await request(app)
      .post('/api/prayers')
      .set(authHeader(author.token))
      .send({ request: 'Please pray.' })
      .expect(201);

    const commentRes = await request(app)
      .post(`/api/prayers/${prayerRes.body.prayer.id}/comments`)
      .set(authHeader(author.token))
      .send({ body: 'Amen.' })
      .expect(201);

    await request(app)
      .delete(`/api/prayers/${prayerRes.body.prayer.id}/comments/${commentRes.body.comment.id}`)
      .set(authHeader(other.token))
      .expect(403);
  });
});

describe('Security: push tokens', () => {
  test('invalid Expo tokens are rejected', async () => {
    const { token } = await signupUser({ email: makeEmail('push-invalid') });

    await request(app)
      .post('/api/notifications/push-tokens')
      .set(authHeader(token))
      .send({ token: 'invalid-token', platform: 'android' })
      .expect(400);
  });

  test('users cannot unregister tokens they do not own', async () => {
    const owner = await signupUser({ email: makeEmail('push-owner') });
    const other = await signupUser({ email: makeEmail('push-other') });
    const expoToken = 'ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

    await request(app)
      .post('/api/notifications/push-tokens')
      .set(authHeader(owner.token))
      .send({ token: expoToken, platform: 'android' })
      .expect(201);

    await request(app)
      .delete('/api/notifications/push-tokens')
      .set(authHeader(other.token))
      .send({ token: expoToken })
      .expect(404);
  });
});
