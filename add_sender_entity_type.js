const fs = require('fs');
let c = fs.readFileSync('src/services/rapyd.js', 'utf8');

if (!c.includes("sender_entity_type: 'company'")) {
  c = c.replace(
    "    sender_country: 'US',",
    "    sender_country: 'US',\n    sender_entity_type: 'company',"
  );
}

fs.writeFileSync('src/services/rapyd.js', c, 'utf8');
console.log('Done');
