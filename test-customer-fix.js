/**
 * This script updates the user insert SQL query in the generate-test-customers endpoint
 * to match the actual database schema (removing username and role columns)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'server', 'routes.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Look for the specific query in the generate-test-customers endpoint
const oldQueryPattern = /`INSERT INTO users \(\s*first_name, last_name, email, phone_number, username, password, \s*role, address, selected_package, premium_amount, \s*card_status, points, created_at\s*\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)`/g;

const newQuery = `\`INSERT INTO users (
              first_name, last_name, email, phone_number, password, 
              address, selected_package, 
              card_status, points, created_at,
              is_enabled, referral_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\``;

// Replace the query
const updatedContent = content.replace(oldQueryPattern, newQuery);

// Update the corresponding parameter array for the query
const oldParamPattern = /\[\s*firstName, lastName, email, mobileNumber, username, hashedPassword,\s*'CUSTOMER', address, selectedPackage, premiumAmount,\s*cardStatus, pointsBalance, createdAt\s*\]/g;

const newParams = `[
              firstName, lastName, email, mobileNumber, hashedPassword,
              address, selectedPackage, 
              cardStatus, pointsBalance, createdAt,
              true, \`REF\${Math.random().toString(36).substring(2, 10)}\`
            ]`;

const finalContent = updatedContent.replace(oldParamPattern, newParams);

// Save the updated file
fs.writeFileSync(filePath, finalContent, 'utf8');

console.log('Routes.ts has been updated successfully!');