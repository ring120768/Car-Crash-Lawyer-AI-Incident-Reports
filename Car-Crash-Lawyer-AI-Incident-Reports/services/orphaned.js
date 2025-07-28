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
});