const admin = require('firebase-admin');

// Use local Firebase service account file
const fs = require('fs');
const path = require('path');

let serviceAccount;

try {
  const servicePath = path.join(__dirname, '../attached_assets/firebase_service_account_1753030636390.json');
  serviceAccount = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
  console.log('✅ Firebase service account loaded from local file');
} catch (error) {
  console.error('❌ Failed to load Firebase service account:', error.message);
  throw error;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };
