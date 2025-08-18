const { db } = require('./firebase');

// Submit a new incident report
async function submitIncidentReport(
  userId,
  vehicleMake,
  vehicleModel,
  voiceTranscriptionUrl,
  imagesUrl
) {
  try {
    // Validate that user exists
    const userDoc = await db
      .collection('Car Crash Lawyer AI User Sign Up')
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const incidentReportData = {
      user_id: userId, // Link the report to the logged-in USER_ID
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      voice_transcription_url: voiceTranscriptionUrl,
      images_url: imagesUrl,
      created_at: new Date(),
    };

    // Add the incident report to Firestore
    const docRef = await db
      .collection('Car Crash Lawyer AI Incident Reports')
      .add(incidentReportData);
    console.log(
      '✅ Incident Report submitted and linked to USER_ID:',
      docRef.id
    );

    return { success: true, reportId: docRef.id };
  } catch (error) {
    console.error('❌ Error submitting incident report:', error);
    throw error;
  }
}

// Get all incident reports for a specific user
async function getIncidentReportsByUser(userId) {
  try {
    const snapshot = await db
      .collection('Car Crash Lawyer AI Incident Reports')
      .where('user_id', '==', userId)
      .get();

    if (snapshot.empty) {
      console.log('📭 No incident reports found for user:', userId);
      return [];
    }

    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    console.log(
      `📊 Found ${reports.length} incident reports for user:`,
      userId
    );
    return reports;
  } catch (error) {
    console.error(
      '❌ Error fetching incident reports for user:',
      error.message
    );
    throw error;
  }
}

/**
 * Listen to real-time updates on the incident reports collection.
 * The function returns an unsubscribe handle, so you can stop listening later if needed.
 */
function subscribeToIncidentReports() {
  // Attach a listener to the collection
  return db
    .collection('Car Crash Lawyer AI Incident Reports')
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            console.log(
              '🆕 New incident report:',
              change.doc.id,
              change.doc.data()
            );
          } else if (change.type === 'modified') {
            console.log(
              '✏️ Updated incident report:',
              change.doc.id,
              change.doc.data()
            );
          } else if (change.type === 'removed') {
            console.log('🗑️ Removed incident report:', change.doc.id);
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to incident reports:', error);
      }
    );
}

// Export all functions
module.exports = {
  submitIncidentReport,
  getIncidentReportsByUser,
  subscribeToIncidentReports,
};


