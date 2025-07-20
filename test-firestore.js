
const { db } = require('./services/firebase');

async function testFirestoreConnection() {
  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Get all documents from the incident_reports collection
    const snapshot = await db.collection('incident_reports').get();
    
    if (snapshot.empty) {
      console.log('📭 No documents found in incident_reports collection');
      return;
    }
    
    console.log(`📄 Found ${snapshot.size} documents in incident_reports:`);
    snapshot.forEach(doc => {
      console.log(`${doc.id} =>`, doc.data());
    });
    
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
  }
}

testFirestoreConnection();
