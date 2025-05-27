import { Router } from 'express';
import { db } from '@db';
import { transactions, users } from '@db/schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';

const router = Router();

// Store card statement transaction in permanent history
export async function storeTransactionHistory(
  userId: number,
  transactionData: {
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description?: string;
    merchantName?: string;
    transactionDate?: string;
    pointsEarned: number;
    importBatchId: string;
  }
) {
  try {
    // Store in transactions table with special type for card statement imports
    const result = await db.insert(transactions).values({
      userId,
      type: transactionData.type === 'DEBIT' ? 'EARNED' : 'EARNED', // Map to existing enum
      amount: transactionData.pointsEarned, // Store points earned
      description: `Card Statement - ${transactionData.description || transactionData.merchantName || 'Transaction'}`,
      status: 'PROCESSED',
      metadata: JSON.stringify({
        originalAmount: transactionData.amount,
        transactionType: transactionData.type,
        merchantName: transactionData.merchantName,
        transactionDate: transactionData.transactionDate,
        importBatchId: transactionData.importBatchId,
        source: 'CARD_STATEMENT_IMPORT'
      })
    });
    
    return result;
  } catch (error) {
    console.error('Error storing transaction history:', error);
    throw error;
  }
}

// GET /api/transaction-history - Get transaction history for a user
router.get('/', async (req, res) => {
  try {
    const { userId, page = 1, limit = 50, search = '', batchId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build query conditions
    let whereConditions = [
      eq(transactions.userId, parseInt(userId as string)),
      like(transactions.description, '%Card Statement%') // Filter for card statement imports
    ];
    
    if (search) {
      whereConditions.push(
        like(transactions.description, `%${search}%`)
      );
    }
    
    if (batchId) {
      whereConditions.push(
        like(transactions.metadata, `%${batchId}%`)
      );
    }
    
    // Get transactions with user info
    const transactionHistory = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        metadata: transactions.metadata,
        createdAt: transactions.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(transactions.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);
    
    // Get total count
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...whereConditions));
    
    const totalCount = totalCountResult[0]?.count || 0;
    
    // Parse metadata for better display
    const processedHistory = transactionHistory.map(transaction => {
      let metadata = null;
      try {
        metadata = transaction.metadata ? JSON.parse(transaction.metadata) : null;
      } catch (e) {
        metadata = null;
      }
      
      return {
        ...transaction,
        metadata,
        originalAmount: metadata?.originalAmount || 0,
        transactionType: metadata?.transactionType || 'UNKNOWN',
        merchantName: metadata?.merchantName || 'Unknown Merchant',
        transactionDate: metadata?.transactionDate || transaction.createdAt,
        importBatchId: metadata?.importBatchId || null,
        pointsEarned: transaction.amount
      };
    });
    
    res.json({
      transactions: processedHistory,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      }
    });
    
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// GET /api/transaction-history/batches - Get all import batches
router.get('/batches', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get unique import batches for this user
    const batches = await db
      .select({
        batchId: sql<string>`JSON_EXTRACT(metadata, '$.importBatchId')`,
        count: sql<number>`COUNT(*)`,
        totalPoints: sql<number>`SUM(amount)`,
        firstImport: sql<string>`MIN(created_at)`,
        lastImport: sql<string>`MAX(created_at)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, parseInt(userId as string)),
          like(transactions.description, '%Card Statement%')
        )
      )
      .groupBy(sql`JSON_EXTRACT(metadata, '$.importBatchId')`)
      .orderBy(sql`MAX(created_at) DESC`);
    
    res.json({ batches });
    
  } catch (error) {
    console.error('Error fetching import batches:', error);
    res.status(500).json({ error: 'Failed to fetch import batches' });
  }
});

// GET /api/transaction-history/summary - Get summary statistics
router.get('/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Get summary statistics
    const summary = await db
      .select({
        totalTransactions: sql<number>`COUNT(*)`,
        totalPointsEarned: sql<number>`SUM(amount)`,
        totalDebitAmount: sql<number>`SUM(CASE WHEN JSON_EXTRACT(metadata, '$.transactionType') = 'DEBIT' THEN JSON_EXTRACT(metadata, '$.originalAmount') ELSE 0 END)`,
        totalCreditAmount: sql<number>`SUM(CASE WHEN JSON_EXTRACT(metadata, '$.transactionType') = 'CREDIT' THEN JSON_EXTRACT(metadata, '$.originalAmount') ELSE 0 END)`,
        firstTransaction: sql<string>`MIN(created_at)`,
        lastTransaction: sql<string>`MAX(created_at)`
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, parseInt(userId as string)),
          like(transactions.description, '%Card Statement%')
        )
      );
    
    res.json({ summary: summary[0] });
    
  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    res.status(500).json({ error: 'Failed to fetch transaction summary' });
  }
});

export default router;