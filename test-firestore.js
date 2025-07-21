
const { db } = require('./services/firebase');

async function testFirestoreConnection() {
  try {
    console.log('🔍 Testing Firestore connection...');
    
    // Get all documents from the Car Crash Lawyer AI Incident Reports collection
    const snapshot = await db.collection('Car Crash Lawyer AI Incident Reports').get();
    
    if (snapshot.empty) {
      console.log('📭 No documents found in Car Crash Lawyer AI Incident Reports collection');
      return;
    }
    
    console.log(`📄 Found ${snapshot.size} documents in Car Crash Lawyer AI Incident Reports:`);
    snapshot.forEach(doc => {
      console.log(`${doc.id} =>`, doc.data());
    });
    
  } catch (error) {
    console.error('❌ Firestore connection failed:', error.message);
  }
}

testFirestoreConnection();
