const fs = require('fs');

const file = 'src/services/rapyd.js';
let c = fs.readFileSync(file, 'utf8');

const start = c.indexOf('const body = {');
const end = c.indexOf('return await rapydRequest', start);

if (start === -1 || end === -1) {
  throw new Error('Could not find payout body block.');
}

const replacement = `const body = {
    payout_method_type: 'ke_mpesa',
    sender_currency: 'USD',
    sender_country: 'US',
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

  `;

c = c.slice(0, start) + replacement + c.slice(end);

fs.writeFileSync(file, c, 'utf8');
console.log('Done');
