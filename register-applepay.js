require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function run() {
  const domain = await stripe.applePayDomains.create({ domain_name: 'app.temboswift.com' });
  console.log('Apple Pay domain registered:', domain);
  const domain2 = await stripe.applePayDomains.create({ domain_name: 'temboswift.com' });
  console.log('Apple Pay domain registered:', domain2);
}
run().catch(e => console.error(e.message));
