const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

router.post('/', (req, res) => {
  console.log('✅ Typeform webhook received!');
  console.log('Payload:', req.body); // Log the full body
  res.status(200).json({ message: 'Webhook received successfully' });
});

// Typeform specific endpoint for incident reports
router.post('/typeform', async (req, res) => {
  try {
    const formData = req.body.form_response.answers;

    const incidentData = {
      full_name: formData.find(f => f.field.id === 'FULL_NAME')?.text || '',
      email: formData.find(f => f.field.id === 'EMAIL')?.email || '',
      mobile_number: formData.find(f => f.field.id === 'MOBILE_NUMBER')?.phone_number || '',
      created_at: new Date().toISOString()
    };

    await db.collection('incident_reports').add(incidentData);

    res.status(200).send('Success');
  } catch (err) {
    console.error('Error saving to Firestore:', err);
    res.status(500).send('Failed to save');
  }
});

module.exports = router;