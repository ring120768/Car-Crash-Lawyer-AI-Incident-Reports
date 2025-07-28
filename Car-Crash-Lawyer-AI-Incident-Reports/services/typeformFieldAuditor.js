// Utility script to detect new or unmapped fields in Typeform responses
const fetch = require('node-fetch');
const TYPEFORM_API_KEY = process.env.TYPEFORM_API_KEY;
const FORM_ID = 'WvM2ejru';

// These are the currently mapped Typeform field refs
const knownFieldRefs = new Set([
  'user_id', 'product_id', 'form_type', 'vehicle_make', 'vehicle_model',
  'vehicle_condition', 'insurance_company', 'policy_number', 'policy_holder',
  'cover_type', 'recovery_service', 'recovery_contact_number', 'recovery_contact_email',
  'emergency_contact_number', 'emergency_contact', 'upload_pics_front', 'upload_pics_rear',
  'upload_pics_passenger', 'upload_pics_driver', 'upload_license',
  'voice_transcription_url', 'location_what3words', 'incident_datetime'
]);

async function findNewFields() {
  const url = `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TYPEFORM_API_KEY}` }
  });
  const data = await res.json();

  const seenFields = new Set();
  data.items.forEach(response => {
    response.answers.forEach(ans => {
      const ref = ans.field?.ref;
      if (ref) seenFields.add(ref);
    });
  });

  const unknown = [...seenFields].filter(ref => !knownFieldRefs.has(ref));
  if (unknown.length) {
    console.warn('⚠️ Unmapped Typeform fields detected:', unknown);
  } else {
    console.log('✅ All Typeform fields are currently mapped.');
  }
}

findNewFields();
