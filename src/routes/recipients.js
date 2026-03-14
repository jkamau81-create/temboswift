const express = require('express');
const pool = require('../db/pool');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM recipients WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ recipients: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list recipients' });
  }
});
router.post('/', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, delivery_method = 'mpesa', bank_name, bank_account } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({ error: 'full_name and phone are required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO recipients (user_id, full_name, phone, delivery_method, bank_name, bank_account) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, full_name, phone, delivery_method, bank_name || null, bank_account || null]
    );
    res.status(201).json({ recipient: rows[0] });
  } catch (err) {
    logger.error('Create recipient error', { error: err.message });
    res.status(500).json({ error: 'Failed to create recipient' });
  }
});
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM recipients WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Recipient not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete recipient' });
  }
});
module.exports = router;
