// services/userSignUps.js
const { db } = require('./firebase');

/**
 * Get user details by user ID
 */
async function getUserDetails(userId) {
  try {
    const userDoc = await db
      .collection('Car Crash Lawyer AI User Sign Up')
      .doc(userId)
      .get();

    if (userDoc.exists) {
      return {
        success: true,
        data: userDoc.data()
      };
    } else {
      return {
        success: false,
        error: 'User not found'
      };
    }
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Listen to real‑time updates on the user sign‑up collection.
 * Returns the unsubscribe handle.
 */
function subscribeToUserSignUps() {
  return db
    .collection('Car Crash Lawyer AI User Sign Up')
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            console.log(
              '🆕 New user sign‑up:',
              change.doc.id,
              change.doc.data()
            );
          } else if (change.type === 'modified') {
            console.log(
              '✏️ User sign‑up modified:',
              change.doc.id,
              change.doc.data()
            );
          } else if (change.type === 'removed') {
            console.log('🗑 User sign‑up removed:', change.doc.id);
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to user sign‑ups:', error);
      }
    );
}

module.exports = { subscribeToUserSignUps, getUserDetails };

