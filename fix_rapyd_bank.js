const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');
c = c.replace(
  "    payout_method_type: 'ke_mpesa',",
  "    payout_method_type: 'ke_general_bank',"
);
c = c.replace(
  "    payout_method: {\n      type: 'ke_mpesa',\n      fields: { phone_number: p },\n    },",
  "    payout_method: {\n      type: 'ke_general_bank',\n      fields: { phone_number: p },\n    },"
);
fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
