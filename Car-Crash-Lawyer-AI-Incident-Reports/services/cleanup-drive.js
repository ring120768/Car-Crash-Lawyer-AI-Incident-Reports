const { google } = require('googleapis');
require('dotenv').config();

async function cleanupOldFiles() {
  const credsBase64 = process.env.GOOGLE_DRIVE_CREDENTIALS_BASE64;
  if (!credsBase64) throw new Error("Missing GOOGLE_DRIVE_CREDENTIALS_BASE64");

  const creds = JSON.parse(Buffer.from(credsBase64, 'base64').toString('utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  const drive = google.drive({ version: 'v3', auth });

  // Files older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const result = await drive.files.list({
    q: `mimeType='application/pdf' and trashed=false and modifiedTime < '${cutoff}'`,
    fields: 'files(id, name, modifiedTime)'
  });

  const files = result.data.files;
  if (files.length === 0) {
    console.log('✅ No old PDF files found.');
    return;
  }

  for (const file of files) {
    await drive.files.delete({ fileId: file.id });
    console.log(`🗑️ Deleted: ${file.name} (modified ${file.modifiedTime})`);
  }
}

cleanupOldFiles().catch(err => {
  console.error('❌ Error in cleanup script:', err.message);
});

