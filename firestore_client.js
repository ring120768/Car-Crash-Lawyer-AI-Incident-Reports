
const { db } = require('./services/firebase');

async function getLatestReports(collectionName, limit = 10) {
  try {
    const snapshot = await db.collection(collectionName)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();
    
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    
    return reports;
  } catch (error) {
    console.error('❌ Error fetching latest reports:', error.message);
    throw error;
  }
}

module.exports = {
  getLatestReports
};
