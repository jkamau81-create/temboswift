const fs = require('fs');
let c = fs.readFileSync('src/routes/transfers.js', 'utf8');

// Add rapyd import
if (!c.includes('rapyd')) {
  c = "const { sendMpesaPayout } = require('../services/rapyd');\n" + c;
  console.log('Rapyd imported');
}

fs.writeFileSync('src/routes/transfers.js', c, 'utf8');
console.log('Done');
