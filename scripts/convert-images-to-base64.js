import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to our images
const opianLogoWhitePath = path.join(__dirname, '../client/public/opian-logo-white.png');
const lanceImagePath = path.join(__dirname, '../client/public/lance.png');

// Read the images as buffer
const opianLogoWhiteBuffer = fs.readFileSync(opianLogoWhitePath);
const lanceImageBuffer = fs.readFileSync(lanceImagePath);

// Convert to base64
const opianLogoWhiteBase64 = `data:image/png;base64,${opianLogoWhiteBuffer.toString('base64')}`;
const lanceImageBase64 = `data:image/png;base64,${lanceImageBuffer.toString('base64')}`;

// Output the base64 strings for adding to base64Images.ts
console.log('OPIAN_LOGO_WHITE_BASE64:');
console.log(opianLogoWhiteBase64);
console.log('\nLANCE_IMAGE_BASE64:');
console.log(lanceImageBase64);

// Optional: Estimate size of these images in KB
const opianLogoWhiteSize = Math.round(opianLogoWhiteBase64.length / 1024);
const lanceImageSize = Math.round(lanceImageBase64.length / 1024);

console.log(`\nOpian logo white size: ~${opianLogoWhiteSize}KB`);
console.log(`Lance image size: ~${lanceImageSize}KB`);