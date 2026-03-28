const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');
const twilio = require('twilio');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'email, password and full_name are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, phone, kyc_status, created_at',
      [email.toLowerCase(), password_hash, full_name, phone || null]
    );
    const user = rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, kyc_status: user.kyc_status, address: user.address, date_of_birth: user.date_of_birth, phone_verified: user.phone_verified } });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, full_name, phone, kyc_status, address, date_of_birth, phone_verified FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: rows[0] });
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { full_name, address, date_of_birth } = req.body;
    const { rows } = await pool.query(
      'UPDATE users SET full_name = COALESCE($1, full_name), address = COALESCE($2, address), date_of_birth = COALESCE($3, date_of_birth), updated_at = NOW() WHERE id = $4 RETURNING id, email, full_name, phone, kyc_status, address, date_of_birth, phone_verified',
      [full_name || null, address || null, date_of_birth || null, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/phone/send-otp', requireAuth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query('UPDATE users SET phone = $1, phone_otp = $2, phone_otp_expires = $3 WHERE id = $4', [phone, otp, expires, req.user.id]);
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ body: `Your TemboSwift verification code is: ${otp}`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
    res.json({ message: 'OTP sent' });
  } catch (err) {
    logger.error('OTP send error', { error: err.message });
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/phone/verify-otp', requireAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    const { rows } = await pool.query('SELECT phone_otp, phone_otp_expires FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];
    if (!user.phone_otp || user.phone_otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.phone_otp_expires)) return res.status(400).json({ error: 'OTP expired' });
    await pool.query('UPDATE users SET phone_verified = TRUE, phone_otp = NULL, phone_otp_expires = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: 'Phone verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});


// Send verification email
router.post('/send-verification', requireAuth, async (req, res) => {
  try {
    const token = Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.query(
      'UPDATE users SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3',
      [token, expires, req.user.id]
    );
    const { sendVerificationEmail } = require('../services/email');
    await sendVerificationEmail(req.user.email, req.user.full_name, token);
    res.json({ success: true, message: 'Verification email sent' });
  } catch (err) {
    console.error('Send verification error:', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Verify email token
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email_verify_token = $1 AND email_verify_expires > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).send('<h2>Invalid or expired link. Please request a new one.</h2>');
    await pool.query(
      'UPDATE users SET email_verified = true, email_verify_token = NULL, email_verify_expires = NULL WHERE id = $1',
      [rows[0].id]
    );
    res.send('<h2 style="font-family:sans-serif;color:#0b5e35;text-align:center;margin-top:100px">✅ Email verified! You can now close this tab and return to the app.</h2>');
  } catch (err) {
    res.status(500).send('<h2>Something went wrong. Please try again.</h2>');
  }
});

module.exports = router;
