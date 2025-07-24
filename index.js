const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

const app = express();

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
  const { docId } = req.params;
  const ref = db.collection('Car Crash Lawyer AI User Data').doc(docId);

  try {
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).send('Incident not found.');

    let data = doc.data();

    // Try FCA enrichment unless already complete
    let fcaData = data.fca || null;
    if (!fcaData || fcaData.error) {
      fcaData = await enrichWithFCA(data.insurance_company);
      if (fcaData) {
        data.fca = fcaData;
        data.enrichment_status = 'complete';
        await ref.update({ fca: fcaData, enrichment_status: 'complete' });
      } else {
        data.enrichment_status = 'pending';
        await ref.update({
          enrichment_status: 'pending',
          enrichment_requested: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Send "pending" notification to user (implement your logic here)
        await sendReportEmail(
          data.email,
          null,
          'Your Report is Being Verified - Checking Official Sources'
        );
        return res.status(202).send('Enrichment pending. User notified.');
      }
    }

    // Generate the PDF
    const pdfBuffer = await generatePDF(data);

    // Email PDF to user and accounts
    await sendReportEmail(data.email, pdfBuffer);
    await sendReportEmail('accounts@carcrashlawyerai.com', pdfBuffer);

    // Optionally, upload PDF to Drive (add your logic here if needed)
    // await uploadPDFtoDrive(pdfBuffer, `${docId}_report.pdf`);

    res.status(200).send('Report generated, emailed, and (optionally) uploaded.');
  } catch (err) {
    console.error('Incident report error:', err.message);
    res.status(500).send('Failed to generate report.');
  }
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

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});














