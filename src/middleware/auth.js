const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, full_name, kyc_status FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
function requireKYC(req, res, next) {
  if (req.user.kyc_status !== 'approved') {
    return res.status(403).json({
      error: 'KYC verification required',
      kyc_status: req.user.kyc_status,
    });
  }
  next();
}
module.exports = { requireAuth, requireKYC };
