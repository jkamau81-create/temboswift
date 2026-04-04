const axios = require('axios');
const crypto = require('crypto');

const ACCESS_KEY = process.env.RAPYD_ACCESS_KEY;
const SECRET_KEY = process.env.RAPYD_SECRET_KEY;
const BASE_URL = 'https://sandboxapi.rapyd.net';

function generateSignature(method, path, body, salt, timestamp) {
  const bodyString = body ? JSON.stringify(body) : '';
  const toSign = method.toLowerCase() + path + salt + timestamp + ACCESS_KEY + SECRET_KEY + bodyString;
  return Buffer.from(crypto.createHmac('sha256', SECRET_KEY).update(toSign).digest()).toString('base64');
}

async function rapydRequest(method, path, body = null) {
  const salt = crypto.randomBytes(12).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(method, path, body, salt, timestamp);

  const headers = {
    'Content-Type': 'application/json',
    'access_key': ACCESS_KEY,
    'salt': salt,
    'timestamp': timestamp,
    'signature': signature,
  };

  const res = await axios({
    method,
    url: BASE_URL + path,
    headers,
    data: body,
  });

  return res.data;
}

async function sendMpesaPayout(phone, amountKes, recipientName, transferId) {
  // Format phone - ensure it starts with +254
  let formattedPhone = phone.replace(/\s/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '+254' + formattedPhone.slice(1);
  if (!formattedPhone.startsWith('+')) formattedPhone = '+' + formattedPhone;

  const body = {
    amount: parseFloat(amountKes),
    currency: 'KES',
    payout_method_type: 'ke_mpesa',
    payout_method: {
      type: 'ke_mpesa',
      fields: {
        phone_number: formattedPhone,
      }
    },
    sender: {
      name: 'TemboSwift',
      country: 'US',
      currency: 'USD',
      entity_type: 'company',
    },
    beneficiary: {
      name: recipientName,
      country: 'KE',
    },
    description: `TemboSwift transfer ${transferId}`,
    merchant_reference_id: `ts_${transferId}_${Date.now()}`,
  };

  return await rapydRequest('post', '/v1/payouts', body);
}

async function getPayoutStatus(payoutId) {
  return await rapydRequest('get', `/v1/payouts/${payoutId}`);
}

module.exports = { sendMpesaPayout, getPayoutStatus };
