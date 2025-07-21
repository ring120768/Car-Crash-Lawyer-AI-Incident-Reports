
const { db } = require('./services/firebase');

// Middleware to check if user has premium access
async function requirePremium(req, res, next) {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'User ID required',
        premium: false 
      });
    }

    // Check user's premium status in Firebase
    const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User not found',
        premium: false 
      });
    }

    const userData = userDoc.data();
    const isPremium = userData.is_premium === true || userData.subscription_status === 'active';

    if (!isPremium) {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        premium: false,
        message: 'This feature requires a premium subscription'
      });
    }

    // User has premium access, continue to next middleware/route
    req.user = { ...userData, userId };
    next();

  } catch (error) {
    console.error('❌ Error checking premium status:', error.message);
    return res.status(500).json({ 
      error: 'Error validating premium status',
      premium: false 
    });
  }
}

// Function to check premium status without blocking request
async function checkPremiumStatus(userId) {
  try {
    const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
    
    if (!userDoc.exists) {
      return { premium: false, exists: false };
    }

    const userData = userDoc.data();
    const isPremium = userData.is_premium === true || userData.subscription_status === 'active';

    return { 
      premium: isPremium, 
      exists: true,
      user: userData 
    };

  } catch (error) {
    console.error('❌ Error checking premium status:', error.message);
    return { premium: false, exists: false, error: error.message };
  }
}

// Function to upgrade user to premium
async function upgradeToPremium(userId, subscriptionData = {}) {
  try {
    const userRef = db.collection('Car Crash Lawyer AI User Sign Up').doc(userId);
    
    const updateData = {
      is_premium: true,
      subscription_status: 'active',
      premium_upgraded_at: new Date(),
      ...subscriptionData
    };

    await userRef.update(updateData);
    
    console.log('✅ User upgraded to premium:', userId);
    return { success: true, premium: true };

  } catch (error) {
    console.error('❌ Error upgrading user to premium:', error.message);
    return { success: false, error: error.message };
  }
}

// Function to revoke premium access
async function revokePremium(userId) {
  try {
    const userRef = db.collection('Car Crash Lawyer AI User Sign Up').doc(userId);
    
    await userRef.update({
      is_premium: false,
      subscription_status: 'cancelled',
      premium_revoked_at: new Date()
    });
    
    console.log('✅ Premium access revoked for user:', userId);
    return { success: true, premium: false };

  } catch (error) {
    console.error('❌ Error revoking premium access:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  requirePremium,
  checkPremiumStatus,
  upgradeToPremium,
  revokePremium
};
