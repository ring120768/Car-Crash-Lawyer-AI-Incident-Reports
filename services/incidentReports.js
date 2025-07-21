
const { db } = require('./firebase');

async function submitIncidentReport(userId, vehicleMake, vehicleModel, voiceTranscriptionUrl, imagesUrl) {
  try {
    // Validate that user exists first
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const incidentReportData = {
      user_id: userId,  // USER_ID passed as parameter
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      voice_transcription_url: voiceTranscriptionUrl,
      images_url: imagesUrl,
      created_at: new Date(),
    };

    // Add the incident report to Firestore (using correct collection name)
    const docRef = await db.collection('incident_reports').add(incidentReportData);
    console.log('✅ Incident Report submitted with ID:', docRef.id);
    
    return { success: true, reportId: docRef.id };

  } catch (error) {
    console.error('❌ Error submitting incident report:', error);
    throw error;
  }
}

module.exports = {
  submitIncidentReport
};
