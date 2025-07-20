
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cron = require('node-cron');
const generateReports = require('./jobs/generateReports');

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Run every day at 2:00 AM (Replit time)
cron.schedule('0 2 * * *', () => {
  console.log('⏰ Running daily report generator...');
  generateReports();
});
