// services/emailSender.js
const fs = require('fs');

async function sendEmailWithAttachment({ to, subject, body, attachmentBuffer, filename }) {
  // For now we log instead of using a real email service
  console.log(`📧 Sending email to: ${to.join(', ')}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log(`Attachment: ${filename}, ${attachmentBuffer.length} bytes`);

  // TODO: Replace with Nodemailer or Resend integration
  return true;
}

module.exports = { sendEmailWithAttachment };
