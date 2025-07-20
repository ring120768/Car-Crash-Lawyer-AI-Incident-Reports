
const admin = require('firebase-admin');

let serviceAccount;
try {
  // Try parsing the raw environment variable first
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  // If that fails, try with escape character handling
  try {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        .replace(/\\n/g, '\n')
        .replace(/\\\"/g, '"')
        .replace(/\\\\/g, '\\')
    );
  } catch (secondError) {
    console.error('❌ Failed to parse Firebase service account key:', secondError);
    throw secondError;
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };
