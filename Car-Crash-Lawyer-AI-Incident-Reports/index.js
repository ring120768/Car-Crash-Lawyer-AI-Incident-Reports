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

// --- Firestore listener for new incident reports ---
db.collection('Car Crash Lawyer AI Incident Reports').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {
    if (change.type === 'added') {
      const incidentData = change.doc.data();
      const userId = incidentData.user_id_hidden_field;
      console.log('🔥 New incident report detected for user:', userId);

      if (!userId) return;

      const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
      if (!userDoc.exists) {
        console.warn(`⚠️ No matching user found for ID: ${userId}`);
        return;
      }

      const signUpData = userDoc.data();
      await generateIncidentPDF(signUpData, incidentData);
    }
  });
});

module.exports = {
  generateUserPDF,
  generateIncidentPDF
};
const { app: pdfApp } = require('./services/pdfGenerator');
app.use('/', pdfApp);

















