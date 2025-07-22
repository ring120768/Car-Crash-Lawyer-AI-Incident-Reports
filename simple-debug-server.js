
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static('public'));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/report', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

app.get('/subscribe', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'subscribe.html'));
});

app.get('/incident', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'incident.html'));
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'Server running',
    environment: {
      STRIPE_SECRET: process.env.STRIPE_SECRET ? 'Set' : 'Missing',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Missing',
      FIREBASE_CREDENTIALS: process.env.FIREBASE_CREDENTIALS ? 'Set' : 'Missing'
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Debug server running on http://localhost:${PORT}`);
  console.log(`📊 Visit /debug for environment status`);
});
