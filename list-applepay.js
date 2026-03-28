require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function run() {
  const domains = await stripe.applePayDomains.list({ limit: 5 });
  console.log('Registered domains:', domains.data.map(d => d.domain_name));
}
run().catch(e => console.error(e.message));
