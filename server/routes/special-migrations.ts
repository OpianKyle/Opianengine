import { Router } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";

const router = Router();

// Route to add address fields to users table
router.post("/add-address-fields", async (req, res) => {
  try {
    // Only allow super admins to run this migration
    if (!req.isAuthenticated() || !req.user?.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: Only super admins can run migrations" 
      });
    }

    console.log("Running migration to add address fields to users table...");

    // Add suburb field if it doesn't exist
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS suburb TEXT;`);

    // Add province field if it doesn't exist
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS province TEXT;`);

    console.log("Address fields migration completed successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Added suburb and province fields to users table" 
    });
  } catch (error) {
    console.error("Error running address fields migration:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error running migration", 
      error: String(error) 
    });
  }
});

export default router;