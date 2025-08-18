const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let serviceAccount = null;

// 1. Try to load credentials from environment (base64)
if (process.env.FIREBASE_CREDENTIALS_BASE64) {
  try {
    const decoded = Buffer.from(
      process.env.FIREBASE_CREDENTIALS_BASE64,
      'base64'
    ).toString('utf8');
    serviceAccount = JSON.parse(decoded);
    console.log('✅ Firebase service account loaded from environment variable');
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_CREDENTIALS_BASE64:', err.message);
  }
}

// 2. Fallback to local file only if env var wasn’t available
if (!serviceAccount) {
  try {
    const servicePath = path.join(
      __dirname,
      '../attached_assets/firebase_service_account_1753030636390.json'
    );
    serviceAccount = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
    console.log('✅ Firebase service account loaded from local file');
  } catch (error) {
    console.warn(
      '⚠️ No Firebase service account found in local file or environment'
    );
  }
}

// Initialise Firebase only once
if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase initialised (firebase.js)');
} else if (admin.apps.length) {
  console.log('ℹ️ Firebase already initialised elsewhere');
} else {
  console.warn(
    '⚠️ Firebase not initialised because no service account was provided'
  );
}

// Export Firestore db even if initialisation happened elsewhere
const db = admin.firestore();
module.exports = { admin, db };



