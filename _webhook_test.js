require('dotenv').config({ path: __dirname + '/.env' });
const Stripe = require('stripe');
const { PrismaClient } = require('@prisma/client');

const bookingId = process.argv[2];
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();

async function main() {
  const event = {
    id: 'evt_test_simulated',
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_simulated',
        object: 'checkout.session',
        payment_intent: 'pi_test_simulated',
        payment_status: 'paid',
        metadata: { bookingId },
        status: 'complete',
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type: 'checkout.session.completed',
  };
  const payload = JSON.stringify(event, null, 2);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  const res = await fetch('http://localhost:5000/api/v1/payments/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body: payload,
  });
  console.log('WEBHOOK RESPONSE STATUS:', res.status);
  console.log('WEBHOOK RESPONSE BODY:', await res.text());

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
  console.log('BOOKING STATUS:', booking.status);
  console.log('PAYMENT STATUS:', booking.payment ? booking.payment.status : null);
  console.log('PAYMENT INTENT:', booking.payment ? booking.payment.stripePaymentIntentId : null);
  console.log('PAID AT:', booking.payment ? booking.payment.paidAt : null);
}
main().finally(() => prisma.$disconnect());
