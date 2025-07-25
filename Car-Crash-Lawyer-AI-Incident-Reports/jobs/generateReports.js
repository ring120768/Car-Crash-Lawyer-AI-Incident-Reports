
const { db } = require('../services/firebase');

async function generateReports() {
  try {
    console.log('📊 Starting daily report generation...');
    
    // Get yesterday's date range
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    
    // Query incident reports from yesterday
    const snapshot = await db.collection('incident_reports')
      .where('created_at', '>=', yesterday.toISOString())
      .where('created_at', '<=', endOfYesterday.toISOString())
      .get();
    
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📈 Found ${reports.length} incident reports from yesterday`);
    
    // Generate summary report
    const summaryReport = {
      date: yesterday.toISOString().split('T')[0],
      total_incidents: reports.length,
      generated_at: new Date().toISOString(),
      incidents: reports
    };
    
    // Save the daily report
    await db.collection('daily_reports').add(summaryReport);
    
    console.log('✅ Daily report generated and saved successfully');
    
  } catch (error) {
    console.error('❌ Error generating daily report:', error);
  }
}

module.exports = generateReports;
