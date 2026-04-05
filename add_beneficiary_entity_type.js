const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');

if (!c.includes("beneficiary_entity_type")) {
  c = c.replace(
    "    beneficiary_country: 'KE',",
    "    beneficiary_country: 'KE',\n    beneficiary_entity_type: 'individual',"
  );
}

fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
