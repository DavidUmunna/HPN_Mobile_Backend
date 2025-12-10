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
  const agent = request.agent(app);

  test('signup and fetch profile', async () => {
    const signupRes = await agent
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'password123', name: 'Tester' })
      .expect(201);
    expect(signupRes.body.user.email).toBe('test@example.com');

    const meRes = await agent.get('/api/auth/me').expect(200);
    expect(meRes.body.user.email).toBe('test@example.com');
  });
});
