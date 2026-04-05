require('dotenv').config();
const { rapydRequest } = require('./src/services/rapyd');
async function check() {
  try {
    const result = await rapydRequest('get', '/v1/payouts/supported_types?beneficiary_country=KE&payout_currency=KES');
    console.log('Supported types:', JSON.stringify(result.data?.slice(0,5), null, 2));
  } catch(e) { console.error(e.message); }
}
check();
