/**
 * Generate Test Customers Script
 * 
 * This script allows you to create multiple test customer accounts
 * for demonstration purposes. It creates complete user records with
 * randomized but realistic data including:
 * - Personal information
 * - Package selection
 * - Points balance
 * - Card status
 * 
 * Usage: 
 * node scripts/generate-test-customers.js <number_of_customers>
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { scrypt, randomBytes } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

// Database connection
let pool;

// South African cities for address generation
const southAfricanCities = [
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Bloemfontein',
  'Port Elizabeth', 'East London', 'Kimberley', 'Polokwane', 'Nelspruit',
  'Pietermaritzburg', 'Rustenburg', 'Potchefstroom', 'George', 'Upington'
];

// Package options
const packages = ['OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE'];
const packagePrices = {
  'OPPORTUNITY': 350,
  'MOMENTUM': 450,
  'PROSPER': 550,
  'PRESTIGE': 695,
  'PINNACLE': 825
};

// Card status options
const cardStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'ACTIVATED', 'DECLINED'];

// Generate a random integer between min and max (inclusive)
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random date within the past year
function getRandomDate() {
  const now = new Date();
  const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const randomTime = pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime());
  return new Date(randomTime);
}

// Hash password using the same method as the main application
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Generate a random South African mobile number
function generateMobileNumber() {
  const prefixes = ['060', '061', '062', '063', '064', '065', '066', '067', '068', '071', '072', '073', '074', '076', '078', '079', '081', '082', '083', '084'];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNumbers = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return randomPrefix + randomNumbers;
}

// Generate a random email based on name
function generateEmail(firstName, lastName) {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'opianrewards.com'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  
  // Clean up name parts for email
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  
  // Add a random number to ensure uniqueness
  const randomNum = Math.floor(Math.random() * 1000);
  
  return `${cleanFirst}.${cleanLast}${randomNum}@${randomDomain}`;
}

// Generate a test customer with random data
async function generateTestCustomer() {
  // First names
  const firstNames = [
    'John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
    'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Nancy',
    'Sipho', 'Thandi', 'Mandla', 'Nomsa', 'Thabo', 'Lerato', 'Mpho', 'Nosipho', 'Themba', 'Zanele'
  ];
  
  // Last names
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
    'Nkosi', 'Ndlovu', 'Khumalo', 'Dlamini', 'Mkhize', 'Mokoena', 'Sithole', 'Molefe', 'Tshabalala', 'Mabaso'
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const email = generateEmail(firstName, lastName);
  const mobileNumber = generateMobileNumber();
  const selectedPackage = packages[Math.floor(Math.random() * packages.length)];
  const premiumAmount = packagePrices[selectedPackage];
  const address = `${getRandomInt(1, 999)} ${['Main', 'Park', 'Church', 'High', 'Oak', 'Pine', 'Cedar', 'Maple'][Math.floor(Math.random() * 8)]} ${['Street', 'Road', 'Avenue', 'Boulevard', 'Lane', 'Drive'][Math.floor(Math.random() * 6)]}, ${southAfricanCities[Math.floor(Math.random() * southAfricanCities.length)]}`;
  const cardStatus = cardStatuses[Math.floor(Math.random() * cardStatuses.length)];
  const pointsBalance = getRandomInt(0, 10000);
  const createdAt = getRandomDate();
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${getRandomInt(1, 999)}`;
  
  // Generate a standard password for test accounts
  const hashedPassword = await hashPassword('Password123!');
  
  return {
    firstName,
    lastName,
    email,
    mobileNumber,
    username,
    password: hashedPassword,
    role: 'CUSTOMER',
    address,
    selectedPackage,
    premiumAmount,
    cardStatus,
    pointsBalance,
    createdAt
  };
}

// Insert test customer into database
async function insertTestCustomer(customer) {
  try {
    // Insert into users table
    const [userResult] = await pool.execute(
      `INSERT INTO users (
        first_name, last_name, email, mobile_number, username, password, 
        role, address, selected_package, premium_amount, 
        card_status, points_balance, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.firstName, customer.lastName, customer.email,
        customer.mobileNumber, customer.username, customer.password,
        customer.role, customer.address, customer.selectedPackage,
        customer.premiumAmount, customer.cardStatus, customer.pointsBalance,
        customer.createdAt
      ]
    );

    const userId = userResult.insertId;
    console.log(`Created test customer: ${customer.firstName} ${customer.lastName} (ID: ${userId})`);
    
    return userId;
  } catch (error) {
    console.error(`Error creating test customer:`, error);
    throw error;
  }
}

// Main function to generate and insert multiple test customers
async function generateTestCustomers(count) {
  try {
    pool = await mysql.createPool({
      host: process.env.DB_HOST || process.env.DATABASE_HOST,
      port: process.env.DB_PORT || process.env.DATABASE_PORT || 3306,
      user: process.env.DB_USER || process.env.DATABASE_USER,
      password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD,
      database: process.env.DB_NAME || process.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Connected to database. Generating ${count} test customers...`);
    
    // Generate and insert customers
    for (let i = 0; i < count; i++) {
      const customer = await generateTestCustomer();
      await insertTestCustomer(customer);
    }
    
    console.log(`Successfully created ${count} test customers.`);
  } catch (error) {
    console.error('Error in script execution:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('Database connection closed.');
    }
  }
}

// Script entry point
(async () => {
  // Get number of customers to generate from command line arguments
  const args = process.argv.slice(2);
  const count = parseInt(args[0], 10) || 10; // Default to 10 if not specified
  
  if (isNaN(count) || count <= 0) {
    console.error('Please provide a valid positive number of customers to generate.');
    process.exit(1);
  }
  
  await generateTestCustomers(count);
})();