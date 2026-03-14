const axios = require('axios');
const logger = require('../config/logger');
const BASE = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
async function getToken() {
  const creds = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const resp = await axios.get(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  return resp.data.access_token;
}
async function b2cPayout({ transferId, phoneNumber, amountKes, remarks }) {
  const token = await getToken();
  const phone = normalizePhone(phoneNumber);
  const payload = {
    InitiatorName: 'KenyaSendAPI',
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    CommandID: 'BusinessPayment',
    Amount: Math.round(amountKes),
    PartyA: process.env.MPESA_SHORTCODE,
    PartyB: phone,
    Remarks: remarks || `Transfer ${transferId}`,
    QueueTimeOutURL: `${process.env.CALLBACK_BASE_URL}/api/mpesa/timeout`,
    ResultURL: `${process.env.CALLBACK_BASE_URL}/api/mpesa/result`,
    Occasion: transferId,
  };
  const resp = await axios.post(`${BASE}/mpesa/b2c/v3/paymentrequest`, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  logger.info('M-Pesa B2C initiated', { transferId, phone, amountKes, conversationId: resp.data.ConversationID });
  if (resp.data.ResponseCode !== '0') {
    throw new Error(`M-Pesa B2C failed: ${resp.data.ResponseDescription}`);
  }
  return {
    conversationId: resp.data.ConversationID,
    originatorConversationId: resp.data.OriginatorConversationID,
    responseDescription: resp.data.ResponseDescription,
  };
}
function parseB2CResult(body) {
  const result = body.Result;
  const code = result.ResultCode;
  const desc = result.ResultDesc;
  const convId = result.ConversationID;
  const occasion = result.ReferenceData?.ReferenceItem?.Value;
  let transactionId = null;
  if (result.ResultParameters?.ResultParameter) {
    const params = Array.isArray(result.ResultParameters.ResultParameter)
      ? result.ResultParameters.ResultParameter
      : [result.ResultParameters.ResultParameter];
    const txParam = params.find(p => p.Key === 'TransactionID');
    if (txParam) transactionId = txParam.Value;
  }
  return {
    success: code === 0,
    resultCode: code,
    resultDesc: desc,
    conversationId: convId,
    transactionId,
    transferId: occasion,
  };
}
function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (phone.startsWith('+254')) return phone.slice(1);
  if (phone.startsWith('0')) return '254' + phone.slice(1);
  if (phone.startsWith('254')) return phone;
  return '254' + phone;
}
module.exports = { getToken, b2cPayout, parseB2CResult, normalizePhone };
