const { google } = require('googleapis');

/*
 * Create a Drive client using a service account.  Prefer the base64‑encoded
 * `GOOGLE_DRIVE_CREDENTIALS_BASE64` env var (which matches the format used
 * elsewhere in this project) but fall back to `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY`
 * for backward compatibility.  If neither variable is defined the caller
 * must throw.
 */
function getDriveClient() {
  let credentials;
  // Try decoding the base64 credentials first
  if (process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64) {
    try {
      credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64, 'base64').toString('utf8')
      );
    } catch (err) {
      throw new Error('Failed to decode GOOGLE_DRIVE_CREDENTIALS_BASE64: ' + err.message);
    }
  } else if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY) {
    credentials = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY);
  } else {
    throw new Error(
      'No Google Drive credentials found. Set either GOOGLE_DRIVE_CREDENTIALS_BASE64 or GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY.'
    );
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

// Default drive instance used by legacy helper functions.
const drive = getDriveClient();

/**
 * Uploads a file to a designated Google Drive folder.
 * @param {string} filename - Name to assign in Drive
 * @param {Buffer|string} fileData - File content
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - Uploaded file ID
 */
async function uploadToDrive(filename, fileData, mimeType = 'application/pdf') {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const media = {
      mimeType,
      body: typeof fileData === 'string'
        ? require('stream').Readable.from([fileData])
        : require('stream').Readable.from(fileData),
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

const uploadReportToDrive = async (fileName, fileContent) => {
  try {
    const fileMetadata = {
      name: fileName,
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
    };

    const media = {
      mimeType: 'application/pdf',
      body: fileContent, // this should be a readable stream or buffer
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('✅ Uploaded file to Drive:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading to Google Drive:', error.message);
    throw error;
  }
};

const fs = require('fs');

async function uploadToGoogleDrive(authClient, filePath, fileName, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
  const driveOAuth = google.drive({ version: 'v3', auth: authClient });

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined,
  };

  const media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(filePath),
  };

  const response = await driveOAuth.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  console.log('✅ File uploaded to Drive with OAuth:', response.data);
  return response.data;
}

/*
 * Additional helpers for per‑user storage in Google Drive.  The
 * main application stores completed incident reports, images and
 * voice transcripts in a folder named after the user’s UID.  When
 * uploading files for a new user, a folder is created on the fly.  A
 * shareable link is returned so the user can download their report.
 *
 * NOTE: Google Drive’s API does not support an expiration time on
 * permissions when the role is `anyoneWithLink`.  To enforce a
 * 30‑day retention you must schedule deletion or permission removal
 * yourself (for example using a cron job).  See
 * https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create#expirationtime
 * for details.
 */

/**
 * Find or create a folder for a specific user.  Folders are created
 * under the parent folder defined in GOOGLE_DRIVE_PARENT_FOLDER_ID.
 *
 * @param {string} userId - Firebase Auth UID of the user
 * @returns {Promise<string>} - Google Drive folder ID
 */
async function getOrCreateUserFolder(userId) {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID;
  // 1. Search for an existing folder with this userId
  const query = `mimeType='application/vnd.google-apps.folder' and name='${userId}' and trashed=false`;
  const listRes = await drive.files.list({ q: query, fields: 'files(id, name)' });
  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }
  // 2. Create a new folder
  const fileMetadata = {
    name: userId,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  };
  const createRes = await drive.files.create({ resource: fileMetadata, fields: 'id' });
  return createRes.data.id;
}

/**
 * Upload a file into a user’s folder.  Returns the file ID and
 * webViewLink.
 *
 * @param {string} userId - UID for user folder
 * @param {string} filename - Desired filename in Drive
 * @param {Buffer|string|fs.ReadStream} fileData - File content
 * @param {string} mimeType - MIME type
 * @returns {Promise<{fileId: string, webViewLink: string}>}
 */
async function uploadToUserFolder(userId, filename, fileData, mimeType = 'application/pdf') {
  const folderId = await getOrCreateUserFolder(userId);
  const mediaBody = typeof fileData === 'string' || Buffer.isBuffer(fileData)
    ? require('stream').Readable.from([fileData])
    : fileData; // assume already a readable stream
  const media = { mimeType, body: mediaBody };
  const fileMetadata = { name: filename, parents: [folderId] };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id, webViewLink' });
  return { fileId: res.data.id, webViewLink: res.data.webViewLink };
}

/**
 * Share a file with anyone who has the link.  Returns the webViewLink.
 * @param {string} fileId
 * @returns {Promise<string>} - Public link
 */
async function createPublicLink(fileId) {
  // Create permission for anyone with link
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' },
  });
  const { data } = await drive.files.get({ fileId, fields: 'webViewLink' });
  return data.webViewLink;
}

/**
 * Schedule deletion of a file after 30 days.  This helper simply
 * records the expiration date and relies on an external cron job to
 * purge expired files.  In production you would integrate with
 * Cloud Scheduler, Pub/Sub, or a similar mechanism to periodically
 * invoke deletion of files whose expiration timestamp has passed.
 *
 * @param {string} fileId
 * @param {Date} uploadedAt
 * @param {number} daysToKeep
 */
async function recordExpiration(fileId, uploadedAt = new Date(), daysToKeep = 30) {
  // Here we would write to Firestore or another database with the
  // fileId and expiration timestamp.  The cleanup job would read
  // these records and call drive.files.delete({ fileId }) when due.
  const expiresAt = new Date(uploadedAt.getTime() + daysToKeep * 24 * 60 * 60 * 1000);
  console.log(`⏳ File ${fileId} expires at ${expiresAt.toISOString()}`);
  // Example Firestore integration (commented out – implement to suit your project):
  // const { db } = require('./firebase');
  // await db.collection('driveFileExpirations').doc(fileId).set({ expiresAt });
}

module.exports = {
  uploadToDrive,
  uploadReportToDrive,
  uploadToGoogleDrive,
  getDriveClient,
  getOrCreateUserFolder,
  uploadToUserFolder,
  createPublicLink,
  recordExpiration,
};
