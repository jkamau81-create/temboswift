const express = require('express');
const pool = require('../db/pool');
const logger = require('../config/logger');
const router = express.Router();
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [users, transfers, volume] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT status, COUNT(*) as count FROM transfers GROUP BY status'),
      pool.query("SELECT COALESCE(SUM(amount_usd), 0) as total FROM transfers WHERE status = 'delivered'"),
    ]);
    const statusMap = {};
    transfers.rows.forEach(r => { statusMap[r.status] = parseInt(r.count); });
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalVolume: parseFloat(volume.rows[0].total),
      byStatus: statusMap,
      totalTransfers: transfers.rows.reduce((a, r) => a + parseInt(r.count), 0),
    });
  } catch (err) {
    logger.error('Admin stats error', { error: err.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
router.get('/transfers', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT t.*, u.email as user_email, u.full_name as user_name, r.full_name as recipient_name, r.phone as recipient_phone FROM transfers t JOIN users u ON u.id = t.user_id JOIN recipients r ON r.id = t.recipient_id ORDER BY t.created_at DESC LIMIT 200'
    );
    res.json({ transfers: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get transfers' });
  }
});
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, full_name, phone, kyc_status, created_at FROM users ORDER BY created_at DESC LIMIT 500'
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});
module.exports = router;
