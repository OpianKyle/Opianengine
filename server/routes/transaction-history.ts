import { Router } from 'express';
import { db, pool } from '@db';
import mysql from 'mysql2/promise';

const router = Router();

// Store a transaction in the permanent history
export async function storeTransactionHistory(transactionData: any) {
  try {
    // Extract merchant name from description if merchant is empty or generic
    let merchantName = transactionData.merchant || '';
    
    if (!merchantName || merchantName === 'Unknown Merchant' || merchantName.includes('Card statement import')) {
      // Try to extract from raw data if available
      if (transactionData.metadata && transactionData.metadata.rawData && transactionData.metadata.rawData.B) {
        const rawMerchantData = transactionData.metadata.rawData.B;
        if (typeof rawMerchantData === 'string' && rawMerchantData.length > 10) {
          // Extract merchant name from column B data
          merchantName = rawMerchantData
            .replace(/\s+\d{4}\s*ZA.*$/i, '') // Remove postal codes and country
            .replace(/\s+ZAF.*$/i, '') // Remove ZAF suffix  
            .replace(/\s+MALL.*$/i, '') // Remove mall references
            .replace(/\s+(CAPE TOWN|JOHANNESBURG|DURBAN|PRETORIA|SANDTON|CENTURION).*$/i, '')
            .replace(/,.*$/, '') // Remove everything after comma
            .replace(/[A-Z]\d+.*$/, '') // Remove unit numbers like U26
            .trim()
            .substring(0, 50); // Limit length
        }
      }
      
      // Fallback to description if still empty
      if (!merchantName && transactionData.description) {
        merchantName = transactionData.description.substring(0, 50);
      }
    }

    console.log('Storing transaction history:', {
      userId: transactionData.userId,
      type: transactionData.type,
      amount: transactionData.amount,
      merchant: merchantName,
      originalMerchant: transactionData.merchant
    });

    // Use direct MySQL query since we're working with MySQL
    const query = `
      INSERT INTO transaction_history (
        user_id,
        transaction_type,
        amount,
        description,
        merchant_name,
        merchant_category,
        transaction_date,
        points_earned,
        import_batch_id,
        raw_data,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
      transactionData.userId,
      transactionData.type === 'credit' ? 'CREDIT' : 'DEBIT',
      Math.round(transactionData.amount * 100), // Convert to cents
      transactionData.description,
      merchantName,
      transactionData.category,
      transactionData.transactionDate,
      transactionData.points || 0,
      transactionData.batchId,
      JSON.stringify(transactionData.metadata || {})
    ];

    await pool.execute(query, values);
    console.log('✅ Transaction stored successfully in transaction_history table');
  } catch (error) {
    console.error('❌ Error storing transaction history:', error);
    throw error;
  }
}

// Get transaction history with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      startDate, 
      endDate, 
      customer, 
      merchant, 
      minAmount, 
      maxAmount, 
      search 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const whereConditions = [];
    const values = [];

    // Build WHERE clause dynamically
    let whereClause = '';

    // Date range filter
    if (startDate) {
      whereConditions.push('transaction_date >= ?');
      values.push(new Date(startDate as string));
    }
    if (endDate) {
      whereConditions.push('transaction_date <= ?');
      values.push(new Date(endDate as string));
    }

    // Customer filter
    if (customer) {
      whereConditions.push('user_id = ?');
      values.push(parseInt(customer as string));
    }

    // Merchant filter
    if (merchant) {
      whereConditions.push('merchant_name LIKE ?');
      values.push(`%${merchant}%`);
    }

    // Amount range filter (convert to cents)
    if (minAmount) {
      whereConditions.push('amount >= ?');
      values.push(Math.round(parseFloat(minAmount as string) * 100));
    }
    if (maxAmount) {
      whereConditions.push('amount <= ?');
      values.push(Math.round(parseFloat(maxAmount as string) * 100));
    }

    // Search filter
    if (search) {
      whereConditions.push('description LIKE ?');
      values.push(`%${search}%`);
    }

    if (whereConditions.length > 0) {
      whereClause = 'WHERE ' + whereConditions.join(' AND ');
    }

    // Get transactions with pagination
    const historyQuery = `
      SELECT 
        id,
        user_id,
        transaction_type,
        amount,
        description,
        merchant_name,
        merchant_category,
        transaction_date,
        points_earned,
        import_batch_id,
        raw_data,
        created_at,
        updated_at
      FROM transaction_history 
      ${whereClause}
      ORDER BY transaction_date DESC 
      LIMIT ? OFFSET ?
    `;

    const historyValues = [...values, parseInt(limit as string), offset];
    const [historyRecords] = await pool.execute(historyQuery, historyValues);

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as count FROM transaction_history ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, values);
    const total = (countResult as any)[0]?.count || 0;

    res.json({
      transactions: historyRecords,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

export default router;