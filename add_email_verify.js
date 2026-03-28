const fs = require('fs');
let c = fs.readFileSync('src/routes/auth.js', 'utf8');

const emailVerification = `
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
    res.status(500).json({ error: 'Failed to send verification email' });
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
`;

// Add before module.exports
c = c.replace('module.exports = router;', emailVerification + '\nmodule.exports = router;');
fs.writeFileSync('src/routes/auth.js', c, 'utf8');
console.log('Done');
