const fs = require('fs');
let c = fs.readFileSync('src/services/stripe.js', 'utf8');

// Remove automatic_payment_methods and keep only payment_method_types: card
c = c.replace(/automatic_payment_methods:\s*\{[^}]+\},?\s*/g, '');

// Make sure payment_method_types is there
if (!c.includes('payment_method_types')) {
  c = c.replace('paymentIntents.create({', 'paymentIntents.create({\n      payment_method_types: ["card"],');
}

fs.writeFileSync('src/services/stripe.js', c, 'utf8');
console.log('Done');
console.log(c.substring(0, 500));
