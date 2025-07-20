
const admin = require('firebase-admin');

let serviceAccount;

// Check if the environment variable exists
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
  throw new Error('Firebase service account key is missing');
}

console.log('🔧 Attempting to parse Firebase service account key...');

try {
  // Check if it's base64 encoded
  let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  // If it looks like base64, decode it first
  if (!keyString.trim().startsWith('{')) {
    keyString = Buffer.from(keyString, 'base64').toString('utf8');
  }
  
  // Try parsing the raw string first
  serviceAccount = JSON.parse(keyString);
  console.log('✅ Successfully parsed Firebase service account key');
} catch (error) {
  console.log('⚠️ Direct parsing failed, trying with escape character handling...');
  
  try {
    // Handle common escape character issues
    let keyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    // If it looks like base64, decode it first
    if (!keyString.trim().startsWith('{')) {
      keyString = Buffer.from(keyString, 'base64').toString('utf8');
    }
    
    // Clean up escape characters
    const cleanedKey = keyString
      .replace(/\\n/g, '\n')
      .replace(/\\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');
    
    serviceAccount = JSON.parse(cleanedKey);
    console.log('✅ Successfully parsed Firebase service account key (with cleanup)');
  } catch (secondError) {
    console.error('❌ Failed to parse Firebase service account key after all attempts');
    console.error('Error details:', secondError.message);
    
    // Try to use the attached JSON file as fallback
    try {
      const fs = require('fs');
      const path = require('path');
      const fallbackPath = path.join(__dirname, '../attached_assets/firebase_service_account_1753030636390.json');
      
      if (fs.existsSync(fallbackPath)) {
        console.log('🔧 Trying to use local service account file...');
        serviceAccount = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        console.log('✅ Successfully loaded Firebase service account from local file');
      } else {
        throw secondError;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback to local file also failed');
      throw secondError;
    }
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = { admin, db };
