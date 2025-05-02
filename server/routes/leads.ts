import { Router, Request, Response } from 'express';
import { db } from '@db';
import { leads, insertLeadSchema } from '@db/leads';
import { desc, eq, and } from 'drizzle-orm';
import { users, adminLogs } from '@db/schema';
import { fromZodError } from 'zod-validation-error';

export const leadsRouter = Router();

/**
 * Submit a new lead
 * Public endpoint - does not require authentication
 */
leadsRouter.post('/submit', async (req: Request, res: Response) => {
  try {
    // Validate the request body
    const result = insertLeadSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return res.status(400).json({ error: error.message });
    }

    // Format the data to match the database schema
    const leadData = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      mobileNumber: req.body.mobileNumber,
      selectedPackage: req.body.selectedPackage,
      referralCode: req.body.referralCode || null,
      contacted: false,
      converted: false,
      convertedUserId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if email already exists in leads table
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.email, leadData.email))
      .limit(1);

    if (existingLead.length > 0) {
      return res.status(400).json({ 
        error: 'A lead with this email already exists',
        leadId: existingLead[0].id
      });
    }

    // Check if email already exists in users table
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, leadData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ 
        error: 'This email is already registered with an account',
        userId: existingUser[0].id
      });
    }

    // Insert the lead into the database
    const insertResult = await db.insert(leads).values(leadData);
    
    // Return the lead ID
    return res.status(201).json({ 
      success: true, 
      message: 'Lead submitted successfully',
      leadId: insertResult[0].insertId
    });
  } catch (error) {
    console.error('Error submitting lead:', error);
    return res.status(500).json({ error: 'An error occurred while submitting the lead' });
  }
});

/**
 * Get all leads
 * Admin only endpoint
 */
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and is an admin
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user;
    if (!user.is_admin && !user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Get query parameters for filtering and pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const contacted = req.query.contacted === 'true' ? true : req.query.contacted === 'false' ? false : undefined;
    const converted = req.query.converted === 'true' ? true : req.query.converted === 'false' ? false : undefined;

    // Build the query
    let query = db.select().from(leads);

    // Apply filters if provided
    if (contacted !== undefined) {
      query = query.where(eq(leads.contacted, contacted));
    }
    
    if (converted !== undefined) {
      query = query.where(eq(leads.converted, converted));
    }

    // Get total count for pagination
    const totalResults = await query.execute();
    const totalLeads = totalResults.length;

    // Apply pagination and sorting
    const leadsList = await query
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    return res.status(200).json({
      leads: leadsList,
      pagination: {
        total: totalLeads,
        page,
        limit,
        pages: Math.ceil(totalLeads / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: 'An error occurred while fetching leads' });
  }
});

/**
 * Mark lead as contacted
 * Admin only endpoint
 */
leadsRouter.patch('/:id/contacted', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and is an admin
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user;
    if (!user.is_admin && !user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const leadId = parseInt(req.params.id);
    
    // Find the lead
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!existingLead.length) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update the lead
    await db.update(leads)
      .set({ contacted: true, updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    // Log admin action
    const adminLogData = {
      userId: user.id,
      action: 'MARK_LEAD_CONTACTED',
      details: JSON.stringify({
        leadId,
        leadEmail: existingLead[0].email,
        adminId: user.id,
        timestamp: new Date()
      }),
      createdAt: new Date()
    };

    await db.insert(adminLogs).values(adminLogData);

    return res.status(200).json({ 
      success: true, 
      message: 'Lead marked as contacted successfully'
    });
  } catch (error) {
    console.error('Error marking lead as contacted:', error);
    return res.status(500).json({ error: 'An error occurred while updating the lead' });
  }
});

/**
 * Mark lead as converted
 * Admin only endpoint
 */
leadsRouter.patch('/:id/converted', async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and is an admin
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = req.user;
    if (!user.is_admin && !user.is_super_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const leadId = parseInt(req.params.id);
    const convertedUserId = req.body.userId;
    
    if (!convertedUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find the lead
    const existingLead = await db.select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!existingLead.length) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Find the user
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, convertedUserId))
      .limit(1);

    if (!existingUser.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the lead
    await db.update(leads)
      .set({ 
        converted: true, 
        convertedUserId, 
        contacted: true, 
        updatedAt: new Date() 
      })
      .where(eq(leads.id, leadId));

    // Log admin action
    const adminLogData = {
      userId: user.id,
      action: 'MARK_LEAD_CONVERTED',
      details: JSON.stringify({
        leadId,
        leadEmail: existingLead[0].email,
        convertedUserId,
        adminId: user.id,
        timestamp: new Date()
      }),
      createdAt: new Date()
    };

    await db.insert(adminLogs).values(adminLogData);

    return res.status(200).json({ 
      success: true, 
      message: 'Lead marked as converted successfully'
    });
  } catch (error) {
    console.error('Error marking lead as converted:', error);
    return res.status(500).json({ error: 'An error occurred while updating the lead' });
  }
});