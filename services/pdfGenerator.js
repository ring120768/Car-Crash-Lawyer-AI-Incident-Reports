// services/pdfGenerator.js
const axios = require('axios');

async function generateUserSignupPdf(data) {
  const apiKey = process.env.PDFCO_API_KEY;
  const fileUrl = process.env.PDFCO_TEMPLATE_FILE_USER_SIGNUP;

  return await generatePdf(data, fileUrl, `User_Signup_${data.user_id}.pdf`, apiKey);
}

async function generateIncidentReportPdf(data) {
  const apiKey = process.env.PDFCO_API_KEY;
  const fileUrl = process.env.PDFCO_TEMPLATE_FILE_INCIDENT_REPORT;

  return await generatePdf(data, fileUrl, `Incident_Report_${data.user_id}.pdf`, apiKey);
}

async function generatePdf(data, fileUrl, filename, apiKey) {
  const payload = {
    url: fileUrl,
    name: filename,
    async: false,
    fields: data
  };

  const response = await axios.post(
    'https://api.pdf.co/v1/pdf/edit/add',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      }
    }
  );

  if (response.data && response.data.url) {
    const pdfResponse = await axios.get(response.data.url, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(pdfResponse.data);
  } else {
    throw new Error('PDF generation failed: ' + JSON.stringify(response.data));
  }
}

module.exports = {
  generateUserSignupPdf,
  generateIncidentReportPdf
};


