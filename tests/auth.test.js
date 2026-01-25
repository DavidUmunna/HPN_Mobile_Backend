const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Auth routes', () => {
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
});
