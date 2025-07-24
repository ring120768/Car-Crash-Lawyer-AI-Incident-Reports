// encode-firebase.js
const fs = require('fs');
const filename = 'car-crash-lawyer-ai-firebase-adminsdk-fbsvc.json'; // (update if different)
const json = fs.readFileSync(filename, 'utf8');
const oneLine = JSON.stringify(JSON.parse(json));
const base64 = Buffer.from(oneLine).toString('base64');
console.log('\nPaste this into your Replit secret:');
console.log('='.repeat(32));
console.log(base64);
console.log('='.repeat(32));
fs.writeFileSync('firebase_creds_base64.txt', base64);
console.log('\nSaved base64 string to firebase_creds_base64.txt');
