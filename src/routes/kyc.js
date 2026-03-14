const express = require('express');
const pool = require('../db/pool');
const persona = require('../services/persona');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { id: userId, email } = req.user;
    const { rows } = await pool.query('SELECT kyc_inquiry_id, kyc_status FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (user.kyc_status === 'approved') {
      return res.json({ status: 'approved', message: 'KYC already verified' });
    }
    if (user.kyc_inquiry_id) {
      const inquiry = await persona.getInquiry(user.kyc_inquiry_id);
      if (inquiry.status !== 'expired' && inquiry.status !== 'failed') {
        return res.json({ inquiryId: inquiry.inquiryId, status: inquiry.status, message: 'Existing inquiry found' });
      }
    }
    const inquiry = await persona.createInquiry(userId, email);
    await pool.query('UPDATE users SET kyc_inquiry_id = $1, kyc_status = $2 WHERE id = $3', [inquiry.inquiryId, 'submitted', userId]);
    res.json({ inquiryId: inquiry.inquiryId, sessionToken: inquiry.sessionToken, status: 'submitted' });
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
    const sig = req.headers['x-persona-signature'];
    const body = JSON.parse(req.body);
    if (!persona.verifyWebhook(body, sig)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const { type, data } = body;
    if (type === 'inquiry.completed' || type === 'inquiry.approved' || type === 'inquiry.failed' || type === 'inquiry.declined') {
      const kycStatus = persona.mapStatus(data.attributes.status);
      await pool.query('UPDATE users SET kyc_status = $1 WHERE kyc_inquiry_id = $2', [kycStatus, data.id]);
      logger.info('KYC status updated', { inquiryId: data.id, kycStatus });
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('Persona webhook error', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
module.exports = router;
