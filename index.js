const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- FIREBASE SETUP ---
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (!base64) {
    console.warn('FIREBASE_CREDENTIALS_BASE64 not found - Firebase features disabled');
  } else {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('✅ Firebase initialized');
    } catch (error) {
      console.error('Error initializing Firebase:', error.message);
    }
  }
}

// --- GOOGLE DRIVE SETUP ---
const driveBase64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
if (!driveBase64) {
  console.warn('GOOGLE_DRIVE_CREDENTIALS_BASE64 not found - Drive features disabled');
} else {
  try {
    const decoded = Buffer.from(driveBase64, 'base64').toString('utf8');
    const driveCredentials = JSON.parse(decoded);
    const auth = new google.auth.GoogleAuth({
      credentials: driveCredentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive initialized');
  } catch (error) {
    console.error('Error initializing Google Drive:', error.message);
  }
}

// --- WHAT3WORDS API ENDPOINT ---
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

// --- Additional routes ---
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

// --- Start the server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Car Crash Lawyer AI server running on http://localhost:${PORT}`);
  console.log(`📍 Visit /findme.html to test What3Words functionality`);
});