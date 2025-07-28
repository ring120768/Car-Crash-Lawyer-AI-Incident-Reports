// pdfGenerator.js (Final Version)
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// --- Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (!base64) throw new Error('Missing FIREBASE_CREDENTIALS_BASE64!');
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(decoded);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// --- Utility: Email PDF to user + accounts ---
async function sendEmailWithPDF(recipient, pdfUrl, subjectLine) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_USER,
    to: [recipient, 'accounts@carcrashlawyerai.com'],
    subject: subjectLine,
    html: `<p>Your legal report is ready. You can download it here:</p><a href="${pdfUrl}">${pdfUrl}</a>`
  });

  console.log(`📤 Email sent to ${recipient} and accounts@carcrashlawyerai.com`);
}

// --- Generate PDF from Sign-Up ---
async function generateUserPDF(signUpData) {
  const docxPath = path.join(__dirname, 'public', 'Car Crash Lawyer AI User Information.docx');
  const docxData = fs.readFileSync(docxPath).toString('base64');

  const replaceText = Object.entries(signUpData).map(([key, value]) => ({
    searchString: `{{${key}}}`,
    replaceString: String(value ?? '')
  }));

  const response = await axios.post(
    'https://api.pdf.co/v1/pdf/edit/replace-text',
    {
      name: `user_information_${signUpData.user_full_name || 'client'}.pdf`,
      url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
      async: false,
      replaceText
    },
    {
      headers: { 'x-api-key': PDFCO_API_KEY }
    }
  );

  if (!response.data?.url) throw new Error('❌ PDF.co failed to return a PDF URL');
  await sendEmailWithPDF(signUpData.email_text, response.data.url, 'Your Sign-Up Summary – Car Crash Lawyer AI');
}

// --- Generate PDF from Incident Report ---
async function generateIncidentPDF(signUpData, incidentData) {
  const docxPath = path.join(__dirname, 'public', 'Car Crash Lawyer AI Incident Report.docx');
  const docxData = fs.readFileSync(docxPath).toString('base64');

  const mergedData = { ...signUpData, ...incidentData };
  const replaceText = Object.entries(mergedData).map(([key, value]) => ({
    searchString: `{{${key}}}`,
    replaceString: String(value ?? '')
  }));

  const response = await axios.post(
    'https://api.pdf.co/v1/pdf/edit/replace-text',
    {
      name: `incident_report_${mergedData.user_full_name || 'client'}.pdf`,
      url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
      async: false,
      replaceText
    },
    {
      headers: { 'x-api-key': PDFCO_API_KEY }
    }
  );

  if (!response.data?.url) throw new Error('❌ PDF.co failed to return a PDF URL');
  await sendEmailWithPDF(signUpData.email_text, response.data.url, 'Your Incident Report – Car Crash Lawyer AI');
}

// --- Replit-accessible webhook route (for Zapier or Make) ---
const express = require('express');
const app = express();
app.use(express.json());

app.post('/generate-pdf', async (req, res) => {
  const { type, incidentData, signUpData } = req.body;

  try {
    if (type === 'incident') {
      if (!signUpData || !incidentData) throw new Error('Missing incident or user data');
      await generateIncidentPDF(signUpData, incidentData);
    } else if (type === 'signup') {
      if (!signUpData) throw new Error('Missing user data');
      await generateUserPDF(signUpData);
    } else {
      throw new Error('Invalid type');
    }

    res.status(200).json({ success: true, message: 'PDF generated and emailed.' });
  } catch (err) {
    console.error('❌ Error generating PDF:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = {
  generateUserPDF,
  generateIncidentPDF,
  app
};



