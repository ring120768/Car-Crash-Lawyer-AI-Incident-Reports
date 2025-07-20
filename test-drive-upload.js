
const { uploadReportToDrive } = require('./services/driveUploader');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    // Create reports directory if it doesn't exist
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Create a sample PDF content (just text for testing)
    const samplePdfContent = Buffer.from('Sample PDF content for testing Google Drive upload');
    const testFilePath = path.join(reportsDir, 'user-accident-report.pdf');
    
    // Write the test file
    fs.writeFileSync(testFilePath, samplePdfContent);
    console.log('✅ Created test PDF file');

    // Create a readable stream from the file
    const fileStream = fs.createReadStream(testFilePath);
    
    // Upload to Google Drive
    console.log('📤 Uploading to Google Drive...');
    const result = await uploadReportToDrive('user-accident-report.pdf', fileStream);
    
    console.log('✅ Upload successful!');
    console.log('Drive link:', result.webViewLink);
    console.log('File ID:', result.id);
    
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
})();
