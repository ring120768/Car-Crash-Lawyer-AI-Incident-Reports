const { db } = require('../services/firebase');
const nodemailer = require('nodemailer');

async function generateReports() {
  try {
    console.log('📊 Starting daily report generation...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const snapshot = await db.collection('Car Crash Lawyer AI Incident Reports')
      .where('created_at', '>=', yesterday)
      .where('created_at', '<=', endOfYesterday)
      .get();

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📈 Found ${reports.length} incident reports from ${yesterday.toDateString()}`);

    const summaryReport = {
      date: yesterday.toISOString().split('T')[0],
      total_incidents: reports.length,
      generated_at: new Date().toISOString(),
      incidents: reports
    };

    await db.collection('daily_reports').add(summaryReport);
    console.log('✅ Daily report generated and saved successfully');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_SENDER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const reportText = [
      `Daily Incident Report – ${summaryReport.date}`,
      `Total Incidents: ${summaryReport.total_incidents}`,
      '',
      ...reports.map(r => `• ${r.vehicle_make} ${r.vehicle_model} - ${r.user_id}`)
    ].join('\n');

    const mailOptions = {
      from: `"Car Crash Lawyer AI" <${process.env.GMAIL_SENDER}>`,
      to: ['accounts@carcrashlawyerai.com'],
      subject: `📅 Daily Incident Summary – ${summaryReport.date}`,
      text: reportText
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Daily report emailed to accounts@carcrashlawyerai.com');

  } catch (error) {
    console.error('❌ Error generating or emailing daily report:', error);
  }
}

module.exports = generateReports;

