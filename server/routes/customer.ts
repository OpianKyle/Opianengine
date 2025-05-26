import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '@db';
import { createConnection } from '../db';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    console.log('User not authenticated for customer route');
    return res.status(401).json({ error: "Not authenticated" });
  }
  console.log('User authenticated for customer route:', req.user?.id);
  next();
};

// Get user profile data
router.get('/profile', isAuthenticated, async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await createConnection();
    console.log('Fetching profile data for user:', req.user.id);

    // Get complete user profile data matching live API
    const [userData] = await connection.execute(
      `SELECT 
        id,
        email,
        first_name,
        last_name,
        phone_number,
        is_south_african,
        id_number,
        date_of_birth,
        gender,
        occupation,
        industry,
        address,
        suburb,
        city,
        province,
        postal_code,
        selected_package,
        bank_name,
        account_type,
        account_number,
        account_holder_name,
        branch_code,
        has_credit_card,
        CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points,
        referral_code,
        card_number,
        card_status,
        is_enabled,
        created_at,
        mandate_accepted,
        mandate_accepted_at
      FROM users 
      WHERE id = ?`,
      [req.user?.id]
    ) as any;

    console.log('🔍 CUSTOMER ROUTER ENDPOINT CALLED - Database query result:', userData);
    console.log('🔍 Query result type:', typeof userData, Array.isArray(userData));

    if (!userData || !Array.isArray(userData) || userData.length === 0) {
      console.log('User not found:', req.user?.id);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userData[0] as any;
    
    console.log('🔍 Raw user data from database:', user);
    console.log('🔍 Available columns:', Object.keys(user));
    
    // Return complete profile data matching the live API format
    const profileData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      points: user.points,
      referralCode: user.referral_code,
      cardNumber: user.card_number || "",
      cardStatus: user.card_status || "",
      // Personal details
      isSouthAfrican: user.is_south_african ?? false,
      idNumber: user.id_number || "",
      dateOfBirth: user.date_of_birth || "",
      gender: user.gender || "",
      occupation: user.occupation || "",
      industry: user.industry || "",
      // Address details
      address: user.address || "",
      suburb: user.suburb || "",
      city: user.city || "",
      province: user.province || "",
      postalCode: user.postal_code || "",
      // Package details
      selectedPackage: user.selected_package || "BEGINNER",
      // Banking details
      bankName: user.bank_name || "",
      accountType: user.account_type || "SAVINGS",
      accountNumber: user.account_number || "",
      accountHolderName: user.account_holder_name || "",
      branchCode: user.branch_code || "",
      hasCreditCard: user.has_credit_card ?? false,
      // Additional fields from live API
      isEnabled: user.is_enabled ?? true,
      createdAt: user.created_at,
      mandateAccepted: user.mandate_accepted ?? false,
      mandateAcceptedAt: user.mandate_accepted_at
    };

    return res.status(200).json(profileData);
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return res.status(500).json({ error: 'Failed to fetch profile data' });
  } finally {
    if (connection) await connection.end();
  }
});

// Get cash deposits data for the logged-in customer
router.get('/cash-deposits', isAuthenticated, async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await createConnection();
    console.log('Fetching cash deposits for user:', req.user.id);

    // First, check if the cash_deposits table exists
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE 'cash_deposits'`
    );
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      console.log('Cash deposits table does not exist');
      // Return empty result if table doesn't exist
      return res.json({
        deposits: [],
        totalPoints: 0,
        totalCashValue: 0
      });
    }
    
    // Get all cash deposits for the current user
    const [deposits] = await connection.execute(
      `SELECT id, points, description, created_at 
       FROM cash_deposits 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Get total cash deposit points for the current user
    const [totalResult] = await connection.execute(
      `SELECT COALESCE(SUM(points), 0) as total_points 
       FROM cash_deposits 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Calculate total cash value (R0.015 per point)
    const totalPoints = totalResult[0]?.total_points || 0;
    const totalCashValue = parseFloat((totalPoints * 0.015).toFixed(2));

    // Add cash value to each deposit
    const depositsWithCashValue = deposits.map((deposit: any) => ({
      ...deposit,
      cashValue: parseFloat((deposit.points * 0.015).toFixed(2))
    }));

    res.json({
      deposits: depositsWithCashValue,
      totalPoints,
      totalCashValue
    });
  } catch (error) {
    console.error('Error fetching cash deposits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cash deposits data',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Add cash deposit point allocation endpoint
router.post('/cash-deposits/allocate', isAuthenticated, async (req: Request, res: Response) => {
  let connection;
  try {
    console.log('Cash deposits allocation request:', req.body);
    const { points, description } = req.body;
    
    if (!points || isNaN(Number(points)) || Number(points) <= 0) {
      console.log('Invalid points amount:', points);
      return res.status(400).json({ error: 'Valid points amount is required' });
    }
    
    const numPoints = Number(points);
    console.log('Processing allocation of', numPoints, 'points for user', req.user.id);
    
    connection = await createConnection();
    
    // First check if the user has enough points 
    const [userPoints] = await connection.execute(
      'SELECT points FROM users WHERE id = ?',
      [req.user.id]
    );
    
    console.log('User points available:', userPoints[0]?.points);
    
    if (!userPoints || !userPoints[0] || userPoints[0].points < numPoints) {
      console.log('Insufficient points - available:', userPoints[0]?.points, 'requested:', numPoints);
      return res.status(400).json({ error: 'Insufficient points' });
    }
    
    // Start transaction
    await connection.beginTransaction();
    
    // Insert into cash deposits
    const cashValue = parseFloat((Number(points) * 0.015).toFixed(2));
    await connection.execute(
      `INSERT INTO cash_deposits (user_id, points, cash_value, description, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [req.user.id, points, cashValue, description || 'Points allocated to cash deposits']
    );
    
    // Deduct points from user
    await connection.execute(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [points, req.user.id]
    );
    
    // Skip points transaction record since the table doesn't exist
    // We already recorded the transaction in cash_deposits table and updated user points
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: `Successfully allocated ${points} points to cash deposits`,
      cashValue
    });
    
  } catch (error) {
    console.error('Error allocating cash deposits:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ 
      error: 'Failed to allocate points to cash deposits',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Add cash withdrawal request endpoint
router.post('/cash-redemptions/request', isAuthenticated, async (req: Request, res: Response) => {
  let connection;
  try {
    const { bankDetails, notes } = req.body;
    
    if (!bankDetails || typeof bankDetails !== 'string' || bankDetails.trim() === '') {
      return res.status(400).json({ error: 'Bank details are required' });
    }
    
    console.log('Processing cash withdrawal request for user:', req.user.id);
    
    connection = await createConnection();
    
    // First check if the user has enough cash deposits (minimum R5000)
    const [totalResult] = await connection.execute(
      `SELECT COALESCE(SUM(points), 0) as total_points 
       FROM cash_deposits 
       WHERE user_id = ?`,
      [req.user.id]
    );
    
    const totalPoints = totalResult[0]?.total_points || 0;
    const totalCashValue = parseFloat((totalPoints * 0.015).toFixed(2));
    
    console.log('User total cash value:', totalCashValue);
    
    if (totalCashValue < 5000) {
      return res.status(400).json({ 
        error: 'Insufficient funds for withdrawal',
        message: 'You need at least R5,000 in your cash wallet to request a withdrawal'
      });
    }
    
    // Start transaction
    await connection.beginTransaction();
    
    // We'll use all available cash deposit points for the withdrawal
    // These are completely separate from regular reward points
    const pointsNeeded = totalPoints;
    const cashAmountRequested = totalCashValue;
    
    // Create redemption request in the cash_redemptions table
    await connection.execute(
      `INSERT INTO cash_redemptions (
        user_id, 
        points, 
        cash_amount, 
        bank_details, 
        notes, 
        status, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [
        req.user.id, 
        -pointsNeeded, // Store as negative points as we're removing them from the wallet
        cashAmountRequested, // Using our cash deposit points value specifically 
        bankDetails,
        notes || ''
      ]
    );
    
    // Remove all cash deposit records for this user (or mark them as redeemed)
    await connection.execute(
      `DELETE FROM cash_deposits WHERE user_id = ?`,
      [req.user.id]
    );
    
    // Send email notification to admin
    try {
      // Get user info for the email
      const [userInfo] = await connection.execute(
        'SELECT email, first_name, last_name FROM users WHERE id = ?',
        [req.user.id]
      );
      
      // Prepare email data
      const user = userInfo[0];
      const emailData = {
        to: 'clientservices@opianrewards.com',
        subject: 'New Cash Redemption Request',
        text: `
          A new cash redemption request has been submitted.
          
          User: ${user.first_name} ${user.last_name} (${user.email})
          Amount: R${totalCashValue.toFixed(2)}
          Bank Details: ${bankDetails}
          ${notes ? `Additional Notes: ${notes}` : ''}
          
          Please process this request within 5-7 business days.
        `
      };
      
      // Use server's email sending function (this would be implemented elsewhere)
      // This is a placeholder for the actual email sending logic
      console.log('Would send email notification:', emailData);
    } catch (emailError) {
      console.error('Failed to send redemption notification email:', emailError);
      // Continue with the redemption process even if email sending fails
    }
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: 'Withdrawal request submitted successfully',
      amount: totalCashValue
    });
    
  } catch (error) {
    console.error('Error processing cash withdrawal request:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ 
      error: 'Failed to process withdrawal request',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Temporary endpoint to add missing profile columns
router.post('/migrate-profile-fields', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await createConnection();
    
    const fieldsToAdd = [
      'address VARCHAR(255) DEFAULT NULL',
      'suburb VARCHAR(100) DEFAULT NULL', 
      'city VARCHAR(100) DEFAULT NULL',
      'province VARCHAR(50) DEFAULT NULL',
      'postal_code VARCHAR(10) DEFAULT NULL',
      'id_number VARCHAR(20) DEFAULT NULL',
      'date_of_birth DATE DEFAULT NULL',
      'industry VARCHAR(100) DEFAULT NULL',
      'occupation VARCHAR(100) DEFAULT NULL',
      'is_south_african BOOLEAN DEFAULT FALSE',
      'selected_package VARCHAR(20) DEFAULT "BEGINNER"',
      'bank_name VARCHAR(100) DEFAULT NULL',
      'account_type ENUM("SAVINGS", "CHEQUE", "TRANSMISSION") DEFAULT "SAVINGS"',
      'account_number VARCHAR(20) DEFAULT NULL',
      'has_credit_card BOOLEAN DEFAULT FALSE'
    ];
    
    const results = [];
    for (const field of fieldsToAdd) {
      try {
        await connection.execute(`ALTER TABLE users ADD COLUMN ${field}`);
        results.push(`✓ Added: ${field}`);
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          results.push(`- Already exists: ${field}`);
        } else {
          results.push(`✗ Error: ${error.message}`);
        }
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  } finally {
    if (connection) await connection.end();
  }
});

export default router;