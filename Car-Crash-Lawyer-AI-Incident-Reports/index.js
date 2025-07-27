const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const {
  uploadToUserFolder,
  createPublicLink,
  recordExpiration,
} = require('./services/driveUploader');

const {
  handleIncidentReportPDF,
  handleIncidentReportPDFFromDoc
} = require('./services/incidentReports');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- FIREBASE SETUP ---
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (!base64) throw new Error('Missing FIREBASE_CREDENTIALS_BASE64!');

  let serviceAccount;
  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    serviceAccount = JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding FIREBASE_CREDENTIALS_BASE64:', error.message);
    throw new Error(`Invalid FIREBASE_CREDENTIALS_BASE64: ${error.message}`);
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// --- GOOGLE DRIVE SETUP ---
const driveBase64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
if (!driveBase64) throw new Error('Missing GOOGLE_DRIVE_CREDENTIALS_BASE64!');

let driveCredentials;
try {
  const decoded = Buffer.from(driveBase64, 'base64').toString('utf8');
  driveCredentials = JSON.parse(decoded);
} catch (error) {
  console.error('Error decoding GOOGLE_DRIVE_CREDENTIALS_BASE64:', error.message);
  throw new Error(`Invalid GOOGLE_DRIVE_CREDENTIALS_BASE64: ${error.message}`);
}

const auth = new google.auth.GoogleAuth({
  credentials: driveCredentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });

// --- FCA ENRICHMENT ---
async function enrichWithFCA(companyName) {
  if (!companyName || !companyName.trim()) return null;
  const url = 'https://register.fca.org.uk/s/search.json';
  const params = { name: companyName, type: 'firms' };

  try {
    const response = await axios.get(url, { params });
    const results = response.data.results || [];
    if (results.length === 0) return null;
    const match = results[0];
    return {
      legal_name: match.Name,
      frn: match.FRN,
      status: match.Status,
      address: match.Address,
      permissions: match.Permissions,
      match_confidence: 'FCA API (best match, always review)',
    };
  } catch (err) {
    console.error('FCA API error:', err.message);
    return null;
  }
}

// --- Endpoints ---
app.get('/incident-report/:docId', handleIncidentReportPDF);

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
  let event;

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    if (!userId) {
      console.warn('⚠️ Stripe webhook received without user_id');
      return res.status(200).end();
    }

    try {
      await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).update({
        payment_status: 'confirmed',
        stripe_checkout_id: session.id,
        stripe_customer_email: session.customer_email || '',
        payment_confirmed_at: new Date()
      });
      console.log(`✅ Payment confirmed and updated for user ${userId}`);
    } catch (err) {
      console.error(`❌ Failed to update Firestore for user ${userId}:`, err.message);
    }
  }

  res.status(200).end();
});

// --- Fallback: email users who haven’t completed payment after 2 hours ---
setInterval(async () => {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_SENDER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const snap = await db.collection('Car Crash Lawyer AI User Sign Up')
      .where('payment_status', '==', 'pending')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const createdAt = data.created_at?.toDate?.() || new Date(data.created_at);
      const email = data.email_text;
      if (!email || !createdAt) continue;

      // Escalation: Retry reminder after 24h
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (createdAt <= twoHoursAgo && !data.reminder_sent_at) {
        await transporter.sendMail({
          from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
          to: email,
          subject: '⏳ Your Sign-Up is Incomplete – Payment Not Received',
          text: `Hello,

It looks like your sign-up is missing a confirmed payment.
Please return to complete payment and unlock full access to Car Crash Lawyer AI.`
        });

        await db.collection('Car Crash Lawyer AI User Sign Up').doc(doc.id).update({
          reminder_sent_at: now
        });

        await db.collection('Car Crash Lawyer AI Processing Log').add({
          type: 'payment_reminder',
          doc_id: doc.id,
          email_sent_to: email,
          status: 'reminder_sent',
          processed_at: now
        });

        console.log(`⏰ Payment reminder sent to ${email}`);
      }

      // Notify sales after 30 days
      if (createdAt <= thirtyDaysAgo) {
        await transporter.sendMail({
          from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
          to: 'sales@carcrashlawyerai.com',
          subject: '🚫 Unconverted Signup - 30 Days Old',
          text: `User ID: ${doc.id}
Email: ${email}
Signup created: ${createdAt.toISOString()}

This user did not complete payment after 30 days. Consider personalised follow-up.`
        });

        await db.collection('Car Crash Lawyer AI Processing Log').add({
          type: 'escalation_to_sales',
          doc_id: doc.id,
          status: 'referred_after_30_days',
          processed_at: now
        });

        console.log(`📤 Referred to sales: ${doc.id}`);
      }
        console.log(`🗑️ Auto-deleted pending signup: ${doc.id}`);

        await db.collection('Car Crash Lawyer AI Processing Log').add({
          type: 'auto_delete',
          doc_id: doc.id,
          status: 'deleted_after_30_days',
          processed_at: now
        });
      }
    }
  } catch (err) {
    console.error('❌ Error handling signup cleanup:', err.message);
  }
}, 15 * 60 * 1000); // check every 15 minutes);

app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

app.get('/firebase-test', async (req, res) => {
  try {
    const testRef = db.collection('Car Crash Lawyer AI Incident Reports').doc('test_doc');
    await testRef.set({
      test_field: '🚗 Crash test successful',
      timestamp: new Date().toISOString(),
    });
    res.send('Firebase write/read test completed.');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('/api/what3words', async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = process.env.WHAT3WORDS_API_KEY;
  if (!lat || !lng || !apiKey) return res.status(400).json({ error: 'Missing parameters or API key' });

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    const response = await axios.get(url);
    if (response.data && response.data.words) {
      res.json({ words: response.data.words });
    } else {
      res.status(500).json({ error: 'No what3words found' });
    }
  } catch (err) {
    console.error('what3words API error:', err.message, err.response?.data);
    res.status(500).json({ error: 'Failed to fetch what3words' });
  }
});

// --- Admin Dashboard ---
app.get('/admin/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-users.html'));
});

app.get('/api/admin/signups', async (req, res) => {
  try {
    const snap = await db.collection('Car Crash Lawyer AI User Sign Up')
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(results);
  } catch (err) {
    console.error('❌ Failed to load admin signups:', err.message);
    res.status(500).json({ error: 'Failed to load signups' });
  }
});

// --- Firestore Listener for Sign Up + DVLA Enrichment ---
db.collection('Car Crash Lawyer AI User Sign Up')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const docId = change.doc.id;
        const data = change.doc.data();
        const plate = data.license_plate_number;
        const email = data.email_text || null;
        const paymentConfirmed = data.payment_status === 'confirmed';

        if (!plate || !paymentConfirmed || !email) {
          console.warn(`⚠️ Skipping DVLA/email for ${docId} – missing plate, email, or payment`);
          return;
        }

        try {
          const response = await axios.get(`https://api.dvla.service/vehicle/${plate}`, {
            headers: { Authorization: `Bearer ${process.env.DVLA_API_KEY}` }
          });

          const dvlaData = response.data;
          await db.collection('Car Crash Lawyer AI User Sign Up').doc(docId).update({
            dvla_make: dvlaData.make || '',
            dvla_model: dvlaData.model || '',
            dvla_colour: dvlaData.colour || '',
            dvla_engine_capacity: dvlaData.engine_capacity || '',
            dvla_fuel_type: dvlaData.fuel_type || '',
            dvla_registered_date: dvlaData.registered_date || '',
            dvla_tax_status: dvlaData.tax_status || '',
            dvla_mot_status: dvlaData.mot_status || '',
            dvla_mileage: dvlaData.mileage || '',
            dvla_updated: admin.firestore.FieldValue.serverTimestamp(),
          });

          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.GMAIL_SENDER,
              pass: process.env.GMAIL_APP_PASSWORD
            }
          });

          const mailOptions = {
            from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
            to: [email, 'accounts@carcrashlawyerai.com'],
            subject: '✅ Signup Received & DVLA Confirmed',
            text: `Hello,

Your sign-up has been received and payment confirmed.
DVLA vehicle details have been linked.

Thank you for joining Car Crash Lawyer AI.`
          };

          await transporter.sendMail(mailOptions);
          console.log(`📧 Confirmation email sent for ${docId}`);

          await db.collection('Car Crash Lawyer AI Processing Log').add({
            type: 'signup_confirmation',
            doc_id: docId,
            email_sent_to: email,
            status: 'success',
            processed_at: new Date()
          });

        } catch (err) {
          console.error(`❌ Error during signup DVLA/email for ${docId}:`, err.message);
        }
      }
    });
  });
        const plate = data.license_plate_number;

        if (!plate) return;

        try {
          const response = await axios.get(`https://api.dvla.service/vehicle/${plate}`, {
            headers: { Authorization: `Bearer ${process.env.DVLA_API_KEY}` }
          });

          const dvlaData = response.data;
          await db.collection('Car Crash Lawyer AI User Sign Up').doc(docId).update({
            dvla_make: dvlaData.make || '',
            dvla_model: dvlaData.model || '',
            dvla_colour: dvlaData.colour || '',
            dvla_engine_capacity: dvlaData.engine_capacity || '',
            dvla_fuel_type: dvlaData.fuel_type || '',
            dvla_registered_date: dvlaData.registered_date || '',
            dvla_tax_status: dvlaData.tax_status || '',
            dvla_mot_status: dvlaData.mot_status || '',
            dvla_mileage: dvlaData.mileage || '',
            dvla_updated: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`🚘 DVLA data added to signup ${docId}`);
        } catch (err) {
          console.error(`❌ Failed to fetch DVLA data for ${docId}:`, err.message);
        }
      }
    });
  });

// --- Firestore Listener for Incident Reports ---
db.collection('Car Crash Lawyer AI Incident Reports')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const docId = change.doc.id;
        console.log('📥 New Firestore doc detected:', docId);
        try {
          await handleIncidentReportPDFFromDoc(docId);
        } catch (err) {
          console.error(`🔥 Error processing doc ${docId}:`, err.message);
        }
      }
    });
  });

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});




















