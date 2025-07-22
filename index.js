const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Init Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)),
  });
}
const db = admin.firestore();

// Parse Stripe webhook payload as raw buffer
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Grab customer email and product
    const customerEmail = session.customer_email;
    const priceId = session.metadata.price_id || session.metadata.product_id || session.amount_total;

    // Map Stripe Price ID to your Firestore product types
    const priceMap = {
      'buy_btn_1RnkFJDjVI87TYBmIck9tYYL': 'standard',
      'buy_btn_1RnkHrDjVI87TYBmg99Rvq6H': 'premium',
      'buy_btn_1RnkKJDjVI87TYBmcMm7b2Mb': 'family',
      'buy_btn_1RnkMBDjVI87TYBm0ojrZoSQ': 'business'
    };

    const plan = priceMap[session.metadata.buy_button_id] || 'standard';

    // Update Firestore
    db.collection('Car Crash Lawyer AI User Data')
      .where('email_text', '==', customerEmail)
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          console.warn('⚠️ No user found for email:', customerEmail);
          return;
        }

        snapshot.forEach(doc => {
          doc.ref.update({
            subscription_type: plan,
            updated: new Date().toISOString()
          });
        });
      })
      .catch(err => {
        console.error('Error updating subscription:', err);
      });
  }

  res.status(200).end();
});








