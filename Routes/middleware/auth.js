// middleware/auth.js
const { admin } = require('../services/firebase');

// Middleware to verify authentication
const requireAuth = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session || '';

    if (!sessionCookie) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Verify the session cookie
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

    // Add user ID to request object
    req.userId = decodedClaims.uid;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = { requireAuth };