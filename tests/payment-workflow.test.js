const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const stripeMock = {
  paymentIntents: {
    create: jest.fn(),
    cancel: jest.fn(),
    retrieve: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  setupIntents: {
    create: jest.fn(),
  },
  customers: {
    create: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn(function Stripe() {
    return stripeMock;
  });
});

jest.mock('../src/utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
}));

jest.mock('../src/services/pushNotificationService', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
  sendPushToUsers: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
  sendPushToTokens: jest.fn().mockResolvedValue({ delivered: 0, failed: 0 }),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

const app = require('../src/app');
const Donation = require('../src/models/Donation');

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
  jest.clearAllMocks();
});

describe('Payment workflow', () => {
  test('creates a one-time payment intent and records a pending donation', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_secret_123',
    });

    const { token } = await signupUser({ email: 'payment-intent@example.com' });
    const res = await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 25, category: 'Tithe', type: 'One-Time' })
      .expect(201);

    expect(res.body.clientSecret).toBe('pi_test_secret_123');
    expect(res.body.paymentIntentId).toBe('pi_test_123');
    expect(res.body.donationId).toBeTruthy();

    const donation = await Donation.findById(res.body.donationId).lean();
    expect(donation).toBeTruthy();
    expect(donation.status).toBe('pending');
    expect(donation.paymentIntentId).toBe('pi_test_123');
    expect(donation.type).toBe('One-Time');
  });

  test('cancels a pending payment intent and marks the donation cancelled', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_cancel_123',
      client_secret: 'pi_cancel_secret_123',
    });
    stripeMock.paymentIntents.cancel.mockResolvedValue({ id: 'pi_cancel_123', status: 'canceled' });

    const { token } = await signupUser({ email: 'payment-cancel@example.com' });
    const intentRes = await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 40, category: 'Missions', type: 'One-Time' })
      .expect(201);

    const cancelRes = await request(app)
      .post('/api/giving/intent/cancel')
      .set(authHeader(token))
      .send({ paymentIntentId: intentRes.body.paymentIntentId })
      .expect(200);

    expect(cancelRes.body).toEqual({ cancelled: true, status: 'cancelled' });

    const donation = await Donation.findById(intentRes.body.donationId).lean();
    expect(donation.status).toBe('cancelled');
  });

  test('payment intent status endpoint updates a pending donation to succeeded', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_status_123',
      client_secret: 'pi_status_secret_123',
    });
    stripeMock.paymentIntents.retrieve.mockResolvedValue({
      id: 'pi_status_123',
      status: 'succeeded',
    });

    const { token } = await signupUser({ email: 'payment-status@example.com' });
    const intentRes = await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 55, category: 'Building', type: 'One-Time' })
      .expect(201);

    const statusRes = await request(app)
      .get(`/api/giving/payment-intents/${intentRes.body.paymentIntentId}/status`)
      .set(authHeader(token))
      .expect(200);

    expect(statusRes.body.status).toBe('succeeded');
    expect(statusRes.body.donation.amount).toBe(55);
    expect(statusRes.body.donation.status).toBe('succeeded');

    const donation = await Donation.findById(intentRes.body.donationId).lean();
    expect(donation.status).toBe('succeeded');
  });

  test('webhook marks a payment intent as succeeded and exposes it in transactions', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_webhook_123',
      client_secret: 'pi_webhook_secret_123',
    });
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_webhook_123',
        },
      },
    });

    const { token } = await signupUser({ email: 'payment-webhook@example.com' });
    await request(app)
      .post('/api/giving/intent')
      .set(authHeader(token))
      .send({ amount: 70, category: 'Special', type: 'One-Time' })
      .expect(201);

    await request(app)
      .post('/api/giving/webhook')
      .set('stripe-signature', 'sig_test_123')
      .set('Content-Type', 'application/json')
      .send(Buffer.from(JSON.stringify({ id: 'evt_test_123' })))
      .expect(200);

    const transactionsRes = await request(app)
      .get('/api/giving/transactions')
      .set(authHeader(token))
      .expect(200);

    expect(transactionsRes.body.transactions).toHaveLength(1);
    expect(transactionsRes.body.transactions[0].status).toBe('succeeded');
    expect(transactionsRes.body.transactions[0].amount).toBe(70);
  });
});