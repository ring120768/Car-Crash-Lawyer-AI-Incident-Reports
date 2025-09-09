// middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Middleware to verify authentication
const requireAuth = async (req, res, next) => {
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

    // Add user ID to request object
    req.userId = user.id;

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