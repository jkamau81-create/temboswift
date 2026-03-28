const { Resend } = require('resend');
const logger = require('../config/logger');
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'TemboSwift <notifications@temboswift.com>';
async function sendTransferCreated({ to, name, amount_usd, amount_kes, recipient_name, fee_usd, rate }) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Your transfer of $${amount_usd} is being processed`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#006837;">Transfer Initiated 💸</h2>
          <p>Hi ${name},</p>
          <p>Your transfer has been created and is being processed.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">You sent</td><td style="text-align:right;font-weight:600;">$${amount_usd} USD</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Transfer fee</td><td style="text-align:right;">$${fee_usd}</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Exchange rate</td><td style="text-align:right;">1 USD = ${rate} KES</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Recipient</td><td style="text-align:right;font-weight:600;">${recipient_name}</td></tr>
            <tr><td style="padding:10px 0;color:#006837;font-weight:600;">Recipient gets</td><td style="text-align:right;color:#006837;font-weight:700;">KES ${parseInt(amount_kes).toLocaleString()}</td></tr>
          </table>
          <p style="color:#666;font-size:14px;">We will notify you once the money reaches your recipient.</p>
          <a href="https://temboswift.com" style="display:inline-block;background:#006837;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-weight:600;margin-top:16px;">View Transfer</a>
          <p style="color:#999;font-size:12px;margin-top:32px;">TemboSwift · Fast · Fair · Reliable</p>
        </div>
      `,
    });
    logger.info('Transfer created email sent', { to });
  } catch (err) {
    logger.error('Email send failed', { error: err.message });
  }
}
async function sendTransferDelivered({ to, name, amount_usd, amount_kes, recipient_name }) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Money delivered to ${recipient_name} ✅`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#006837;">Money Delivered! ✅</h2>
          <p>Hi ${name},</p>
          <p>Great news! Your transfer has been delivered successfully.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Amount sent</td><td style="text-align:right;font-weight:600;">$${amount_usd} USD</td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;">Recipient</td><td style="text-align:right;font-weight:600;">${recipient_name}</td></tr>
            <tr><td style="padding:10px 0;color:#006837;font-weight:600;">Amount delivered</td><td style="text-align:right;color:#006837;font-weight:700;">KES ${parseInt(amount_kes).toLocaleString()}</td></tr>
          </table>
          <p style="color:#666;font-size:14px;">The money has arrived in their M-Pesa wallet.</p>
          <a href="https://temboswift.com" style="display:inline-block;background:#006837;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-weight:600;margin-top:16px;">Send Another</a>
          <p style="color:#999;font-size:12px;margin-top:32px;">TemboSwift · Fast · Fair · Reliable</p>
        </div>
      `,
    });
    logger.info('Transfer delivered email sent', { to });
  } catch (err) {
    logger.error('Email send failed', { error: err.message });
  }
}
async function sendTransferFailed({ to, name, amount_usd, recipient_name, reason }) {
  try {
    await resend.emails.send({
      from: FROM, to,
      subject: `Transfer to ${recipient_name} failed`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#d00;">Transfer Failed ⚠️</h2>
          <p>Hi ${name},</p>
          <p>Unfortunately your transfer of $${amount_usd} to ${recipient_name} could not be completed.</p>
          <p style="background:#fff3f3;border-left:3px solid #d00;padding:12px 16px;color:#666;font-size:14px;">${reason || 'An error occurred during processing.'}</p>
          <p style="color:#666;font-size:14px;">Your payment has not been charged. Please try again or contact support.</p>
          <a href="https://temboswift.com" style="display:inline-block;background:#006837;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-weight:600;margin-top:16px;">Try Again</a>
          <p style="color:#999;font-size:12px;margin-top:32px;">Need help? Email us at support@temboswift.com</p>
        </div>
      `,
    });
    logger.info('Transfer failed email sent', { to });
  } catch (err) {
    logger.error('Email send failed', { error: err.message });
  }
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `https://temboswift-backend.onrender.com/api/auth/verify-email/${token}`;
  await resend.emails.send({
    from: 'notifications@temboswift.com',
    to: email,
    subject: 'Verify your TemboSwift email',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px">
        <img src="https://temboswift.com/logo.png" width="120" style="margin-bottom:24px"/>
        <h2 style="color:#0b5e35">Welcome to TemboSwift, ${name}!</h2>
        <p style="color:#666;font-size:15px">Please verify your email address to start sending money.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#0b5e35;color:#fff;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;margin:20px 0">
          Verify Email Address
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">TemboSwift · Fast · Secure · Transparent</p>
      </div>
    `
  });
}

module.exports = {
  sendVerificationEmail, sendTransferCreated, sendTransferDelivered, sendTransferFailed };
