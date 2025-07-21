const { db } = require('./firebase');

async function submitIncidentReport(userId, vehicleMake, vehicleModel, voiceTranscriptionUrl, imagesUrl) {
  try {
    // Validate that user exists first
    const userDoc = await db.collection('Car Crash Lawyer AI User Sign Up').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const incidentReportData = {
      user_id: userId,  // Link the report to the logged-in USER_ID
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      voice_transcription_url: voiceTranscriptionUrl,
      images_url: imagesUrl,
      created_at: new Date(),
    };

    // Add the incident report to Firestore (using correct collection name)
    const docRef = await db.collection('Car Crash Lawyer AI Incident Reports').add(incidentReportData);
    console.log('✅ Incident Report submitted and linked to USER_ID:', docRef.id);

    return { success: true, reportId: docRef.id };

  } catch (error) {
    console.error('❌ Error submitting incident report:', error);
    throw error;
  }
}

module.exports = {
  submitIncidentReport,
  getIncidentReportsByUser
};
// Get all incident reports for a specific user
async function getIncidentReportsByUser(userId) {
  try {
    // Query the flat collection filtering by user_id
    const snapshot = await db.collection('Car Crash Lawyer AI Incident Reports')
      .where('user_id', '==', userId)
      .get();

    if (snapshot.empty) {
      console.log('📭 No incident reports found for user:', userId);
      return [];
    }

    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    console.log(`📊 Found ${reports.length} incident reports for user:`, userId);
    return reports;

  } catch (error) {
    console.error('❌ Error fetching incident reports for user:', error.message);
    throw error;
  }
}

