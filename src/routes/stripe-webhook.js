const express = require('express');
const pool = require('../db/pool');
const stripeService = require('../services/stripe');
const mpesa = require('../services/mpesa');
const { sendMpesaPayout } = require('../services/rapyd');
const compliance = require('../services/compliance');
const logger = require('../config/logger');
const router = express.Router();
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripeService.constructEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    logger.warn('Stripe webhook signature invalid', { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }
  logger.info('Stripe webhook received', { type: event.type });
  if (event.type === 'payment_intent.succeeded') {
    await handlePaymentSucceeded(event.data.object);
  } else if (event.type === 'payment_intent.payment_failed') {
    await handlePaymentFailed(event.data.object);
  }
  res.json({ received: true });
});
async function handlePaymentSucceeded(paymentIntent) {
  const transferId = paymentIntent.metadata.transfer_id;
  if (!transferId) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("UPDATE transfers SET status = 'funded', funded_at = NOW() WHERE id = $1 RETURNING *", [transferId]);
    if (!rows.length) return;
    const transfer = rows[0];
    const { rows: uRows } = await client.query('SELECT * FROM users WHERE id = $1', [transfer.user_id]);
    const { rows: rRows } = await client.query('SELECT * FROM recipients WHERE id = $1', [transfer.recipient_id]);
    const user = uRows[0];
    const recipient = rRows[0];
    await client.query("UPDATE transfers SET status = 'compliance_check' WHERE id = $1", [transferId]);
    await client.query('COMMIT');
    const compResult = await compliance.runChecks(transfer, user, recipient);
    if (compResult.blocked) {
      await pool.query("UPDATE transfers SET status = 'failed', compliance_passed = false, failure_reason = $1 WHERE id = $2", [`Blocked: ${compResult.reason}`, transferId]);
      return;
    }
    await pool.query("UPDATE transfers SET status = 'processing', compliance_passed = true WHERE id = $1", [transferId]);
    if (transfer.delivery_method === 'mpesa') {
      try {
        const payout = await mpesa.b2cPayout({ transferId, phoneNumber: recipient.phone, amountKes: transfer.amount_kes, remarks: `KenyaSend ${transferId.slice(0,8)}` });
        await pool.query('UPDATE transfers SET mpesa_conversation_id = $1 WHERE id = $2', [payout.conversationId, transferId]);
        logger.info('M-Pesa payout initiated', { transferId });
      } catch (mpesaErr) {
        await pool.query("UPDATE transfers SET status = 'failed', failure_reason = $1 WHERE id = $2", [`M-Pesa error: ${mpesaErr.message}`, transferId]);
      }
    }
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Payment succeeded handler error', { transferId, error: err.message });
  } finally {
    client.release();
  }
}
async function handlePaymentFailed(paymentIntent) {
  const transferId = paymentIntent.metadata.transfer_id;
  if (!transferId) return;
  await pool.query("UPDATE transfers SET status = 'failed', failure_reason = $1 WHERE id = $2", [paymentIntent.last_payment_error?.message || 'Payment failed', transferId]);
}
module.exports = router;
