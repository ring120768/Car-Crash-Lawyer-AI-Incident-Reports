// encode-firebase.js
// Run this script to base64-encode your Firebase Admin JSON credentials file

const fs = require('fs');

// 1. CHANGE THIS: Enter the filename of your Firebase Admin JSON key below
const filename = 'car-crash-lawyer-ai-firebase-adminsdk-e5e81de993.json'; // <-- update if your file is named differently

// 2. Read your JSON credentials (does NOT modify the original file)
const json = fs.readFileSync(filename, 'utf8');

// 3. Ensure it's a one-liner (removes all line breaks/formatting)
const oneLine = JSON.stringify(JSON.parse(json));

// 4. Encode as base64
const base64 = Buffer.from(oneLine).toString('base64');

// 5. Output the base64 string to your console (copy this for your Replit secret)
console.log('\nPaste this into your Replit secret:');
console.log('='.repeat(32));
console.log(base64);
console.log('='.repeat(32));

// 6. Optionally, save as a text file for backup
fs.writeFileSync('firebase_creds_base64.txt', base64);

console.log('\nSaved base64 string to firebase_creds_base64.txt');


