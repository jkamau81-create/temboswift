const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');
c = c.replace(
  "    sender_amount: (parseFloat(amountKes) / 129).toFixed(2),\n    payout_currency: 'KES',\n    payout_amount: parseFloat(amountKes),",
  "    payout_currency: 'KES',\n    payout_amount: parseFloat(amountKes),"
);
fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
