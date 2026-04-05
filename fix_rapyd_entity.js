const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');
c = c.replace(
  "    beneficiary: {\n      name: recipientName,\n      country: 'KE',\n    },",
  "    beneficiary: {\n      name: recipientName,\n      country: 'KE',\n      entity_type: 'individual',\n    },"
);
fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
