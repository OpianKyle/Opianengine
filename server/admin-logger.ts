import { db } from "@db";
import { adminLogs, type User } from "@db/schema";

type AdminAction = {
  adminId: number;
  actionType: "POINT_ADJUSTMENT" | "ADMIN_CREATED" | "ADMIN_REMOVED" | "AGENT_CREATED" | "AGENT_REMOVED" | "REWARD_CREATED" | "REWARD_UPDATED" | "REWARD_DELETED" | "PRODUCT_CREATED" | "PRODUCT_UPDATED" | "PRODUCT_DELETED" | "ADMIN_UPDATED" | "QUOTE_REQUEST_UPDATED" | "QUOTE_REQUEST_COMPLETED" | "QUOTE_REQUEST_REJECTED";
  targetUserId?: number;
  details: string;
};

export async function logAdminAction({
  adminId,
  actionType,
  targetUserId,
  details,
}: AdminAction) {
  try {
    console.log('Attempting to log admin action:', { adminId, actionType, targetUserId, details });

    const result = await db.insert(adminLogs)
      .values({
        adminId,
        actionType,
        targetUserId,
        details,
      })
      .$returningAll();

    console.log('Admin action logged successfully:', result);
    return result[0];
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw the error, just log it
    return null;
  }
}

export async function getAdminLogs() {
  try {
    const logs = await db.query.adminLogs.findMany({
      with: {
        admin: true,
        targetUser: true,
      },
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });
    console.log('Retrieved admin logs:', logs.length);
    return logs;
  } catch (error) {
    console.error("Failed to fetch admin logs:", error);
    return [];
  }
}