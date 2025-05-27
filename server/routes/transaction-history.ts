import { Router } from 'express';
import { db } from '@db';
import { transactionHistory } from '@db/schema';
import { eq, and, gte, lte, like, desc, sql } from 'drizzle-orm';

const router = Router();

// Store a transaction in the permanent history
export async function storeTransactionHistory(transactionData: any) {
  try {
    await db.insert(transactionHistory).values({
      userId: transactionData.userId,
      transactionType: transactionData.type === 'credit' ? 'CREDIT' : 'DEBIT',
      amount: Math.round(transactionData.amount * 100), // Convert to cents
      description: transactionData.description,
      merchantName: transactionData.merchant,
      merchantCategory: transactionData.category,
      transactionDate: transactionData.transactionDate,
      pointsEarned: transactionData.points || 0,
      importBatchId: transactionData.batchId,
      rawData: JSON.stringify(transactionData.metadata || {}),
      createdAt: new Date(),
      updatedAt: new Date()
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
      whereConditions.push(gte(transactionHistory.transactionDate, new Date(startDate as string)));
    }
    if (endDate) {
      whereConditions.push(lte(transactionHistory.transactionDate, new Date(endDate as string)));
    }

    // Customer filter
    if (customer) {
      whereConditions.push(eq(transactionHistory.userId, parseInt(customer as string)));
    }

    // Merchant filter
    if (merchant) {
      whereConditions.push(like(transactionHistory.merchantName, `%${merchant}%`));
    }

    // Amount range filter (convert to cents)
    if (minAmount) {
      whereConditions.push(gte(transactionHistory.amount, Math.round(parseFloat(minAmount as string) * 100)));
    }
    if (maxAmount) {
      whereConditions.push(lte(transactionHistory.amount, Math.round(parseFloat(maxAmount as string) * 100)));
    }

    // Search filter
    if (search) {
      whereConditions.push(like(transactionHistory.description, `%${search}%`));
    }

    // Get transactions with pagination
    const historyRecords = await db
      .select()
      .from(transactionHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(transactionHistory.transactionDate))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactionHistory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = countResult[0]?.count || 0;

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