const express = require('express');
const path = require('path');
const app = express();

// Check if Stripe secrets are available
if (!process.env.STRIPE_SECRET || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('❌ Stripe environment variables missing. Please check your Secrets.');
  console.log('📋 Required: STRIPE_SECRET, STRIPE_WEBHOOK_SECRET');
  process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET);
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Serve static files
app.use(express.static('public'));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'Main server running',
    environment: {
      STRIPE_SECRET: process.env.STRIPE_SECRET ? 'Set' : 'Missing',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Missing',
      FIREBASE_CREDENTIALS: process.env.FIREBASE_CREDENTIALS ? 'Set' : 'Missing'
    },
    firebase_db: db ? 'Connected' : 'Disabled'
  });
});

// Init Firebase Admin
let db;
if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_CREDENTIALS) {
      console.warn('⚠️ FIREBASE_CREDENTIALS not set - Firestore features disabled');
      db = null;
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)),
      });
      db = admin.firestore();
      console.log('✅ Firebase Admin initialized');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    db = null;
  }
}

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
    if (!db) {
      console.warn('⚠️ Firestore not available - skipping user update');
      return;
    }
    
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log('🔧 Stripe webhook endpoint: /webhook');
});








