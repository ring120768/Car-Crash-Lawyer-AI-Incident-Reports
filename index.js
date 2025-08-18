const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

// Import services
const { subscribeToIncidentReports } = require('./services/incidentReports');
const { subscribeToUserSignUps, getUserDetails } = require('./services/userSignUps');

const app = express();

// --- MIDDLEWARE SETUP ---
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '10mb' })); // Increased limit for larger payloads
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- FIREBASE SETUP ---
let db = null;
if (!admin.apps.length) {
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (!base64) {
    console.warn('⚠️ FIREBASE_CREDENTIALS_BASE64 not found - Firebase features disabled');
  } else {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(decoded);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      db = admin.firestore();
      console.log('✅ Firebase initialized successfully');

      // Start listening for real-time updates
      subscribeToIncidentReports();
      subscribeToUserSignUps();
      console.log('🔔 Listening for Firestore updates');
    } catch (error) {
      console.error('❌ Error initializing Firebase:', error.message);
    }
  }
}

// --- GOOGLE DRIVE SETUP ---
let drive = null;
const driveBase64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
if (!driveBase64) {
  console.warn('⚠️ GOOGLE_DRIVE_CREDENTIALS_BASE64 not found - Drive features disabled');
} else {
  try {
    const decoded = Buffer.from(driveBase64, 'base64').toString('utf8');
    const driveCredentials = JSON.parse(decoded);
    const auth = new google.auth.GoogleAuth({
      credentials: driveCredentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Google Drive:', error.message);
  }
}

// --- UTILITY FUNCTIONS ---
function processTypeformData(formResponse) {
  const processedData = {};

  if (formResponse.form_response && formResponse.form_response.answers) {
    formResponse.form_response.answers.forEach(answer => {
      const fieldId = answer.field.id;
      const fieldRef = answer.field.ref;
      const fieldType = answer.field.type;

      // Extract value based on field type
      let value = null;
      if (answer.text) value = answer.text;
      else if (answer.email) value = answer.email;
      else if (answer.phone_number) value = answer.phone_number;
      else if (answer.number) value = answer.number;
      else if (answer.boolean !== undefined) value = answer.boolean;
      else if (answer.choice) value = answer.choice.label;
      else if (answer.choices) value = answer.choices.map(c => c.label);
      else if (answer.date) value = answer.date;
      else if (answer.url) value = answer.url;
      else if (answer.file_url) value = answer.file_url;

      // Store with both field ID and ref for flexibility
      if (value !== null) {
        processedData[fieldId] = value;
        if (fieldRef) processedData[fieldRef] = value;
      }
    });
  }

  // Add metadata
  processedData.submitted_at = formResponse.form_response?.submitted_at || new Date().toISOString();
  processedData.form_id = formResponse.form_response?.form_id;
  processedData.response_id = formResponse.form_response?.token;

  return processedData;
}

// --- HEALTH CHECK ENDPOINT ---
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      firebase: !!db,
      googleDrive: !!drive,
      server: true
    }
  };
  res.json(status);
});

// --- MAIN ROUTES ---
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

// --- TYPEFORM WEBHOOK ENDPOINTS ---
app.post('/webhook/signup', async (req, res) => {
  try {
    console.log('📝 Sign-up webhook received');
    console.log('Raw payload:', JSON.stringify(req.body, null, 2));

    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const processedData = processTypeformData(req.body);
    console.log('Processed sign-up data:', processedData);

    // Generate user ID (use response_id or generate one)
    const userId = processedData.response_id || `user_${Date.now()}`;

    // Store in Firestore
    const userRef = db.collection('Car Crash Lawyer AI User Sign Up').doc(userId);
    await userRef.set({
      ...processedData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      user_id: userId
    });

    console.log('✅ Sign-up data stored successfully with ID:', userId);
    res.status(200).json({ 
      success: true, 
      message: 'Sign-up data processed successfully',
      userId: userId 
    });

  } catch (error) {
    console.error('❌ Error processing sign-up webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/webhook/incident', async (req, res) => {
  try {
    console.log('🚨 Incident report webhook received');
    console.log('Raw payload:', JSON.stringify(req.body, null, 2));

    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const processedData = processTypeformData(req.body);
    console.log('Processed incident data:', processedData);

    // Generate incident ID
    const incidentId = processedData.response_id || `incident_${Date.now()}`;

    // Store in Firestore
    const incidentRef = db.collection('Car Crash Lawyer AI Incident Reports').doc(incidentId);
    await incidentRef.set({
      ...processedData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      incident_id: incidentId
    });

    console.log('✅ Incident data stored successfully with ID:', incidentId);
    res.status(200).json({ 
      success: true, 
      message: 'Incident data processed successfully',
      incidentId: incidentId 
    });

  } catch (error) {
    console.error('❌ Error processing incident webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// --- API ENDPOINTS ---

// What3Words API
app.get('/api/what3words', async (req, res) => {
  const { lat, lng } = req.query;
  const apiKey = process.env.WHAT3WORDS_API_KEY;

  console.log('🌍 What3Words API request:', { lat, lng, hasApiKey: !!apiKey });

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng parameters' });
  }

  if (!apiKey) {
    console.error('❌ WHAT3WORDS_API_KEY environment variable not set');
    return res.status(500).json({ error: 'What3Words API key not configured' });
  }

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    console.log('Making request to What3Words:', url.replace(apiKey, '[HIDDEN]'));

    const response = await axios.get(url);
    console.log('What3Words response:', response.data);

    if (response.data && response.data.words) {
      res.json({ words: response.data.words });
    } else {
      console.error('What3Words response missing words field:', response.data);
      res.status(500).json({ error: 'No what3words found in response' });
    }
  } catch (err) {
    console.error('❌ What3Words API error:', err.message);
    if (err.response) {
      console.error('What3Words error response:', err.response.status, err.response.data);
    }
    res.status(500).json({
      error: 'Failed to fetch what3words',
      details: err.response?.data || err.message,
    });
  }
});

// User Details API
app.get('/api/user-details/:userId', async (req, res) => {
  const { userId } = req.params;

  console.log('👤 User details API request for userId:', userId);

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const result = await getUserDetails(userId);

    if (result.success) {
      console.log('✅ User details found for:', userId);
      res.json(result.data);
    } else {
      console.log('❌ User not found:', userId);
      res.status(404).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Error fetching user details:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch user details',
      details: error.message 
    });
  }
});

// List all users (for debugging)
app.get('/api/users', async (req, res) => {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const snapshot = await db.collection('Car Crash Lawyer AI User Sign Up').limit(10).get();
    const users = [];

    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`📋 Listed ${users.length} users`);
    res.json({ users, count: users.length });

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    res.status(500).json({ 
      error: 'Failed to list users',
      details: error.message 
    });
  }
});

// --- ERROR HANDLING ---
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚗 Car Crash Lawyer AI server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 Sign-up webhook: http://localhost:${PORT}/webhook/signup`);
  console.log(`🚨 Incident webhook: http://localhost:${PORT}/webhook/incident`);
  console.log(`👤 User API: http://localhost:${PORT}/api/user-details/{userId}`);
  console.log(`📋 Users list: http://localhost:${PORT}/api/users`);
});




