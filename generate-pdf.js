const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY;
const DOCX_TEMPLATE_PATH = path.join(__dirname, 'public', 'Car Crash Lawyer AI Incident Report.docx');
const OUTPUT_PDF_PATH = './output_incident_report.pdf';

// --- Sample Data to Fill ---
const dataToFill = {
  user_full_name: "Ian Ring",
  incident_date: "2025-07-23",
  email: "ian@example.com",
  insurance_company: "ABC Insurance Ltd",
  vehicle_make: "Tesla",
  vehicle_model: "Model Y",
  policy_number: "POL123456",
  statement_of_events: "A vehicle collided from the rear while stationary at red light.",
  // Add more fields matching your template
};

// --- PDF.co API call ---
async function fillAndDownloadPDF() {
  try {
    const docxData = fs.readFileSync(DOCX_TEMPLATE_PATH).toString('base64');

    const response = await axios.post(
      'https://api.pdf.co/v1/pdf/edit/replace-text',
      {
        name: "incident_report.pdf",
        url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
        async: false,
        replaceText: Object.entries(dataToFill).map(([key, value]) => ({
          searchString: `{{${key}}}`,
          replaceString: String(value)
        }))
      },
      {
        headers: {
          "x-api-key": PDFCO_API_KEY
        }
      }
    );

    if (response.data && response.data.url) {
      const pdfFile = await axios.get(response.data.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(OUTPUT_PDF_PATH, pdfFile.data);
      console.log(`✅ PDF created at ${OUTPUT_PDF_PATH}`);
    } else {
      console.error('❌ PDF.co error:', response.data);
    }
  } catch (err) {
    console.error('❌ PDF generation failed:', err.response?.data || err.message);
  }
}

fillAndDownloadPDF();



