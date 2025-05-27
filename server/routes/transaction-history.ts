import { Router } from 'express';
import { db } from '@db';
import { transactions } from '@db/schema';
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';

const router = Router();

// Store a transaction in the permanent history
export async function storeTransactionHistory(transactionData: any) {
  try {
    await db.insert(transactions).values({
      userId: transactionData.userId,
      description: transactionData.description,
      amount: transactionData.amount,
      transactionDate: transactionData.transactionDate,
      merchant: transactionData.merchant,
      category: transactionData.category,
      type: transactionData.type || 'CARD_TRANSACTION',
      metadata: JSON.stringify(transactionData.metadata || {}),
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error storing transaction history:', error);
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

    // Date range filter
    if (startDate) {
      whereConditions.push(gte(transactions.transactionDate, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(transactions.transactionDate, new Date(endDate as string)));
    }

    // Customer filter
    if (customer) {
      whereConditions.push(eq(transactions.userId, parseInt(customer as string)));
    }

    // Merchant filter
    if (merchant) {
      whereConditions.push(like(transactions.merchant, `%${merchant}%`));
    }

    // Amount range filter
    if (minAmount) {
      whereConditions.push(gte(transactions.amount, parseFloat(minAmount as string)));
    }
    if (maxAmount) {
      whereConditions.push(lte(transactions.amount, parseFloat(maxAmount as string)));
    }

    // Search filter
    if (search) {
      whereConditions.push(like(transactions.description, `%${search}%`));
    }

    // Get transactions with pagination
    const transactionHistory = await db
      .select()
      .from(transactions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(transactions.transactionDate))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = countResult[0]?.count || 0;

    res.json({
      transactions: transactionHistory,
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