import { Router } from 'express';
import { createConnection } from '../db';
import { generateReferralCode } from '../utils/referral';
import { sendEmail, formatRegistrationEmail } from '../utils/emailService';

const router = Router();

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

// Middleware to check if user is an agent
router.use(async (req: any, res, next) => {
  console.log('Agent route authentication check:', {
    isAuthenticated: req.isAuthenticated(),
    hasSession: !!req.session,
    user: req.user,
    url: req.url
  });

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const connection = await createConnection();
  try {
    // Verify agent status
    const [agent] = await connection.execute(
      'SELECT is_agent FROM users WHERE id = ? AND is_agent = 1',
      [req.user.id]
    );

    if (!agent || !Array.isArray(agent) || agent.length === 0) {
      return res.status(403).json({ error: "Not authorized as agent" });
    }

    next();
  } catch (error) {
    console.error('Error checking agent status:', error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await connection.end();
  }
});

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
  console.log('Create customer request received:', {
    isAuthenticated: req.isAuthenticated(),
    hasSession: !!req.session,
    agentId: req.user?.id
  });

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

    // Calculate initial points
    let initialPoints = 0;
    switch (selectedPackage?.toUpperCase()) {
      case 'OPPORTUNITY': initialPoints = 2500; break;
      case 'MOMENTUM': initialPoints = 5000; break;
      case 'PROSPER': initialPoints = 7500; break;
      case 'PRESTIGE': initialPoints = 10000; break;
      case 'PINNACLE': initialPoints = 12500; break;
      default: initialPoints = 0;
    }

    await connection.beginTransaction();

    try {
      const insertQuery = `
        INSERT INTO users (
          email, password, first_name, last_name, phone_number,
          date_of_birth, gender, id_number, occupation,
          industry, address, city, postal_code,
          selected_package, bank_name, account_type,
          account_number, account_holder_name, branch_code,
          is_south_african, has_credit_card, is_enabled, points,
          agent_id, is_agent, referral_code, mandate_accepted,
          mandate_accepted_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

      console.log('Creating customer with parameters:', {
        email,
        firstName,
        lastName,
        agentId: req.user.id,
        selectedPackage
      });

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
        1, // is_enabled
        initialPoints,
        req.user.id, // agent_id
        0, // is_agent
        referralCode,
        1, // mandate_accepted
        new Date() //mandate_accepted_at
      ];

      console.log('SQL Parameters:', {
        columnCount: insertQuery.split('?').length - 1,
        paramCount: insertParams.length
      });

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
            `Initial points allocation for ${selectedPackage} package`,
            'PROCESSED'
          ]
        );
      }

      await connection.commit();

      // Send welcome email
      try {
        const { text, html } = formatRegistrationEmail(firstName, referralCode);
        await sendEmail({
          to: email,
          subject: "Welcome to OPIAN Rewards!",
          text,
          html
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      console.log('Customer created successfully:', {
        id: userId,
        email,
        points: initialPoints,
        package: selectedPackage,
        agentId: req.user.id
      });

      res.status(201).json({
        id: userId,
        email,
        firstName,
        lastName,
        points: initialPoints,
        selectedPackage,
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
  if (!req.session || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

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

    await connection.beginTransaction();

    try {
      // Update user details
      await connection.execute(
        `UPDATE users SET
          email = ?, first_name = ?, last_name = ?, phone_number = ?,
          date_of_birth = ?, gender = ?, id_number = ?, occupation = ?,
          industry = ?, address = ?, city = ?, postal_code = ?,
          selected_package = ?, bank_name = ?, account_type = ?,
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

      await connection.commit();
      res.json({ message: "Customer updated successfully" });
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

export default router;