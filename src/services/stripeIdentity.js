const Stripe = require('stripe');
const logger = require('../config/logger');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function createVerificationSession(userId, returnUrl) {
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        require_matching_selfie: true,
        allowed_types: ['driving_license', 'id_card', 'passport'],
      },
    },
    return_url: returnUrl || 'https://app.temboswift.com',
    metadata: { user_id: userId },
  });
  logger.info('Stripe Identity session created', { sessionId: session.id, userId });
  return {
    sessionId: session.id,
    clientSecret: session.client_secret,
    url: session.url,
  };
}
async function getVerificationSession(sessionId) {
  const session = await stripe.identity.verificationSessions.retrieve(sessionId);
  return {
    sessionId: session.id,
    status: session.status,
    userId: session.metadata?.user_id,
  };
}
function mapStatus(stripeStatus) {
  const map = {
    verified:       'approved',
    processing:     'submitted',
    requires_input: 'pending',
    canceled:       'rejected',
  };
  return map[stripeStatus] || 'pending';
}
module.exports = { createVerificationSession, getVerificationSession, mapStatus };
