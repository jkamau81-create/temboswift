const express = require('express');
const pool = require('../db/pool');
const fxService = require('../services/fx');
const stripeService = require('../services/stripe');
const compliance = require('../services/compliance');
const logger = require('../config/logger');
const { requireAuth, requireKYC } = require('../middleware/auth');
const router = express.Router();
router.get('/quote', requireAuth, async (req, res) => {
  try {
    const amount = parseFloat(req.query.amount);
    if (!amount || amount < 5) return res.status(400).json({ error: 'Minimum transfer is $5' });
    if (amount > 10000) return res.status(400).json({ error: 'Maximum single transfer is $10,000' });
    const quote = await fxService.getQuote(amount);
    res.json(quote);
  } catch (err) {
    logger.error('Quote error', { error: err.message });
    res.status(500).json({ error: 'Failed to get quote' });
  }
});
router.post('/', requireAuth, requireKYC, async (req, res) => {
  const client = await pool.connect();
  try {
    const { recipient_id, amount_usd } = req.body;
    if (!recipient_id || !amount_usd) return res.status(400).json({ error: 'recipient_id and amount_usd required' });
    const { rows: rRows } = await client.query('SELECT * FROM recipients WHERE id = $1 AND user_id = $2', [recipient_id, req.user.id]);
    if (!rRows.length) return res.status(404).json({ error: 'Recipient not found' });
    const recipient = rRows[0];
    const quote = await fxService.getQuote(parseFloat(amount_usd));
    await client.query('BEGIN');
    const { rows: tRows } = await client.query(
      'INSERT INTO transfers (user_id, recipient_id, amount_usd, fee_usd, fx_rate, amount_kes, delivery_method) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, recipient_id, quote.amount_usd, quote.fee_usd, quote.client_rate, quote.amount_kes, recipient.delivery_method]
    );
    const transfer = tRows[0];
    const { paymentIntentId, clientSecret } = await stripeService.createPaymentIntent({
      transferId: transfer.id,
      userId: req.user.id,
      email: req.user.email,
      name: req.user.full_name,
      amountUsd: quote.amount_usd,
    });
    await client.query('UPDATE transfers SET stripe_payment_intent_id = $1 WHERE id = $2', [paymentIntentId, transfer.id]);
    await client.query('COMMIT');
    logger.info('Transfer created', { transferId: transfer.id });
    res.status(201).json({ transfer: { ...transfer, stripe_payment_intent_id: paymentIntentId }, quote, clientSecret });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Create transfer error', { error: err.message });
    res.status(500).json({ error: 'Failed to create transfer' });
  } finally {
    client.release();
  }
});
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.*, r.full_name as recipient_name, r.phone as recipient_phone, r.delivery_method, r.bank_name FROM transfers t JOIN recipients r ON r.id = t.recipient_id WHERE t.user_id = $1 ORDER BY t.created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ transfers: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list transfers' });
  }
});
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.*, r.full_name as recipient_name, r.phone as recipient_phone FROM transfers t JOIN recipients r ON r.id = t.recipient_id WHERE t.id = $1 AND t.user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transfer not found' });
    const { rows: checks } = await pool.query('SELECT check_type, result, checked_at FROM compliance_checks WHERE transfer_id = $1', [req.params.id]);
    res.json({ transfer: rows[0], compliance: checks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get transfer' });
  }
});
module.exports = router;
