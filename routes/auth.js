// routes/auth.js
const express = require('express');
const router = express.Router();
const { admin } = require('../services/firebase');
const { createUser, getUserById } = require('../services/userAuth');

// Check authentication status
router.get('/status', async (req, res) => {
  try {
    const sessionCookie = req.cookies.session || '';

    if (!sessionCookie) {
      return res.json({ authenticated: false });
    }

    // Verify the session cookie
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Get user data from Firestore
    const userData = await getUserById(uid);

    return res.json({
      authenticated: true,
      user: {
        uid: uid,
        email: userData.email,
        fullName: userData.full_name
      }
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    return res.json({ authenticated: false });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Sign in with Firebase Auth
    const userCredential = await admin.auth().getUserByEmail(email);

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const idToken = req.body.idToken; // This should be sent from the client

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID token is required' });
    }

    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // Set cookie options
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('session', sessionCookie, options);

    return res.json({
      success: true,
      userId: userCredential.uid
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ success: true });
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const sessionCookie = req.cookies.session || '';

    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Verify the session cookie
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Get user data from Firestore
    const userData = await getUserById(uid);

    return res.json({
      success: true,
      profile: userData
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

module.exports = router;