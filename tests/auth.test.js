const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const { signAuthToken } = require('../src/utils/jwt');

let mongoServer;

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

describe('Auth routes', () => {
  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  test('signup and fetch profile', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123', name: 'Tester' })
      .expect(201);
    expect(signupRes.body.user.email).toBe('test@example.com');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.token}`)
      .expect(200);
    expect(meRes.body.user.email).toBe('test@example.com');
  });

  test('complete onboarding updates profile', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'onboard@example.com', password: 'password123', name: 'Onboard' })
      .expect(201);

    const patchRes = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.token}`)
      .send({ isonboarded: true })
      .expect(200);
    expect(patchRes.body.user.isOnboarded).toBe(true);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signupRes.body.token}`)
      .expect(200);
    expect(meRes.body.user.isOnboarded).toBe(true);
  });

  test('complete onboarding updates profile when legacy timestamp objects exist', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    const result = await mongoose.connection.collection('users').insertOne({
      email: 'legacy-onboard@example.com',
      passwordHash,
      name: 'Legacy User',
      role: 'member',
      isOnboarded: false,
      createdAt: { $date: '2026-01-18T15:50:17.800Z' },
      updatedAt: { $date: '2026-01-18T15:50:17.800Z' },
    });

    const user = await User.findById(result.insertedId);
    const token = signAuthToken(user);

    const patchRes = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ isOnboarded: true })
      .expect(200);

    expect(patchRes.body.user.isOnboarded).toBe(true);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.user.email).toBe('legacy-onboard@example.com');
    expect(meRes.body.user.isOnboarded).toBe(true);
  });

  test('reset password accepts token from query string', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ email: 'reset-query@example.com', password: 'password123', name: 'Reset Query' })
      .expect(201);

    await request(app)
      .post('/api/auth/reset-password?token=badtoken')
      .send({ password: 'newpassword123' })
      .expect(400);
  });
});
