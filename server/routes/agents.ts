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

// Get all agents for admin operations (like lead assignment) - optimized with caching
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
let agentsCache = {
  data: null,
  timestamp: 0
};

router.get('/list', verifyJwtToken, checkAdmin, async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if it exists and is fresh
    if (agentsCache.data && (now - agentsCache.timestamp) < CACHE_TTL) {
      return res.status(200).json(agentsCache.data);
    }
    
    // Use Drizzle ORM to query agent users with optimized select
    // Using debug logs to trace execution
    console.log("Fetching agents from database...");
    
    try {
      const agentsList = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.isAgent, true));
      
      console.log(`Found ${agentsList.length} agents:`, agentsList);
      
      // If no agents found but we know there should be some, try a raw query
      if (agentsList.length === 0) {
        // Connect directly to database for troubleshooting
        const connection = await createConnection();
        const [rawAgents] = await connection.execute(
          'SELECT id, first_name, last_name, email FROM users WHERE is_agent = 1'
        );
        console.log("Raw query results:", rawAgents);
        
        if (Array.isArray(rawAgents) && rawAgents.length > 0) {
          // Format raw results to match expected format
          const formattedAgents = rawAgents.map(agent => ({
            id: agent.id,
            firstName: agent.first_name,
            lastName: agent.last_name,
            email: agent.email
          }));
          
          // Update cache with formatted data
          agentsCache = {
            data: formattedAgents,
            timestamp: now
          };
          
          return res.status(200).json(formattedAgents);
        }
      }
      
      // Normal flow - update cache with ORM query results
      agentsCache = {
        data: agentsList,
        timestamp: now
      };
      
      return res.status(200).json(agentsList);
    } catch (dbError) {
      console.error("Database error fetching agents:", dbError);
      throw dbError; // Re-throw to trigger the catch handler
    }
  } catch (error) {
    console.error('Error fetching agents list:', error);
    
    // If there's cached data, return it even if it's stale rather than showing an error
    if (agentsCache.data) {
      return res.status(200).json(agentsCache.data);
    }
    
    return res.status(500).json({
      error: 'Failed to fetch agents list',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;