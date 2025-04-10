/**
 * Temporary script to generate and verify agent JWT tokens
 * This helps diagnose issues with agent authentication
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-testing';

console.log('JWT_SECRET variable length:', JWT_SECRET ? JWT_SECRET.length : 'Not set');

// Function to generate a new token
function generateToken(userId, isAgent = true) {
  // Create a payload with necessary fields
  const payload = {
    id: userId,
    is_admin: false,
    is_super_admin: false,
    is_agent: isAgent,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year expiration
  };
  
  // Sign the token
  return jwt.sign(payload, JWT_SECRET);
}

// Function to verify a token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      valid: true,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

// Generate token for agent with ID 160
const agentId = 160;
const token = generateToken(agentId);

console.log(`\nNew token for agent ID ${agentId}:`);
console.log(token);

// Verify the token we just created
const verification = verifyToken(token);
console.log('\nVerification of new token:');
console.log(verification);

// Parse and verify any provided token for testing
const existingToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTYwLCJpc19hZG1pbiI6ZmFsc2UsImlzX3N1cGVyX2FkbWluIjpmYWxzZSwiaXNfYWdlbnQiOnRydWUsImlhdCI6MTcxMjUzMzc0NSwiZXhwIjoxNzQ0MDY5NzQ1fQ.YkLKSF-1kN_PVXwQ6-7oqrUvEVPYLJVUWMkrZ7LMTno';

console.log('\nVerification of existing token:');
console.log(verifyToken(existingToken));