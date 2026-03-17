const twilio = require('twilio');
const logger = require('../config/logger');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_PHONE_NUMBER;
async function sendTransferDeliveredSMS({ phone, recipientName, amountKes, senderName }) {
  try {
    const normalizedPhone = normalizePhone(phone);
    const message = `TemboSwift: ${senderName} has sent you KES ${parseInt(amountKes).toLocaleString()}. The money is now in your M-Pesa wallet. - TemboSwift.com`;
    await client.messages.create({
      body: message,
      from: FROM,
      to: normalizedPhone,
    });
    logger.info('SMS sent', { to: normalizedPhone });
  } catch (err) {
    logger.error('SMS send failed', { error: err.message, phone });
  }
}
async function sendTransferFailedSMS({ phone, recipientName, amountKes }) {
  try {
    const normalizedPhone = normalizePhone(phone);
    const message = `TemboSwift: A transfer of KES ${parseInt(amountKes).toLocaleString()} to you could not be completed. Please contact support@temboswift.com`;
    await client.messages.create({ body: message, from: FROM, to: normalizedPhone });
    logger.info('Failure SMS sent', { to: normalizedPhone });
  } catch (err) {
    logger.error('SMS send failed', { error: err.message });
  }
}
function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('+')) return phone;
  if (phone.startsWith('0')) return '+254' + phone.slice(1);
  if (phone.startsWith('254')) return '+' + phone;
  return '+254' + phone;
}
module.exports = { sendTransferDeliveredSMS, sendTransferFailedSMS };
