const express = require('express');
const pool = require('../db/pool');
const stripeIdentity = require('../services/stripeIdentity');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { id: userId, email } = req.user;
    const { rows } = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (user.kyc_status === 'approved') {
      return res.json({ status: 'approved', message: 'KYC already verified' });
    }
    const session = await stripeIdentity.createVerificationSession(userId, 'https://app.temboswift.com');
    await pool.query('UPDATE users SET kyc_inquiry_id = $1, kyc_status = $2 WHERE id = $3', [session.sessionId, 'submitted', userId]);
    res.json({ sessionId: session.sessionId, clientSecret: session.clientSecret, url: session.url, status: 'submitted' });
  } catch (err) {
    logger.error('KYC start error', { error: err.message });
    res.status(500).json({ error: 'Failed to start KYC' });
  }
});
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT kyc_status, kyc_inquiry_id FROM users WHERE id = $1', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get KYC status' });
  }
});
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_IDENTITY_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    if (event.type === 'identity.verification_session.verified') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        await pool.query('UPDATE users SET kyc_status = $1 WHERE id = $2', ['approved', userId]);
        logger.info('KYC approved via Stripe Identity', { userId });
      }
    } else if (event.type === 'identity.verification_session.requires_input') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      if (userId) {
        await pool.query('UPDATE users SET kyc_status = $1 WHERE id = $2', ['rejected', userId]);
        logger.info('KYC rejected via Stripe Identity', { userId });
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('KYC webhook error', { error: err.message });
    res.status(500).json({ error: 'Webhook failed' });
  }
});
module.exports = router;
