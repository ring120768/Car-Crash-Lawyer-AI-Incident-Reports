
const { admin, db } = require('./firebase');

// Create a new user account (server-side approach)
async function createUser(email, password, fullName) {
  try {
    // Create user with Firebase Admin Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    const userId = userRecord.uid;  // Get the created user's ID
    console.log('✅ User created with ID:', userId);

    // Store user details in Firestore (using existing collection name)
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      full_name: fullName,
      email: email,
      created_at: new Date(),
      user_id: userId,
    });

    console.log('✅ User data stored in Firestore');
    return { success: true, userId: userId };

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

// Get user by ID
async function getUserById(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    throw error;
  }
}

// Update user information
async function updateUser(userId, updateData) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      ...updateData,
      updated_at: new Date()
    });

    console.log('✅ User updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    throw error;
  }
}

module.exports = {
  createUser,
  getUserById,
  updateUser
};
