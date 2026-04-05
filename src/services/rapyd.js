require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

const ACCESS_KEY = process.env.RAPYD_ACCESS_KEY;
const SECRET_KEY = process.env.RAPYD_SECRET_KEY;
const BASE_URL = 'https://sandboxapi.rapyd.net';

function generateSignature(method, path, salt, timestamp, body) {
  const bodyString = body ? JSON.stringify(body) : '';
  const toSign = method.toLowerCase() + path + salt + timestamp + ACCESS_KEY + SECRET_KEY + bodyString;
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(toSign).digest('hex');
  return Buffer.from(hash).toString('base64');
}

async function rapydRequest(method, path, body = null) {
  const salt = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(method, path, salt, timestamp, body);
  const headers = {
    'Content-Type': 'application/json',
    'access_key': ACCESS_KEY,
    'salt': salt,
    'timestamp': timestamp,
    'signature': signature,
  };
  try {
    const res = await axios({ method, url: BASE_URL + path, headers, data: body ? JSON.stringify(body) : undefined });
    return res.data;
  } catch(e) {
    const msg = e.response?.data?.status?.message || e.message;
    throw new Error('Rapyd error: ' + msg + '\nDetails: ' + JSON.stringify(e.response?.data, null, 2));
  }
}

async function sendMpesaPayout(phone, amountKes, recipientName, transferId) {
  let p = phone.replace(/\s/g, '');
  if (p.startsWith('0')) p = '+254' + p.slice(1);
  if (!p.startsWith('+')) p = '+' + p;

  const body = {
    payout_method_type: 'ke_general_bank',
    sender_currency: 'USD',
    sender_country: 'US',
    sender_entity_type: 'company',
    payout_currency: 'KES',
    beneficiary_country: 'KE',
    beneficiary_entity_type: 'individual',
    payout_amount: parseFloat(amountKes),
    sender: {
      name: 'TemboSwift Inc',
      country: 'US',
      currency: 'USD',
      entity_type: 'company',
      identification_type: 'company_registered_number',
      identification_value: 'TS2026001'
    },
    beneficiary: {
      name: recipientName,
      country: 'KE',
      currency: 'KES',
      phone_number: p
    },
    payout_method: {
      type: 'ke_mpesa',
      fields: {
        phone_number: p
      }
    },
    description: 'TemboSwift transfer ' + transferId,
    merchant_reference_id: 'ts_' + Date.now()
  };

  console.log('RAPYD BODY:');
  console.log(JSON.stringify(body, null, 2));

  return await rapydRequest('post', '/v1/payouts', body);
}

async function getPayoutStatus(payoutId) {
  return await rapydRequest('get', '/v1/payouts/' + payoutId);
}

module.exports = { sendMpesaPayout, getPayoutStatus, rapydRequest };
