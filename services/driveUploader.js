
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

// Load credentials from secrets
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null,
  ['https://www.googleapis.com/auth/drive.file']
);

const drive = google.drive({ version: 'v3', auth });

/**
 * Uploads a file to a designated Google Drive folder
 * @param {string} filename - Name to assign in Drive
 * @param {Buffer|string} fileData - File content (Buffer for binary, string for text)
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - Uploaded file ID
 */
async function uploadToDrive(filename, fileData, mimeType = 'application/pdf') {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const media = {
      mimeType,
      body: typeof fileData === 'string' ? Readable.from([fileData]) : Readable.from(fileData),
    };

    const fileMetadata = {
      name: filename,
      parents: folderId ? [folderId] : undefined,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id',
    });

    console.log(`✅ File uploaded successfully. File ID: ${response.data.id}`);
    return response.data.id;
  } catch (err) {
    console.error('🚨 Google Drive Upload Failed:', err);
    throw err;
  }
}

module.exports = {
  uploadToDrive
};
