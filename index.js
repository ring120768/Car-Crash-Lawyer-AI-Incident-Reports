const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- FIREBASE INIT ---
let db = null;
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (!base64) {
    console.warn('FIREBASE_CREDENTIALS_BASE64 not found - Firebase features disabled');
  } else {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      db = admin.firestore();
      console.log('✅ Firebase initialized');
    } catch (error) {
      console.error('Error initializing Firebase:', error.message);
    }
  }
}

// --- GOOGLE DRIVE INIT (optional) ---
let drive = null;
try {
  const driveDecoded = Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64, 'base64').toString('utf8');
  const driveCredentials = JSON.parse(driveDecoded);
  const auth = new google.auth.GoogleAuth({
    credentials: driveCredentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  drive = google.drive({ version: 'v3', auth });
  console.log('✅ Google Drive initialized');
} catch (err) {
  console.warn('⚠️ Google Drive not configured:', err.message);
}

// --- GENERATE PDF FUNCTION (PDF.co) ---
async function generatePDF(data) {
  const docxPath = './Car Crash Lawyer AI Incident Report .docx';
  const docxData = fs.readFileSync(docxPath).toString('base64');
  const PDFCO_API_KEY = process.env.PDFCO_API_KEY;

  const replaceText = Object.entries(data).map(([key, val]) => ({
    searchString: `{{${key}}}`,
    replaceString: String(val)
  }));

  const response = await axios.post('https://api.pdf.co/v1/pdf/edit/replace-text', {
    name: 'incident_report.pdf',
    url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
    async: false,
    replaceText
  }, {
    headers: { 'x-api-key': PDFCO_API_KEY }
  });

  if (!response.data.url) throw new Error('PDF.co did not return a file URL');

  const pdfRes = await axios.get(response.data.url, { responseType: 'arraybuffer' });
  return Buffer.from(pdfRes.data);
}

// --- EMAIL FUNCTION (Gmail) ---
async function sendReportEmail(recipient, pdfBuffer, subject = 'Your Car Crash Report') {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_SENDER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
    to: recipient,
    subject,
    text: 'Please find your incident report attached.',
    attachments: [
      {
        filename: 'incident_report.pdf',
        content: pdfBuffer
      }
    ]
  });

  console.log(`📧 Sent email to ${recipient}`);
}

// --- INCIDENT REPORT PDF ROUTE ---
app.get('/incident-report/:docId', async (req, res) => {
  const { docId } = req.params;
  if (!db) return res.status(500).send('Firestore not initialized');

  const ref = db.collection('Car Crash Lawyer AI Incident Reports').doc(docId);
  try {
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send('Incident not found');
    const data = doc.data();

    // FCA Enrichment (optional logic)
    if (!data.fca) {
      const fca = await enrichWithFCA(data.insurance_company);
      if (fca) {
        data.fca = fca;
        await ref.update({ fca, enrichment_status: 'complete' });
      }
    }

    const pdfBuffer = await generatePDF(data);

    await sendReportEmail(data.email, pdfBuffer);
    await sendReportEmail('accounts@carcrashlawyerai.com', pdfBuffer);

    res.send('✅ Report generated and emailed successfully');
  } catch (err) {
    console.error('❌ Report generation error:', err.message);
    res.status(500).send('Error generating report');
  }
});

// --- FCA ENRICHMENT FUNCTION ---
async function enrichWithFCA(companyName) {
  if (!companyName) return null;
  const url = 'https://register.fca.org.uk/s/search.json';
  const params = { name: companyName, type: 'firms' };

  try {
    const response = await axios.get(url, { params });
    const result = response.data.results?.[0];
    return result
      ? {
          legal_name: result.Name,
          frn: result.FRN,
          status: result.Status,
          address: result.Address,
          permissions: result.Permissions,
          match_confidence: 'FCA API'
        }
      : null;
  } catch (err) {
    console.warn('FCA lookup failed:', err.message);
    return null;
  }
}

// --- WHAT3WORDS ENDPOINT ---
app.get('/api/what3words', async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = process.env.WHAT3WORDS_API_KEY;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing lat/lng' });
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    const result = await axios.get(url);
    res.json({ words: result.data.words || null });
  } catch (err) {
    console.error('What3Words error:', err.message);
    res.status(500).json({ error: 'What3Words API failed', details: err.message });
  }
});

// --- STATIC ROUTES ---
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/report', (req, res) => res.sendFile(path.join(__dirname, 'public', 'report.html')));
app.get('/subscribe', (req, res) => res.sendFile(path.join(__dirname, 'public', 'subscribe.html')));

// --- SERVER START ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Car Crash Lawyer AI running on http://localhost:${PORT}`);
});
const { app: pdfApp } = require('./Car-Crash-Lawyer-AI-Incident-Reports/services/testPDF');
app.use('/', pdfApp);
