
const express = require('express');
const router = express.Router();

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

module.exports = router;
