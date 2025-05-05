import express from "express";
import { z } from "zod";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { insertLeadSchema, leads } from "../../db/leads";
import { ResponseError } from "../utils/errors";
import { fromZodError } from "zod-validation-error";
import { adminLog } from "../utils/adminLog";

const router = express.Router();

// Simple cache implementation for leads data
// Cache duration: 60 seconds for normal queries, 5 minutes for admin queries
const CACHE_TTL = 60 * 1000; // 60 seconds in milliseconds
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for admin queries
const leadsCache = new Map();

// Get all leads - admin only (optimized with caching)
router.get("/", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !(req.user?.is_admin || req.user?.is_agent)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Create a cache key based on query parameters
    const search = req.query.search as string;
    const packageFilter = req.query.package as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isAdmin = req.user?.is_admin;
    const userId = req.user.id;
    
    const cacheKey = JSON.stringify({
      search,
      packageFilter,
      page,
      limit,
      isAdmin,
      userId: !isAdmin ? userId : 'admin', // Don't use user ID for admins to increase cache hit rate
    });
    
    // Check if we have a valid cached response
    const now = Date.now();
    const cachedData = leadsCache.get(cacheKey);
    const cacheTTL = isAdmin ? ADMIN_CACHE_TTL : CACHE_TTL;
    
    if (cachedData && (now - cachedData.timestamp < cacheTTL)) {
      return res.json(cachedData.data);
    }
    
    console.time('leadsQuery'); // Start timing the query
    
    // Execute the query if no cache hit
    let query = db.select().from(leads).orderBy(desc(leads.createdAt));

    // Filter by search term if provided - optimization: consolidate query conditions
    if (search) {
      query = query.where(
        or(
          like(leads.firstName, `%${search}%`),
          like(leads.lastName, `%${search}%`),
          like(leads.email, `%${search}%`),
          like(leads.mobileNumber, `%${search}%`)
        )
      );
    }

    // Filter by package if provided
    if (packageFilter) {
      query = query.where(eq(leads.selectedPackage, packageFilter));
    }
    
    // If the user is an agent but not an admin, show only their assigned leads
    if (req.user?.is_agent && !req.user?.is_admin) {
      query = query.where(eq(leads.assignedAgentId, req.user.id));
    }

    // Pagination
    const offset = (page - 1) * limit;
    
    // Execute count query and data query in parallel
    const [countResult, items] = await Promise.all([
      // Count query
      db.select({
        count: sql`COUNT(*) as count`
      })
      .from(leads)
      .where(
        and(
          // Search condition
          search 
            ? or(
                like(leads.firstName, `%${search}%`),
                like(leads.lastName, `%${search}%`),
                like(leads.email, `%${search}%`),
                like(leads.mobileNumber, `%${search}%`)
              )
            : undefined,
          // Package filter
          packageFilter ? eq(leads.selectedPackage, packageFilter) : undefined,
          // Agent filter
          req.user?.is_agent && !req.user?.is_admin 
            ? eq(leads.assignedAgentId, req.user.id) 
            : undefined
        )
      ),
      
      // Data query with limit and offset
      query.limit(limit).offset(offset)
    ]);
    
    console.timeEnd('leadsQuery'); // End timing
    
    const totalCount = countResult[0]?.count || 0;
    
    const responseData = {
      items,
      pagination: {
        page,
        limit,
        totalCount: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
    
    // Store in cache
    leadsCache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });
    
    // Implement cache cleanup to prevent memory leaks
    // Clean up entries older than 10 minutes
    if (leadsCache.size > 100) { // Only clean if cache is getting large
      for (const [key, value] of leadsCache.entries()) {
        if (now - value.timestamp > 10 * 60 * 1000) {
          leadsCache.delete(key);
        }
      }
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
});

// Create a new lead
router.post("/", async (req, res, next) => {
  try {
    console.log('Received lead submission:', req.body);
    
    // Prepare data with correct schema format
    const leadData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      mobileNumber: req.body.mobileNumber,
      selectedPackage: req.body.selectedPackage,
      referralCode: req.body.referralCode,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate the data
    const result = insertLeadSchema.safeParse(leadData);
    if (!result.success) {
      const validationError = fromZodError(result.error);
      throw new ResponseError(validationError.message, 400);
    }
    
    // Insert the lead using MySQL method
    const insertResult = await db.insert(leads).values(result.data);
    
    // Get the inserted ID and fetch the complete lead record
    const leadId = Number(insertResult.insertId);
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    
    // Log the submission in admin logs if the user is logged in
    if (req.isAuthenticated() && req.user?.id) {
      await adminLog({
        user_id: req.user.id,
        action: "lead_submitted",
        details: `Lead submitted: ${leadData.firstName} ${leadData.lastName} (${leadData.email})`,
      });
    } else {
      console.log('Lead submitted from public form');
    }

    res.status(201).json({
      success: true,
      lead,
      message: "Lead information submitted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Get a single lead - admin only
router.get("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !(req.user?.is_admin || req.user?.is_agent)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead.length) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead[0]);
  } catch (error) {
    next(error);
  }
});

// Update a lead - admin only
router.put("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !(req.user?.is_admin || req.user?.is_agent)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const result = insertLeadSchema.partial().safeParse(req.body);
    if (!result.success) {
      const validationError = fromZodError(result.error);
      throw new ResponseError(validationError.message, 400);
    }

    const [existingLead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    // If user is an agent (not admin), ensure they can only update leads assigned to them
    if (req.user?.is_agent && !req.user?.is_admin && existingLead.assignedAgentId !== req.user.id) {
      return res.status(403).json({ message: "You can only update leads assigned to you" });
    }

    const updateData = result.data;
    await db
      .update(leads)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id));
    
    // Fetch the updated lead
    const [updatedLead] = await db.select().from(leads).where(eq(leads.id, id));

    await adminLog({
      user_id: req.user.id,
      action: "lead_updated",
      details: `Lead ${id} updated by ${req.user.username} (${req.user.email})`,
    });

    res.json({
      success: true,
      lead: updatedLead,
      message: "Lead information updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Delete a lead - admin only
router.delete("/:id", async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const [existingLead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await db.delete(leads).where(eq(leads.id, id));

    await adminLog({
      user_id: req.user.id,
      action: "lead_deleted",
      details: `Lead ${id} (${existingLead.firstName} ${existingLead.lastName}) deleted by ${req.user.email || 'Admin'}`,
    });

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export const leadsRouter = router;