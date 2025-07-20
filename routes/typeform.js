
const express = require('express');
const router = express.Router();
const { db } = require('../services/firebase');

// Typeform webhook endpoint
router.post('/', (req, res) => {
  try {
    console.log('Received Typeform webhook:', req.body);
    
    // Verify webhook secret if configured
    const webhookSecret = process.env.TYPEFORM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['typeform-signature'];
      // Add signature verification logic here if needed
    }
    
    // Process the typeform submission
    const formResponse = req.body.form_response;
    if (formResponse) {
      console.log('Form Response ID:', formResponse.token);
      console.log('Answers:', formResponse.answers);
      
      // Add your business logic here
      // e.g., save to database, send emails, etc.
    }
    
    res.status(200).json({ message: 'Webhook received successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
