const express = require('express');
const Stripe = require('stripe');
const pool = require('../db/pool');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stripe_payment_method_id, card_last4, card_brand, card_exp_month, card_exp_year FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user.stripe_payment_method_id) return res.json({ card: null });
    res.json({ card: { payment_method_id: user.stripe_payment_method_id, last4: user.card_last4, brand: user.card_brand, exp_month: user.card_exp_month, exp_year: user.card_exp_year } });
  } catch (err) { res.status(500).json({ error: 'Failed to get card' }); }
});
router.post('/setup', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    let customerId = rows[0].stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: req.user.full_name, metadata: { user_id: req.user.id } });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
    }
    const setupIntent = await stripe.setupIntents.create({ customer: customerId, payment_method_types: ['card'], usage: 'off_session' });
    res.json({ client_secret: setupIntent.client_secret, customer_id: customerId });
  } catch (err) {
    logger.error('Setup intent error', { error: err.message });
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { payment_method_id } = req.body;
    const pm = await stripe.paymentMethods.retrieve(payment_method_id);
    await pool.query('UPDATE users SET stripe_payment_method_id = $1, card_last4 = $2, card_brand = $3, card_exp_month = $4, card_exp_year = $5 WHERE id = $6', [payment_method_id, pm.card.last4, pm.card.brand, pm.card.exp_month, pm.card.exp_year, req.user.id]);
    res.json({ success: true, card: { last4: pm.card.last4, brand: pm.card.brand, exp_month: pm.card.exp_month, exp_year: pm.card.exp_year } });
  } catch (err) { res.status(500).json({ error: 'Failed to save card' }); }
});
router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET stripe_payment_method_id = NULL, card_last4 = NULL, card_brand = NULL, card_exp_month = NULL, card_exp_year = NULL WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to remove card' }); }
});
module.exports = router;
