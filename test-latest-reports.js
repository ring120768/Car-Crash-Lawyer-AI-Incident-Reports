
const { getLatestReports } = require('./firestore_client');

async function testLatestReports() {
  try {
    console.log('🔍 Fetching latest reports...');
    
    const latest = await getLatestReports("incident_reports");
    
    if (latest.length === 0) {
      console.log('📭 No reports found in incident_reports collection');
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
