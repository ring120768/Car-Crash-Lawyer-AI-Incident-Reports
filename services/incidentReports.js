// services/incidentReports.js  (Supabase version — no Firebase)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Submit a new incident report
async function submitIncidentReport(
  userId,
  vehicleMake,
  vehicleModel,
  voiceTranscriptionUrl,
  imagesUrl
) {
  // Adjust table/column names if yours differ
  const incidentReportData = {
    user_id: userId,
    vehicle_make: vehicleMake,
    vehicle_model: vehicleModel,
    voice_transcription_url: voiceTranscriptionUrl,
    images_url: imagesUrl,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('incident_reports')
    .insert([incidentReportData])
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase insert error:', error);
    throw error;
  }

  console.log('✅ Incident Report submitted and linked to USER_ID:', data?.id);
  return { success: true, reportId: data?.id, data };
}

// Get all incident reports for a specific user
async function getIncidentReportsByUser(userId) {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase select error:', error);
    throw error;
  }

  console.log(`📊 Found ${data?.length || 0} incident reports for user:`, userId);
  return data || [];
}

/**
 * Realtime listeners — optional.
 * Stubbed so existing imports don’t break.
 * If you want realtime later, wire up Supabase Realtime here.
 */
function subscribeToIncidentReports() {
  console.warn('⚠️ subscribeToIncidentReports: not implemented (Supabase Realtime TODO).');
  return () => {};
}

function subscribeToUserSignUps() {
  console.warn('⚠️ subscribeToUserSignUps: not implemented (Supabase Realtime TODO).');
  return () => {};
}

module.exports = {
  submitIncidentReport,
  getIncidentReportsByUser,
  subscribeToIncidentReports,
  subscribeToUserSignUps,
};

