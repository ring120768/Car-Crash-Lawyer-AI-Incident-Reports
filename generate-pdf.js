const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- Config ---
const PDFCO_API_KEY = process.env.PDFCO_API_KEY;
const DOCX_TEMPLATE_PATH = path.join(__dirname, 'public', 'public', 'Car Crash Lawyer AI Incident Report .docx');
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
    // Check if template file exists
    if (!fs.existsSync(DOCX_TEMPLATE_PATH)) {
      throw new Error(`Template file not found: ${DOCX_TEMPLATE_PATH}`);
    }

    console.log(`📄 Reading template from: ${DOCX_TEMPLATE_PATH}`);
    const docxData = fs.readFileSync(DOCX_TEMPLATE_PATH).toString('base64');
    
    // Validate API key
    if (!PDFCO_API_KEY) {
      throw new Error('PDFCO_API_KEY environment variable is not set');
    }

    const replaceTextArray = Object.entries(dataToFill).map(([key, value]) => ({
      searchString: `{{${key}}}`,
      replaceString: String(value || '')
    }));

    console.log(`🔍 Search/replace pairs:`, replaceTextArray);

    // First, let's try converting the DOCX to PDF without text replacement
    const convertResponse = await axios.post(
      'https://api.pdf.co/v1/pdf/convert/from/docx',
      {
        name: "converted_template.pdf",
        url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxData}`,
        async: false
      },
      {
        headers: {
          "x-api-key": PDFCO_API_KEY
        }
      }
    );

    console.log('📋 Convert response:', convertResponse.data);

    if (convertResponse.data && convertResponse.data.url) {
      // Now try to replace text in the PDF
      const pdfFile = await axios.get(convertResponse.data.url, { responseType: 'arraybuffer' });
      const pdfBase64 = Buffer.from(pdfFile.data).toString('base64');

      const replaceResponse = await axios.post(
        'https://api.pdf.co/v1/pdf/edit/replace-text',
        {
          name: "incident_report.pdf",
          url: `data:application/pdf;base64,${pdfBase64}`,
          async: false,
          replaceText: replaceTextArray
        },
        {
          headers: {
            "x-api-key": PDFCO_API_KEY
          }
        }
      );

      console.log('🔄 Replace response:', replaceResponse.data);

      if (replaceResponse.data && replaceResponse.data.url) {
        const finalPdfFile = await axios.get(replaceResponse.data.url, { responseType: 'arraybuffer' });
        fs.writeFileSync(OUTPUT_PDF_PATH, finalPdfFile.data);
        console.log(`✅ PDF created at ${OUTPUT_PDF_PATH}`);
      } else {
        // If text replacement fails, just save the converted PDF
        fs.writeFileSync(OUTPUT_PDF_PATH, pdfFile.data);
        console.log(`⚠️ Text replacement failed, but PDF created at ${OUTPUT_PDF_PATH}`);
        console.log('Replace error:', replaceResponse.data);
      }
    } else {
      console.error('❌ PDF conversion failed:', convertResponse.data);
    }
  } catch (err) {
    console.error('❌ PDF generation failed:', err.response?.data || err.message);
  }
}

fillAndDownloadPDF();



