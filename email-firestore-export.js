
const fs = require('fs');
const nodemailer = require('nodemailer');
const { db } = require('./services/firebase'); // Use your existing Firebase setup

async function fetchAndSaveCollection(collectionName, filename) {
  try {
    console.log(`📊 Fetching ${collectionName} collection...`);
    const snapshot = await db.collection(collectionName).get();
    const data = [];
    
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });

    // Save as JSON file with .json extension for better compatibility
    const jsonFilename = filename.replace('.txt', '.json');
    fs.writeFileSync(jsonFilename, JSON.stringify(data, null, 2));
    
    console.log(`✅ Saved ${data.length} documents to ${jsonFilename}`);
    return jsonFilename;
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error.message);
    throw error;
  }
}

async function sendEmailWithAttachments() {
  try {
    // Fetch and save collections
    const userFile = await fetchAndSaveCollection('Car Crash Lawyer AI User Sign Up', 'users.json');
    const reportFile = await fetchAndSaveCollection('Car Crash Lawyer AI Incident Reports', 'incident_reports.json');

    // Configure nodemailer
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_SENDER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Email configuration
    const mailOptions = {
      from: process.env.GMAIL_SENDER,
      to: 'brief@carcrashlawyerai.com',
      subject: `Raw Firestore Export: Users and Incident Reports - ${new Date().toISOString().split('T')[0]}`,
      text: `Attached are the raw Firestore exports generated on ${new Date().toISOString()}.

Files included:
- users.json: User collection data
- incident_reports.json: Incident reports collection data

Generated from: ${process.env.REPL_SLUG || 'Replit Project'}`,
      attachments: [
        { 
          filename: 'users.json',
          path: userFile 
        },
        { 
          filename: 'incident_reports.json',
          path: reportFile 
        }
      ]
    };

    // Send email
    console.log('📧 Sending email with attachments...');
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to brief@carcrashlawyerai.com');

    // Clean up files after sending
    fs.unlinkSync(userFile);
    fs.unlinkSync(reportFile);
    console.log('🧹 Temporary files cleaned up');

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
}

// Run the export
sendEmailWithAttachments().catch(console.error);
