
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firestore with service account JSON
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      .replace(/\\n/g, '\n') // Fix for escaped newlines
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function saveIncidentData(collection, docId, data) {
  try {
    await db.collection(collection).doc(docId).set(data, { merge: true });
    console.log(`✅ Saved data to ${collection}/${docId}`);
  } catch (err) {
    console.error('❌ Firestore write failed:', err);
  }
}

module.exports = {
  saveIncidentData,
  db,
};
