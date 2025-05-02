/**
 * Agent-related routes for admin functionality
 */
import express from 'express';
import { createConnection } from '../db';
import { checkAdmin, verifyJwtToken } from '../auth';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { users } from '@db/schema';

const router = express.Router();

// Get all agents for admin operations (like lead assignment)
router.get('/list', verifyJwtToken, checkAdmin, async (req, res) => {
  try {
    // Use Drizzle ORM to query agent users
    const agentsList = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      })
      .from(users)
      .where(eq(users.isAgent, true));

    return res.status(200).json(agentsList);
  } catch (error) {
    console.error('Error fetching agents list:', error);
    return res.status(500).json({
      error: 'Failed to fetch agents list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;