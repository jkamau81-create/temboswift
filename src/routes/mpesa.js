const express = require('express');
const pool = require('../db/pool');
const mpesa = require('../services/mpesa');
const logger = require('../config/logger');
const email = require('../services/email');
const email = require('../services/email');
const router = express.Router();
router.post('/result', async (req, res) => {
  try {
    logger.info('M-Pesa B2C result received');
    const parsed = mpesa.parseB2CResult(req.body);
    const { conversationId, success, transactionId, resultDesc } = parsed;
    if (success) {
      await pool.query(
        "UPDATE transfers SET status = 'delivered', mpesa_transaction_id = $1, delivered_at = NOW(), updated_at = NOW() WHERE mpesa_conversation_id = $2",
        [transactionId, conversationId]
      );
      pool.query('SELECT u.email, u.full_name, t.amount_usd, t.amount_kes, r.full_name as recipient_name FROM transfers t JOIN users u ON u.id=t.user_id JOIN recipients r ON r.id=t.recipient_id WHERE t.mpesa_conversation_id=\',[conversationId]).then(({rows})=>{ if(rows[0]) email.sendTransferDelivered({to:rows[0].email,name:rows[0].full_name,amount_usd:rows[0].amount_usd,amount_kes:rows[0].amount_kes,recipient_name:rows[0].recipient_name}).catch(()=>{}); }).catch(()=>{});
      pool.query('SELECT u.email, u.full_name, t.amount_usd, t.amount_kes, r.full_name as recipient_name FROM transfers t JOIN users u ON u.id=t.user_id JOIN recipients r ON r.id=t.recipient_id WHERE t.mpesa_conversation_id=\',[conversationId]).then(({rows})=>{ if(rows[0]) email.sendTransferDelivered({to:rows[0].email,name:rows[0].full_name,amount_usd:rows[0].amount_usd,amount_kes:rows[0].amount_kes,recipient_name:rows[0].recipient_name}).catch(()=>{}); }).catch(()=>{});
      logger.info('M-Pesa payout delivered', { conversationId, transactionId });
    } else {
      await pool.query(
        "UPDATE transfers SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE mpesa_conversation_id = $2",
        [resultDesc, conversationId]
      );
      logger.warn('M-Pesa payout failed', { conversationId, resultDesc });
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    logger.error('M-Pesa result handler error', { error: err.message });
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});
router.post('/timeout', async (req, res) => {
  try {
    const conversationId = req.body && req.body.ConversationID;
    if (conversationId) {
      await pool.query(
        "UPDATE transfers SET status = 'failed', failure_reason = 'M-Pesa timeout' WHERE mpesa_conversation_id = $1 AND status = 'processing'",
        [conversationId]
      );
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});
router.get('/status/:transferId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, status, mpesa_conversation_id, mpesa_transaction_id, amount_kes, delivered_at, failure_reason FROM transfers WHERE id = $1',
      [req.params.transferId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Transfer not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Status check failed' });
  }
});
module.exports = router;
