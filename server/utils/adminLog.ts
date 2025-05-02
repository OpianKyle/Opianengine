import { db } from "../../db";
import { adminLogs } from "../../db/schema";

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
    const [log] = await db.insert(adminLogs).values({
      admin_id: logData.user_id,
      action: logData.action,
      details: logData.details,
      timestamp: new Date(),
    }).returning();

    return log;
  } catch (error) {
    console.error("Error logging admin action:", error);
    return null;
  }
}