const axios = require('axios');
require('dotenv').config();

// --- PDF.co Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY;
const PDF_TEMPLATE_URL = 'https://pdf-temp-files.s3.us-west-2.amazonaws.com/UI82J546HBN0Z7YBNVR701YEOVICILDH/f1040-filled.pdf';
const OUTPUT_PDF_NAME = 'filled_incident_report.pdf';

// --- Sample data to simulate Firestore output ---
const dataToFill = {
  user_full_name: "Ian Ring",
  incident_date: "2025-07-23",
  email: "ian@example.com",
  insurance_company: "ABC Insurance Ltd",
  vehicle_make: "Tesla",
  vehicle_model: "Model Y",
  policy_number: "POL123456",
  statement_of_events: "Vehicle collided while stationary at red light."
  // ✅ Add more fields matching your PDF field names
};

// Convert key-value pairs to PDF.co-compatible fields
const fields = Object.entries(dataToFill).map(([key, value]) => ({
  fieldName: key,
  pages: "1",  // Change to "0-" if your form is multi-page
  text: value
}));

// --- Fill the PDF via PDF.co API ---
async function fillAndDownloadPDF() {
  try {
    const response = await axios.post(
      'https://api.pdf.co/v1/pdf/edit/fields',
      {
        url: PDF_TEMPLATE_URL,
        name: OUTPUT_PDF_NAME,
        async: false,
        fields
      },
      {
        headers: {
          'x-api-key': PDFCO_API_KEY
        }
      }
    );

    if (response.data && response.data.url) {
      console.log('✅ Filled PDF available at:', response.data.url);
    } else {
      console.error('❌ PDF.co error:', response.data);
    }
  } catch (err) {
    console.error('❌ PDF generation failed:', err.response?.data || err.message);
  }
}

fillAndDownloadPDF();





