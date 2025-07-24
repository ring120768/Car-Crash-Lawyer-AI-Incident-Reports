// generate-pdf.js
const axios = require('axios');
const fs = require('fs');

// --- Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY; // Set this as a Replit Secret
const DOCX_TEMPLATE_PATH = './Car Crash Lawyer AI Incident Report .docx'; // Your DOCX template
const OUTPUT_PDF_PATH = './output_incident_report.pdf'; // Output file

// --- Data to Fill ---
const dataToFill = {
  // Add key:value pairs matching your template placeholders
  // For example:
  "user_full_name": "Ian Ring",
  "incident_date": "2025-07-23",
  // ...etc, all your fields
};

// --- PDF.co API call ---
async function fillAndDownloadPDF() {
  // Read DOCX as base64
  const docxData = fs.readFileSync(DOCX_TEMPLATE_PATH).toString('base64');
  try {
    const response = await axios.post(
      'https://api.pdf.co/v1/pdf/edit/replace-text',
      {
        name: "incident_report.pdf",
        url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
        async: false,
        replaceText: Object.entries(dataToFill).map(([key, value]) => ({
          searchString: `{{${key}}}`,
          replaceString: value
        }))
      },
      {
        headers: { "x-api-key": PDFCO_API_KEY }
      }
    );

    if (response.data && response.data.url) {
      // Download PDF file
      const pdfFile = await axios.get(response.data.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(OUTPUT_PDF_PATH, pdfFile.data);
      console.log('✅ PDF created at', OUTPUT_PDF_PATH);
    } else {
      console.error('❌ PDF.co error:', response.data);
    }
  } catch (err) {
    console.error('❌ PDF generation failed:', err.response ? err.response.data : err);
  }
}

fillAndDownloadPDF();
