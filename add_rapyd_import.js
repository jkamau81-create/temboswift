const fs = require('fs');
let c = fs.readFileSync('src/routes/mpesa.js', 'utf8');

// Add rapyd import at top
if (!c.includes('rapyd')) {
  c = "const { sendMpesaPayout, getPayoutStatus } = require('../services/rapyd');\n" + c;
}

fs.writeFileSync('src/routes/mpesa.js', c, 'utf8');
console.log('Done');
