import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the email service file
const emailServicePath = path.join(__dirname, 'server/utils/emailService.ts');

// Read the file content
let fileContent = fs.readFileSync(emailServicePath, 'utf8');

// Replace Opian logo URLs with Base64 variable
fileContent = fileContent.replace(
  /src="https:\/\/opian\.co\.za\/Opian-white-logo\.svg"/g, 
  'src="${OPIAN_LOGO_BASE64}"'
);

// Replace Lance signature URLs with Base64 variable
fileContent = fileContent.replace(
  /src="https:\/\/opian\.co\.za\/lance\.png"/g, 
  'src="${SIGNATURE_BASE64}"'
);

// Write the updated content back to the file
fs.writeFileSync(emailServicePath, fileContent, 'utf8');

console.log('✅ Email image URLs have been replaced with Base64 encoded images');