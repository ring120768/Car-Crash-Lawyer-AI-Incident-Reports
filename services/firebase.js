
const admin = require('firebase-admin');

let serviceAccount;

// Check if the environment variable exists
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  throw new Error('Firebase service account key is missing');
}

console.log('🔧 Attempting to parse Firebase service account key...');

try {
  // Try parsing the raw environment variable first
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log('✅ Successfully parsed Firebase service account key (raw)');
} catch (error) {
  console.log('⚠️ Raw parsing failed, trying with escape character handling...');
  
  // If that fails, try with escape character handling
  try {
    const cleanedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      .replace(/\\n/g, '\n')
      .replace(/\\\"/g, '"')
      .replace(/\\\\/g, '\\');
    
    serviceAccount = JSON.parse(cleanedKey);
    console.log('✅ Successfully parsed Firebase service account key (with escape handling)');
  } catch (secondError) {
    console.error('❌ Failed to parse Firebase service account key after all attempts');
    console.error('Error details:', secondError.message);
    console.error('Key preview (first 200 chars):', process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 200));
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
