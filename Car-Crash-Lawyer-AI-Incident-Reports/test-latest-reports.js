
const { getLatestReports } = require('./firestore_client');

async function testLatestReports() {
  try {
    console.log('🔍 Fetching latest reports...');
    
    const latest = await getLatestReports("Car Crash Lawyer AI Incident Reports");
    
    if (latest.length === 0) {
      console.log('📭 No reports found in Car Crash Lawyer AI Incident Reports collection');
      return;
    }
    
    console.log(`📊 Found ${latest.length} latest reports:`);
    for (const report of latest) {
      console.log(report);
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch latest reports:', error.message);
  }
}

testLatestReports();
