import { Router } from 'express';
import { createConnection } from '../db';
import { generateReferralCode } from '../utils/referral';
import { sendEmail, formatRegistrationEmail, sendAdminRegistrationNotification, generateRandomPassword } from '../utils/emailService';
import { queryCache } from '../utils/query-cache';
import { checkAgent } from '../auth';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const router = Router();

// Create local scrypt promisification
const scryptAsync = promisify(scrypt);

// Local implementation of hashPassword that matches auth.ts implementation
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Apply checkAgent middleware to all routes in this router
router.use(checkAgent);

// Helper function to generate a unique referral code
async function generateUniqueReferralCode(connection: any): Promise<string> {
  let isUnique = false;
  let referralCode = '';

  while (!isUnique) {
    referralCode = generateReferralCode();
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ?',
      [referralCode]
    );
    isUnique = !existing || (Array.isArray(existing) && existing.length === 0);
  }

  return referralCode;
}

// Helper function to get package price
async function getPackagePrice(connection: any, packageName: string): Promise<number> {
  // Get package price from the table
  const [prices] = await connection.execute(
    'SELECT premium_amount FROM package_premium_amounts WHERE package_type = ?',
    [packageName?.toUpperCase()]
  );

  console.log('Fetched package price:', {
    packageName: packageName?.toUpperCase(),
    prices,
    amount: prices.length > 0 ? Number(prices[0].premium_amount) : 0
  });

  return prices.length > 0 ? Number(prices[0].premium_amount) : 0;
}

// We are now using the checkAgent middleware imported from '../auth' at the router level
// This ensures all routes in this router require agent authentication

// Get agent's customers
router.get('/customers', async (req: any, res) => {
  const connection = await createConnection();
  try {
    const [customers] = await connection.execute(
      `SELECT u.*, 
       COALESCE(
         GROUP_CONCAT(
           JSON_OBJECT(
             'id', p.id,
             'name', p.name,
             'description', p.description
           )
         ),
         '[]'
       ) as products
       FROM users u
       LEFT JOIN product_assignments pa ON u.id = pa.user_id
       LEFT JOIN products p ON pa.product_id = p.id
       WHERE u.agent_id = ?
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.user.id]
    );

    const transformedCustomers = customers?.map((customer: any) => {
      let products = [];
      try {
        products = JSON.parse(customer.products || '[]');
      } catch (e) {
        console.error('Error parsing products:', e);
      }

      return {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phoneNumber: customer.phone_number,
        idNumber: customer.id_number,
        dateOfBirth: customer.date_of_birth,
        gender: customer.gender,
        occupation: customer.occupation,
        industry: customer.industry,
        addressLine1: customer.address,
        suburb: customer.suburb,
        city: customer.city,
        province: customer.province,
        postalCode: customer.postal_code,
        selectedPackage: customer.selected_package,
        isSouthAfrican: Boolean(customer.is_south_african),
        hasCreditCard: Boolean(customer.has_credit_card),
        points: customer.points,
        bankName: customer.bank_name,
        accountType: customer.account_type,
        accountNumber: customer.account_number,
        accountHolderName: customer.account_holder_name,
        branchCode: customer.branch_code,
        createdAt: customer.created_at,
        isEnabled: Boolean(customer.is_enabled),
        referralCode: customer.referral_code,
        products: products
      };
    });

    res.json(transformedCustomers);
  } catch (error) {
    console.error('Error fetching agent customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  } finally {
    await connection.end();
  }
});

// Create customer as agent
router.post('/customers/create', async (req: any, res) => {
  const connection = await createConnection();
  try {
    const { 
      email, firstName, lastName, mobileNumber, dateOfBirth,
      gender, idNumber, occupation, industry, addressLine1,
      suburb, city, province, postalCode, selectedPackage, bankName,
      accountType, accountNumber, accountHolderName,
      branchCode, isSouthAfrican, hasCreditCard, leadId
    } = req.body;

    // Check for existing user
    const [existingUsers] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Generate a unique referral code
    const referralCode = await generateUniqueReferralCode(connection);

    // Generate a random password
    const plainPassword = generateRandomPassword(12);
    
    // Use our local implementation of hashPassword
    const hashedPassword = await hashPassword(plainPassword);

    // Calculate initial points based on package
    let initialPoints = 0;
    const normalizedPackage = selectedPackage?.toUpperCase();
    switch (normalizedPackage) {
      case 'OPPORTUNITY': initialPoints = 2500; break;
      case 'MOMENTUM': initialPoints = 5000; break;
      case 'PROSPER': initialPoints = 7500; break;
      case 'PRESTIGE': initialPoints = 10000; break;
      case 'PINNACLE': initialPoints = 12500; break;
      default: initialPoints = 2500;
    }

    // Get package price
    const packagePrice = await getPackagePrice(connection, normalizedPackage);

    console.log('Creating customer with package:', {
      originalPackage: selectedPackage,
      normalizedPackage,
      packagePrice,
      initialPoints
    });

    await connection.beginTransaction();

    try {
      // Insert user with explicit column names
      const insertQuery = `
        INSERT INTO users (
          email, password, first_name, last_name, phone_number,
          date_of_birth, gender, id_number, occupation, industry,
          address, suburb, city, province, postal_code, selected_package, bank_name,
          account_type, account_number, account_holder_name, branch_code,
          is_south_african, has_credit_card, is_enabled, points,
          agent_id, is_agent, referral_code, mandate_accepted, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, UPPER(?), ?,
          ?, ?, ?, ?,
          ?, ?, 1, ?,
          ?, 0, ?, 1, NOW()
        )`;

      const insertParams = [
        email,
        hashedPassword,
        firstName,
        lastName,
        mobileNumber,
        dateOfBirth,
        gender,
        idNumber,
        occupation,
        industry,
        addressLine1,
        suburb,
        city || '', // Add city parameter
        province || '', // Add province parameter
        postalCode,
        selectedPackage,
        bankName,
        accountType,
        accountNumber,
        accountHolderName,
        branchCode,
        isSouthAfrican ? 1 : 0,
        hasCreditCard ? 1 : 0,
        initialPoints,
        req.user.id,
        referralCode
      ];

      const [userResult] = await connection.execute(insertQuery, insertParams);
      const userId = (userResult as any).insertId;

      // Record points transaction
      if (initialPoints > 0) {
        await connection.execute(
          `INSERT INTO transactions (
            user_id, points, type, description, status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            userId,
            initialPoints,
            'WELCOME_BONUS',
            `Initial points allocation for ${normalizedPackage} package (R${packagePrice})`,
            'PROCESSED'
          ]
        );
      }
      
      // Add to agent_commissions table
      try {
        // Check if agent_commissions table exists
        const [tableCheck] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'agent_commissions'
        `);

        if (tableCheck[0].count > 0) {
          console.log('Adding customer to agent_commissions table');
          
          // Calculate commission (30% for sign-up)
          const commissionPercentage = 30; // 30%
          const commissionAmount = packagePrice * commissionPercentage / 100;
          
          // Insert into agent_commissions
          await connection.execute(`
            INSERT INTO agent_commissions (
              agent_id, 
              customer_id, 
              commission_type, 
              package_type, 
              premium_amount, 
              commission_percentage, 
              commission_amount,
              status,
              created_at
            ) VALUES (?, ?, 'SIGNUP', ?, ?, ?, ?, 'PENDING', NOW())
          `, [
            req.user.id,
            userId,
            normalizedPackage,
            packagePrice,
            commissionPercentage,
            commissionAmount.toFixed(2)
          ]);
          
          console.log(`Added commission record for new customer ${userId} with agent ${req.user.id}`);
        } else {
          console.log('agent_commissions table does not exist, skipping commission record');
        }
      } catch (error) {
        console.error('Error adding to agent_commissions table:', error);
        // Continue the process even if commission record fails
      }

      // Update lead status if this customer was created from a lead
      if (leadId) {
        try {
          console.log(`Updating lead ID ${leadId} to status 'converted'`);
          await connection.execute(
            'UPDATE leads SET status = ?, updated_at = NOW() WHERE id = ? AND assigned_agent_id = ?',
            ['converted', leadId, req.user.id]
          );
        } catch (leadError) {
          console.error('Error updating lead status:', leadError);
          // Continue process even if lead update fails
        }
      }

      await connection.commit();

      // Send welcome email
      try {
        const { text, html } = formatRegistrationEmail(firstName, email, plainPassword);
        await sendEmail({
          to: email,
          subject: "Welcome to OPIAN Rewards!",
          text,
          html
        });
        
        // Send admin notification email with customer details
        try {
          const customerData = {
            firstName,
            lastName,
            email,
            mobileNumber,
            dateOfBirth,
            gender,
            idNumber,
            occupation,
            industry,
            // Map the address fields correctly
            address: addressLine1,
            suburb,
            city,
            province,
            postalCode,
            selectedPackage: normalizedPackage,
            bankName,
            accountType,
            accountNumber,
            accountHolderName,
            branchCode,
            isSouthAfrican,
            hasCreditCard,
            createdAt: new Date().toISOString(),
            mandate_accepted: true,  // Use the correct field name (mandate_accepted instead of mandateAccepted)
            agentId: req.user.id,
            agentName: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim()
          };
          
          console.log('Sending admin notification with data:', JSON.stringify({
            address: customerData.address,
            suburb: customerData.suburb,
            city: customerData.city,
            province: customerData.province,
            postalCode: customerData.postalCode,
            mandate_accepted: customerData.mandate_accepted
          }));
          
          await sendAdminRegistrationNotification(customerData);
        } catch (adminEmailError) {
          console.error('Failed to send admin notification email:', adminEmailError);
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.status(201).json({
        id: userId,
        email,
        firstName,
        lastName,
        points: initialPoints,
        selectedPackage: normalizedPackage,
        packagePrice,
        temporaryPassword: plainPassword,
        agentId: req.user.id,
        isEnabled: true,
        mandateAccepted: true,
        referralCode
      });

    } catch (error) {
      await connection.rollback();
      console.error('Transaction failed:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer', details: error.message });
  } finally {
    await connection.end();
  }
});

// Update customer details
router.put('/customers/:id/update', async (req: any, res) => {
  const customerId = req.params.id;
  const connection = await createConnection();

  try {
    // Verify the customer belongs to this agent
    const [customers] = await connection.execute(
      'SELECT id FROM users WHERE id = ? AND agent_id = ?',
      [customerId, req.user.id]
    );

    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(404).json({ error: "Customer not found or unauthorized" });
    }

    const { 
      email, firstName, lastName, phoneNumber, dateOfBirth,
      gender, idNumber, occupation, industry, addressLine1,
      suburb, city, province, postalCode, selectedPackage, bankName,
      accountType, accountNumber, accountHolderName,
      branchCode, isSouthAfrican, hasCreditCard
    } = req.body;

    // Get package price for the selected package
    const packagePrice = await getPackagePrice(connection, selectedPackage);

    console.log('Updating customer with data:', {
      id: customerId,
      email,
      firstName,
      lastName,
      selectedPackage,
      packagePrice,
      agentId: req.user.id
    });

    await connection.beginTransaction();

    try {
      // Update user details with correct package name handling
      await connection.execute(
        `UPDATE users SET
          email = ?, first_name = ?, last_name = ?, phone_number = ?,
          date_of_birth = ?, gender = ?, id_number = ?, occupation = ?,
          industry = ?, address = ?, suburb = ?, city = ?, province = ?, postal_code = ?,
          selected_package = UPPER(?), bank_name = ?, account_type = ?,
          account_number = ?, account_holder_name = ?, branch_code = ?,
          is_south_african = ?, has_credit_card = ?
        WHERE id = ? AND agent_id = ?`,
        [
          email, firstName, lastName, phoneNumber,
          dateOfBirth, gender, idNumber, occupation,
          industry, addressLine1, suburb, city, province, postalCode,
          selectedPackage, bankName, accountType,
          accountNumber, accountHolderName, branchCode,
          isSouthAfrican ? 1 : 0, hasCreditCard ? 1 : 0,
          customerId, req.user.id
        ]
      );

      // Verify the update
      const [updatedUser] = await connection.execute(
        'SELECT id, email, first_name, last_name, selected_package FROM users WHERE id = ?',
        [customerId]
      );

      await connection.commit();
      res.json({ 
        message: "Customer updated successfully",
        id: customerId,
        email: (updatedUser as any)[0]?.email,
        firstName: (updatedUser as any)[0]?.first_name,
        lastName: (updatedUser as any)[0]?.last_name,
        selectedPackage: (updatedUser as any)[0]?.selected_package,
        packagePrice
      });

    } catch (error) {
      await connection.rollback();
      console.error('Transaction failed:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer', details: error.message });
  } finally {
    await connection.end();
  }
});

// Get agent statistics (total customers, active customers, total points assigned, commissions)
router.get('/statistics', async (req: any, res) => {
  try {
    // Get the cache key based on the agent ID
    const cacheKey = `agent_statistics_${req.user.id}`;
    console.log('Agent statistics request for agent ID:', req.user.id);
    
    // Create a direct connection without using the cache first
    const connection = await createConnection();
    try {
      // Check the agent record in users table
      const [agentRecord] = await connection.execute(
        'SELECT id, email, is_agent, referral_code FROM users WHERE id = ?',
        [req.user.id]
      );
      console.log('Agent record:', JSON.stringify(agentRecord));
      
      // First check database schema for agent_id column
      const [columnCheck] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'agent_id'`
      );
      console.log('Column check for agent_id:', JSON.stringify(columnCheck));
      
      // Determine which approach to use for counting customers:
      // 1. If agent_id column exists in users table - count by agent_id
      // 2. Otherwise, count customers referred by this agent's referral code
      
      let useAgentIdField = Array.isArray(columnCheck) && columnCheck.length > 0;
      let referralCode = '';
      
      // Get the agent's referral code from the agent record we already retrieved
      if (Array.isArray(agentRecord) && agentRecord.length > 0 && agentRecord[0].referral_code) {
        referralCode = agentRecord[0].referral_code;
      } else {
        // If no referral code yet found, query again specifically for the referral code
        const [agentCodeData] = await connection.execute(
          'SELECT referral_code FROM users WHERE id = ?',
          [req.user.id]
        );
        if (Array.isArray(agentCodeData) && agentCodeData.length > 0 && agentCodeData[0].referral_code) {
          referralCode = agentCodeData[0].referral_code;
        }
      }
      console.log('Agent referral code:', referralCode);
      
      // Initialize statistics variables
      let finalTotalCustomers = 0;
      let finalActiveCustomers = 0;
      let finalTotalPoints = 0;
      let finalPackageDistribution: Record<string, number> = {};
      
      // Use both methods and combine results to ensure we're counting all customers
      
      // Method 1: Check for customers with agent_id
      let agentIdCustomers: any[] = [];
      if (useAgentIdField) {
        // First check if there are any customers with this agent_id
        const [customerCheck] = await connection.execute(
          'SELECT id, email, agent_id, selected_package, is_enabled, points FROM users WHERE agent_id = ?', 
          [req.user.id]
        );
        console.log('Agent ID customers check results:', JSON.stringify(customerCheck));
        
        if (Array.isArray(customerCheck) && customerCheck.length > 0) {
          agentIdCustomers = customerCheck;
          
          // Count active customers (enabled = 1)
          const activeCount = agentIdCustomers.filter(c => c.is_enabled === 1).length;
          finalActiveCustomers += activeCount;
          
          // Total points
          finalTotalPoints += agentIdCustomers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
          
          // Package distribution
          agentIdCustomers.forEach(customer => {
            if (customer.selected_package) {
              const pkg = customer.selected_package.toLowerCase();
              finalPackageDistribution[pkg] = (finalPackageDistribution[pkg] || 0) + 1;
            }
          });
        }
      }
      
      // Method 2: Check for customers referred by this agent's code
      let referredCustomers: any[] = [];
      if (referralCode) {
        const [referredResult] = await connection.execute(
          'SELECT id, email, referred_by, selected_package, is_enabled, points FROM users WHERE referred_by = ?',
          [referralCode]
        );
        console.log('Referred customers:', JSON.stringify(referredResult));
        
        if (Array.isArray(referredResult) && referredResult.length > 0) {
          referredCustomers = referredResult;
          
          // Count active referred customers (enabled = 1)
          const activeRefCount = referredCustomers.filter(c => c.is_enabled === 1).length;
          finalActiveCustomers += activeRefCount;
          
          // Total points from referred customers
          finalTotalPoints += referredCustomers.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
          
          // Package distribution for referred customers
          referredCustomers.forEach(customer => {
            if (customer.selected_package) {
              const pkg = customer.selected_package.toLowerCase();
              finalPackageDistribution[pkg] = (finalPackageDistribution[pkg] || 0) + 1;
            }
          });
        }
      }
      
      // Combine and deduplicate customers from both methods
      const allCustomers = [...agentIdCustomers];
      referredCustomers.forEach(refCust => {
        if (!allCustomers.some(c => c.id === refCust.id)) {
          allCustomers.push(refCust);
        }
      });
      
      // Set final total customers count
      finalTotalCustomers = allCustomers.length;
      console.log('Final total customers:', finalTotalCustomers);
      
      // Query for commissions
      let finalTotalCommissions = 0;
      try {
        // Check if the table exists first
        const [tableExists] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'agent_commissions'"
        );
        
        if (Array.isArray(tableExists) && tableExists.length > 0 && tableExists[0].count > 0) {
          const [commissionsResult] = await connection.execute(
            'SELECT SUM(commission_amount) as total FROM agent_commissions WHERE agent_id = ?',
            [req.user.id]
          );
          finalTotalCommissions = Array.isArray(commissionsResult) && commissionsResult.length > 0 && commissionsResult[0].total 
            ? Number(commissionsResult[0].total) 
            : 0;
          
          console.log('Total commissions:', finalTotalCommissions);
        } else {
          console.log('agent_commissions table does not exist yet');
        }
      } catch (error: any) {
        console.warn('Error fetching commissions:', error.message);
        // Continue with finalTotalCommissions = 0
      }
      
      // Prepare the response object
      const statistics = {
        totalCustomers: finalTotalCustomers,
        activeCustomers: finalActiveCustomers,
        totalPoints: finalTotalPoints,
        totalCommissions: finalTotalCommissions,
        packageDistribution: finalPackageDistribution
      };
      
      // Store in cache for future requests
      try {
        if (queryCache && typeof queryCache.set === 'function') {
          queryCache.set(cacheKey, statistics);
        }
      } catch (cacheError) {
        console.warn('Error setting cache:', cacheError);
      }
      
      res.json(statistics);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  } catch (error: any) {
    console.error('Error fetching agent statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agent statistics',
      totalCustomers: 0,
      activeCustomers: 0,
      totalPoints: 0,
      totalCommissions: 0,
      packageDistribution: {}
    });
  }
});

export default router;