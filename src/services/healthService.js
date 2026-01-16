const os = require('os');
const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}

function getProcessMetrics() {
  const memory = process.memoryUsage();
  return {
    pid: process.pid,
    node: process.version,
    uptime: formatUptime(process.uptime()),
    memory,
  };
}

function getSystemMetrics() {
  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.release()}`,
    cpuCount: os.cpus().length,
    loadAvg: os.loadavg(),
    uptime: formatUptime(os.uptime()),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
  };
}

async function checkMongo() {
  const state = mongoose.connection.readyState;
  const label = READY_STATE_LABELS[state] || 'unknown';
  const status = state === 1 ? 'ok' : state === 2 ? 'warn' : 'fail';
  const result = {
    name: 'MongoDB',
    status,
    details: { state: label },
  };

  if (state !== 1 || !mongoose.connection.db) {
    if (!mongoose.connection.db) {
      result.details.note = 'no database handle';
    }
    return result;
  }

  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    result.details.pingMs = Date.now() - start;
  } catch (err) {
    result.status = 'fail';
    result.details.error = err.message;
  }

  return result;
}

async function checkRedis() {
  if (!process.env.REDIS_URL) {
    return {
      name: 'Redis',
      status: 'warn',
      details: { state: 'not-configured' },
    };
  }

  let client;
  try {
    client = getRedisClient();
  } catch (err) {
    return {
      name: 'Redis',
      status: 'fail',
      details: { state: 'not-initialized', error: err.message },
    };
  }

  const result = {
    name: 'Redis',
    status: client.isOpen ? 'ok' : 'fail',
    details: { state: client.isOpen ? 'connected' : 'disconnected' },
  };

  if (client.isOpen) {
    const start = Date.now();
    try {
      await client.ping();
      result.details.pingMs = Date.now() - start;
    } catch (err) {
      result.status = 'fail';
      result.details.error = err.message;
    }
  }

  return result;
}

function computeOverallStatus(services) {
  if (services.some((service) => service.status === 'fail')) return 'fail';
  if (services.some((service) => service.status === 'warn')) return 'warn';
  return 'ok';
}

async function getHealthReport() {
  const services = await Promise.all([checkMongo(), checkRedis()]);
  const status = computeOverallStatus(services);

  return {
    status,
    generatedAt: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    process: getProcessMetrics(),
    system: getSystemMetrics(),
    services,
  };
}

module.exports = {
  getHealthReport,
};
