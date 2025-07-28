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

// --- PDF GENERATION (SLOT) ---
async function generatePDF(data, templateType = 'incident') {
  // TODO: Integrate with PDF.co or other service.
  return Buffer.from('DUMMY PDF FILE', 'utf8'); // For development only
}

// --- EMAIL SENDING (SLOT) ---
async function sendReportEmail(recipient, pdfBuffer, subject = 'Your Car Crash Report') {
  // TODO: Integrate with SendGrid, Mailgun, or Gmail SMTP
  console.log(`[SIMULATED EMAIL] Would email to: ${recipient} [subject: ${subject}]`);
}

// --- ENRICHMENT & REPORT GENERATION ENDPOINT ---
app.get('/incident-report/:docId', async (req, res) => {
  // ...unchanged code...
});

// --- Stripe webhook (unchanged) ---
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  console.log('🔔 Stripe webhook received');
  res.status(200).end();
});

// --- Subscription page (unchanged) ---
app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

// --- FIREBASE TEST ROUTE (unchanged) ---
app.get('/firebase-test', async (req, res) => {
  try {
    const testRef = db.collection('Car Crash Lawyer AI User Data').doc('test_doc');
    await testRef.set({
      test_field: '🚗 Crash test successful',
      timestamp: new Date().toISOString(),
    });
    res.send('Firebase write/read test completed.');
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// --- WHAT3WORDS API ENDPOINT (NEW) ---
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

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
















