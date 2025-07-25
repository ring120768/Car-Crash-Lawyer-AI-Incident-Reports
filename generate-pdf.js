// generate-pdf.js
const axios = require('axios');
const fs = require('fs');

// --- Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY; // Set as Replit Secret
const DOCX_TEMPLATE_PATH = './Car Crash Lawyer AI Incident Report .docx'; // Path to DOCX template
const OUTPUT_PDF_PATH = './output_incident_report.pdf'; // Where to save the PDF

// --- Fill these with your actual data/fields ---
const dataToFill = {
  "user_full_name": "Ian Ring",
  "incident_date": "2025-07-23",
  // Add all your fields...
};

async function fillAndDownloadPDF() {
  // Read DOCX template as base64
  let docxData;
  try {
    docxData = fs.readFileSync(DOCX_TEMPLATE_PATH).toString('base64');
  } catch (err) {
    console.error(`❌ Could not read DOCX template: ${DOCX_TEMPLATE_PATH}`);
    return;
  }

  try {
    // PDF.co API: replace text in DOCX template
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
      // Download the PDF file from PDF.co
      const pdfFile = await axios.get(response.data.url, { responseType: 'arraybuffer' });
      fs.writeFileSync(OUTPUT_PDF_PATH, pdfFile.data);
      console.log('✅ PDF created at', OUTPUT_PDF_PATH);
    } else {
      console.error('❌ PDF.co did not return a PDF URL:', response.data);
    }
  } catch (err) {
    if (err.response) {
      console.error('❌ PDF.co API error:', err.response.data);
    } else {
      console.error('❌ PDF generation failed:', err.message);
    }
  }
}

fillAndDownloadPDF();


