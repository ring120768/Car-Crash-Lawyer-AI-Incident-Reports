const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(bodyParser.json()); // For parsing application/json

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

// --- WHAT3WORDS ENDPOINT (NEW) ---
app.get('/api/what3words', async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = process.env.WHAT3WORDS_API_KEY;
  
  console.log('What3Words API request:', { lat, lng, hasApiKey: !!apiKey });
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng parameters' });
  }
  
  if (!apiKey) {
    console.error('WHAT3WORDS_API_KEY environment variable not set');
    return res.status(500).json({ error: 'What3Words API key not configured' });
  }

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    console.log('Making request to What3Words:', url.replace(apiKey, '[HIDDEN]'));
    
    const response = await axios.get(url);
    console.log('What3Words response:', response.data);
    
    if (response.data && response.data.words) {
      res.json({ words: response.data.words });
    } else {
      console.error('What3Words response missing words field:', response.data);
      res.status(500).json({ error: 'No what3words found in response' });
    }
  } catch (err) {
    console.error('what3words API error:', err.message);
    if (err.response) {
      console.error('What3Words error response:', err.response.status, err.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch what3words', details: err.response?.data || err.message });
  }
});

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
  // Implementation placeholder
}

// --- Start the server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚗 Car Crash Lawyer AI backend running on port ${PORT}`);
});















