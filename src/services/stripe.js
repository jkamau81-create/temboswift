const Stripe = require('stripe');
const logger = require('../config/logger');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
async function getOrCreateCustomer(userId, email, name) {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length) return customers.data[0];
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { kenyasend_user_id: userId },
  });
  logger.info('Stripe customer created', { customerId: customer.id, userId });
  return customer;
}
async function createPaymentIntent({ transferId, userId, email, name, amountUsd }) {
  const customer = await getOrCreateCustomer(userId, email, name);
  const amountCents = Math.round(amountUsd * 100);
  const paymentIntent = await stripe.paymentIntents.create({
      payment_method_types: ["card"],
      payment_method_types: ["card"],
    amount: amountCents,
    currency: 'usd',
    customer: customer.id,
    automatic_payment_methods: { enabled: true },
    metadata: {
      transfer_id: transferId,
      kenyasend_user_id: userId,
    },
    description: `KenyaSend transfer ${transferId}`,
  });
  logger.info('PaymentIntent created', { paymentIntentId: paymentIntent.id, transferId, amountUsd });
  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    customerId: customer.id,
  };
}
function constructEvent(rawBody, sig) {
  return stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
}
module.exports = { createPaymentIntent, getOrCreateCustomer, constructEvent };


