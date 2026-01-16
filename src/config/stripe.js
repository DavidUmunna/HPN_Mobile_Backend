let stripeClient = null;

function getStripe() {
  if (stripeClient) return stripeClient;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  // Lazy-load stripe to avoid dependency overhead when not configured
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  stripeClient = new Stripe(secret, { apiVersion: '2023-10-16' });
  return stripeClient;
}

module.exports = { getStripe };
