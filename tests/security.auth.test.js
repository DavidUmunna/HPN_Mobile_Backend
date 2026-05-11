const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

let mongoServer;

// ── DB lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  process.env.MONGO_URI = uri;
  process.env.CLIENT_ORIGIN = 'http://localhost:3000';
  process.env.JWT_SECRET = 'test-jwt-secret';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedUser({ email, password, role = 'member' } = {}) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, name: 'Test User', role });
  return user;
}

function makeExpiredToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 200 and a JWT token on successful login', async () => {
    await seedUser({ email: 'valid@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'valid@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('valid@example.com');
  });

  it('returns 401 when the password is wrong', async () => {
    await seedUser({ email: 'user@example.com', password: 'correctpassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('returns 401 when the email does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ── Protected routes ──────────────────────────────────────────────────────────

describe('GET /api/auth/me (protected route)', () => {
  it('returns 401 when no Authorization token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 when an expired token is provided', async () => {
    const user = await seedUser({ email: 'expired@example.com', password: 'password123' });
    const expiredToken = makeExpiredToken(user);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  it('returns 401 when a malformed token is provided', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.token');

    expect(res.status).toBe(401);
  });

  it('returns 200 with user data when a valid token is provided', async () => {
    await seedUser({ email: 'authed@example.com', password: 'password123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'authed@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('authed@example.com');
  });
});

// ── Admin route authorisation ─────────────────────────────────────────────────

describe('GET /api/admin/users (admin-only route)', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(401);
  });

  it('returns 403 when a member role user tries to access an admin route', async () => {
    await seedUser({ email: 'member@example.com', password: 'password123', role: 'member' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(403);
  });

  it('returns 403 when a staff role user tries to access an admin route', async () => {
    await seedUser({ email: 'staff@example.com', password: 'password123', role: 'staff' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 when an admin user accesses an admin route', async () => {
    await seedUser({ email: 'admin@example.com', password: 'password123', role: 'admin' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'password123' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toBeDefined();
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe('POST /api/auth/login — rate limiting', () => {
  it('returns 429 after exceeding the login attempt limit from the same IP', async () => {
    // Use a unique spoofed IP so this test does not share state with others.
    // app has trust proxy:1 so X-Forwarded-For is respected.
    const testIp = '10.0.0.99';

    // Fire 10 failing attempts (the loginLimiter max is 10)
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', testIp)
        .send({ email: 'ratelimit@example.com', password: 'wrongpassword' });
    }

    // The 11th request should be blocked
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', testIp)
      .send({ email: 'ratelimit@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(429);
  });
});
