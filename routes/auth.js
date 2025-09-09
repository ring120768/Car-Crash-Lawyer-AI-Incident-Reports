// routes/auth.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { createUser, getUserById } = require('../services/userAuth');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Check authentication status
router.get('/status', async (req, res) => {
  try {
    const sessionToken = req.cookies.session || '';

    if (!sessionToken) {
      return res.json({ authenticated: false });
    }

    // Verify the session token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return res.json({ authenticated: false });
    }

    // Get user data from database
    const userData = await getUserById(user.id);

    return res.json({
      authenticated: true,
      user: {
        uid: user.id,
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

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Set session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('session', data.session.access_token, options);

    return res.json({
      success: true,
      userId: data.user.id
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
    const sessionToken = req.cookies.session || '';

    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Verify the session token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
    
    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Authentication failed' });
    }

    // Get user data from database
    const userData = await getUserById(user.id);

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