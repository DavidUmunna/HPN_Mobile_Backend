process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.USE_MEMORY_SESSION = 'true';
jest.setTimeout(30000);
