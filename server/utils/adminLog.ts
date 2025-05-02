import { db } from "../../db";
import { adminLogs } from "../../db/schema";
import { eq } from "drizzle-orm";

export interface AdminLogData {
  user_id: number;
  action: string;
  details: string;
}

/**
 * Logs an admin action to the database
 * @param logData The admin log data to record
 * @returns The inserted log entry or null if insertion failed
 */
export async function adminLog(logData: AdminLogData) {
  try {
    // For MySQL we don't use returning() but get the insertId
    const insertResult = await db.insert(adminLogs).values({
      adminId: logData.user_id, 
      actionType: logData.action,
      details: logData.details,
      createdAt: new Date(),
    });
    
    const logId = Number(insertResult.insertId);
    const [log] = await db.select().from(adminLogs).where(eq(adminLogs.id, logId));

    return log;
  } catch (error) {
    console.error("Error logging admin action:", error);
    return null;
  }
}