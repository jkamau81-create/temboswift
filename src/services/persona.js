const axios = require('axios');
const logger = require('../config/logger');
const BASE = 'https://withpersona.com/api/v1';
const client = axios.create({
  baseURL: BASE,
  headers: {
    'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
    'Persona-Version': '2023-01-05',
    'Content-Type': 'application/json',
  },
});
async function createInquiry(userId, email) {
  const resp = await client.post('/inquiries', {
    data: {
      attributes: {
        'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
        'reference-id': userId,
        fields: { email_address: { value: email } },
      },
    },
  });
  const inquiry = resp.data.data;
  logger.info('Persona inquiry created', { inquiryId: inquiry.id, userId });
  return {
    inquiryId: inquiry.id,
    sessionToken: inquiry.attributes['session-token'],
    status: inquiry.attributes.status,
  };
}
async function getInquiry(inquiryId) {
  const resp = await client.get(`/inquiries/${inquiryId}`);
  const inq = resp.data.data;
  return {
    inquiryId: inq.id,
    status: inq.attributes.status,
    referenceId: inq.attributes['reference-id'],
  };
}
function verifyWebhook(payload, sigHeader) {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', process.env.PERSONA_WEBHOOK_SECRET);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');
  return sigHeader === expected;
}
function mapStatus(personaStatus) {
  const map = {
    completed: 'approved',
    approved: 'approved',
    failed: 'rejected',
    declined: 'rejected',
    pending: 'submitted',
    created: 'submitted',
  };
  return map[personaStatus] || 'submitted';
}
module.exports = { createInquiry, getInquiry, verifyWebhook, mapStatus };
