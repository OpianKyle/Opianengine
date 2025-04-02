import { Router } from 'express';
import { createConnection } from '../db';
import { generateReferralCode } from '../utils/referral';
import { sendEmail, formatRegistrationEmail, sendAdminRegistrationNotification } from '../utils/emailService';
import { queryCache } from '../utils/query-cache';
import { checkAgent } from '../auth';

const router = Router();

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
        address: customer.address,
        city: customer.city,
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
      suburb, postalCode, selectedPackage, bankName,
      accountType, accountNumber, accountHolderName,
      branchCode, isSouthAfrican, hasCreditCard
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

    // Generate a temporary password
    const defaultPassword = '$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS'; // hashed '123456'

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
          address, city, postal_code, selected_package, bank_name,
          account_type, account_number, account_holder_name, branch_code,
          is_south_african, has_credit_card, is_enabled, points,
          agent_id, is_agent, referral_code, mandate_accepted, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, UPPER(?), ?,
          ?, ?, ?, ?,
          ?, ?, 1, ?,
          ?, 0, ?, 1, NOW()
        )`;

      const insertParams = [
        email,
        defaultPassword,
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

      await connection.commit();

      // Send welcome email
      try {
        const { text, html } = formatRegistrationEmail(firstName, email);
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
            addressLine1,
            suburb,
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
            mandateAccepted: true,
            agentId: req.user.id
          };
          
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
        temporaryPassword: '123456',
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
      gender, idNumber, occupation, industry, address,
      city, postalCode, selectedPackage, bankName,
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
          industry = ?, address = ?, city = ?, postal_code = ?,
          selected_package = UPPER(?), bank_name = ?, account_type = ?,
          account_number = ?, account_holder_name = ?, branch_code = ?,
          is_south_african = ?, has_credit_card = ?
        WHERE id = ? AND agent_id = ?`,
        [
          email, firstName, lastName, phoneNumber,
          dateOfBirth, gender, idNumber, occupation,
          industry, address, city, postalCode,
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
      
      // First check if there are any customers with this agent_id
      const [customerCheck] = await connection.execute(
        'SELECT id, email, agent_id, selected_package FROM users WHERE agent_id = ? LIMIT 5', 
        [req.user.id]
      );
      console.log('Customer check results:', JSON.stringify(customerCheck));
      
      // Also check for customers that might be referred by this agent's referral code
      const [agentData] = await connection.execute(
        'SELECT referral_code FROM users WHERE id = ?',
        [req.user.id]
      );
      
      let referralCode = '';
      if (Array.isArray(agentData) && agentData.length > 0 && agentData[0].referral_code) {
        referralCode = agentData[0].referral_code;
        console.log('Agent referral code:', referralCode);
        
        const [referredCustomers] = await connection.execute(
          'SELECT id, email, referred_by, selected_package FROM users WHERE referred_by = ?',
          [referralCode]
        );
        console.log('Referred customers:', JSON.stringify(referredCustomers));
      }
      
      // Query 1: Total customers count for this agent
      const [totalCustomersResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE agent_id = ?',
        [req.user.id]
      );
      console.log('Total customers result:', JSON.stringify(totalCustomersResult));
      
      const totalCustomers = Array.isArray(totalCustomersResult) && totalCustomersResult.length > 0 
        ? totalCustomersResult[0].count 
        : 0;
      
      // Query 2: Active customers (enabled = 1)
      const [activeCustomersResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM users WHERE agent_id = ? AND is_enabled = 1',
        [req.user.id]
      );
      const activeCustomers = Array.isArray(activeCustomersResult) && activeCustomersResult.length > 0 
        ? activeCustomersResult[0].count 
        : 0;
      
      // Query 3: Total points assigned to customers of this agent
      const [totalPointsResult] = await connection.execute(
        'SELECT SUM(points) as total FROM users WHERE agent_id = ?',
        [req.user.id]
      );
      const totalPoints = Array.isArray(totalPointsResult) && totalPointsResult.length > 0 && totalPointsResult[0].total 
        ? Number(totalPointsResult[0].total) 
        : 0;
      
      // Query 4: Total commission amount (safely)
      let totalCommissions = 0;
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
          totalCommissions = Array.isArray(commissionsResult) && commissionsResult.length > 0 && commissionsResult[0].total 
            ? Number(commissionsResult[0].total) 
            : 0;
        } else {
          console.log('agent_commissions table does not exist yet');
        }
      } catch (error) {
        console.warn('Error fetching commissions:', error.message);
        // Continue with totalCommissions = 0
      }
        
      // Query 5: Get all customer packages count
      const [packageDistributionResult] = await connection.execute(
        `SELECT selected_package as package, COUNT(*) as count 
         FROM users 
         WHERE agent_id = ? 
         GROUP BY selected_package`,
        [req.user.id]
      );
      
      // Transform package distribution
      const packageDistribution: Record<string, number> = {};
      if (Array.isArray(packageDistributionResult)) {
        packageDistributionResult.forEach((pkg: any) => {
          if (pkg.package) {
            packageDistribution[pkg.package.toLowerCase()] = pkg.count;
          }
        });
      }
      
      // Prepare the response object
      const statistics = {
        totalCustomers,
        activeCustomers,
        totalPoints,
        totalCommissions,
        packageDistribution
      };
      
      // Store in cache for future requests
      queryCache.set(cacheKey, statistics);
      
      res.json(statistics);
    } finally {
      await connection.end();
    }
  } catch (error) {
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