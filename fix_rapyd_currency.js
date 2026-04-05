const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');
c = c.replace(
  "    description: 'TemboSwift transfer ' + transferId,",
  "    payout_currency: 'KES',\n    sender_currency: 'USD',\n    description: 'TemboSwift transfer ' + transferId,"
);
fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
