const { db } = require('./firebase');
const axios = require('axios');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// --- Submit or update a full incident report ---
async function upsertIncidentReport(docId, reportData) {
  try {
    const ref = db.collection("Car Crash Lawyer AI Incident Reports").doc(docId);
    await ref.set({
      ...reportData,
      updated_at: new Date()
    }, { merge: true });
    console.log(`✅ Incident Report '${docId}' created/updated.`);
    return { success: true, docId };
  } catch (error) {
    console.error('❌ Error upserting incident report:', error);
    throw error;
  }
}

// --- Submit a new incident report ---
async function submitIncidentReport(userId, vehicleMake, vehicleModel, voiceTranscriptionUrl, imagesUrl) {
  try {
    const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
    if (!userDoc.exists) throw new Error('User not found');

    const incidentReportData = {
      user_id: userId,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      voice_transcription_url: voiceTranscriptionUrl,
      images_url: imagesUrl,
      created_at: new Date(),
    };

    const docRef = await db.collection('Car Crash Lawyer AI Incident Reports').add(incidentReportData);
    console.log('✅ Incident Report submitted and linked to USER_ID:', docRef.id);
    return { success: true, reportId: docRef.id };
  } catch (error) {
    console.error('❌ Error submitting incident report:', error);
    throw error;
  }
}

// --- Get all incident reports for a specific user ---
async function getIncidentReportsByUser(userId) {
  try {
    const snapshot = await db.collection('Car Crash Lawyer AI Incident Reports')
      .where('user_id', '==', userId)
      .get();

    if (snapshot.empty) {
      console.log('📭 No incident reports found for user:', userId);
      return [];
    }

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 Found ${reports.length} incident reports for user:`, userId);
    return reports;
  } catch (error) {
    console.error('❌ Error fetching incident reports for user:', error.message);
    throw error;
  }
}

// --- Upload PDF to Google Drive ---
async function uploadPDFToDrive(pdfUrl, fileName) {
  try {
    const credsBase64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
    const creds = JSON.parse(Buffer.from(credsBase64, 'base64').toString('utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    const drive = google.drive({ version: 'v3', auth });
    const response = await axios.get(pdfUrl, { responseType: 'stream' });

    const deleteAfterDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const fileMetadata = {
      name: fileName,
      mimeType: 'application/pdf',
      description: `Auto-delete after: ${deleteAfterDate.toISOString()}`
    };

    const media = { mimeType: 'application/pdf', body: response.data };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, name, webViewLink'
    });

    console.log('📁 PDF uploaded to Google Drive:', file.data.webViewLink);
    return file.data.webViewLink;
  } catch (err) {
    console.error('❌ Error uploading to Google Drive:', err.message);
    return null;
  }
}

// --- PDF Generation ---
const PDF_TEMPLATE_URL = process.env.PDF_TEMPLATE_URL_INCIDENT;
const PDFCO_API_KEY = process.env.PDFCO_API_KEY;

async function handleIncidentReportPDF(req, res) {
  const docId = req.params.docId;
  try {
    await handleIncidentReportPDFFromDoc(docId, res);
  } catch (err) {
    console.error("🔥 Error in HTTP handler:", err.message);
    res.status(500).send("Server error during PDF generation or email.");
  }
}

async function handleIncidentReportPDFFromDoc(docId, res = null) {
  try {
    const ref = admin.firestore().collection("Car Crash Lawyer AI User Data").doc(docId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error("Incident report not found");

    const data = doc.data();
    const userId = data.user_id;
    const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    const enriched = {
      ...data,
      dvla_make: userData.dvla_make || '',
      dvla_model: userData.dvla_model || '',
      dvla_colour: userData.dvla_colour || '',
      dvla_engine_capacity: userData.dvla_engine_capacity || '',
      dvla_fuel_type: userData.dvla_fuel_type || '',
      dvla_registered_date: userData.dvla_registered_date || '',
      dvla_tax_status: userData.dvla_tax_status || '',
      dvla_mot_status: userData.dvla_mot_status || '',
      dvla_mileage: userData.dvla_mileage || ''
    };

    const recipientEmail = data.email || userData.email_text || "accounts@carcrashlawyerai.com";

    const fields = Object.entries(enriched).map(([key, value]) => ({
      fieldName: key,
      pages: "1",
      text: String(value)
    }));

    const pdfResponse = await axios.post(
      'https://api.pdf.co/v1/pdf/edit/fields',
      {
        url: PDF_TEMPLATE_URL,
        name: "filled_incident_report.pdf",
        async: false,
        fields
      },
      {
        headers: { 'x-api-key': PDFCO_API_KEY }
      }
    );

    const pdfUrl = pdfResponse.data?.url;
    if (!pdfUrl) throw new Error("⚠️ PDF generation failed");

    const driveLink = await uploadPDFToDrive(pdfUrl, `incident_report_${docId}.pdf`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_SENDER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
      to: [recipientEmail, 'accounts@carcrashlawyerai.com'],
      subject: 'Your Legal Incident Report PDF',
      text: `Hello,\n\nYour incident report has been generated.\n\n📄 PDF: ${pdfUrl}\n📁 Backup: ${driveLink || 'Drive upload failed'}\n\n– Car Crash Lawyer AI Team`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to: ${recipientEmail} and accounts@carcrashlawyerai.com`);

    await db.collection('Car Crash Lawyer AI Processing Log').add({
      doc_id: docId,
      email_sent_to: recipientEmail,
      pdf_url: pdfUrl,
      drive_link: driveLink,
      status: 'success',
      processed_at: new Date()
    });

    await ref.update({
      processing_status: 'completed',
      processing_time: new Date(),
      pdf_drive_link: driveLink
    });

    if (res) {
      res.send(`
        ✅ PDF generated and emailed successfully:<br>
        📄 <a href="${pdfUrl}" target="_blank">Download PDF</a><br>
        📁 <a href="${driveLink}" target="_blank">View on Google Drive</a>
      `);
    }

  } catch (err) {
    console.error('🔥 Error during PDF processing:', err.message);

    await db.collection('Car Crash Lawyer AI Processing Log').add({
      doc_id: docId,
      error: err.message,
      status: 'failed',
      timestamp: new Date()
    });

    await db.collection('Car Crash Lawyer AI Retry Queue').add({
      doc_id: docId,
      reason: err.message,
      queued_at: new Date(),
      status: 'pending'
    });

    await admin.firestore().collection("Car Crash Lawyer AI User Data").doc(docId).update({
      processing_status: 'failed',
      error_message: err.message,
      last_attempt: new Date()
    });

    if (res) res.status(500).send("Error during PDF generation or email.");
    else throw err;
  }
}

module.exports = {
  submitIncidentReport,
  getIncidentReportsByUser,
  handleIncidentReportPDF,
  handleIncidentReportPDFFromDoc,
  upsertIncidentReport
};











