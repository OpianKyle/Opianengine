import { createConnection } from "./db";

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
  const connection = await createConnection();
  try {
    console.log('Attempting to log admin action:', { adminId, actionType, targetUserId, details });

    const [result] = await connection.execute(
      `INSERT INTO admin_logs (admin_id, action_type, target_user_id, details, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [adminId, actionType, targetUserId || null, details]
    );

    console.log('Admin action logged successfully:', result);
    return result;
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw the error, just log it and return null
    return null;
  } finally {
    await connection.end();
  }
}

export async function getAdminLogs() {
  const connection = await createConnection();
  try {
    const [logs] = await connection.execute(
      `SELECT 
        al.*,
        admin.email as admin_email,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name,
        target.email as target_email,
        target.first_name as target_first_name,
        target.last_name as target_last_name
       FROM admin_logs al
       JOIN users admin ON al.admin_id = admin.id
       LEFT JOIN users target ON al.target_user_id = target.id
       ORDER BY al.created_at DESC`
    ) as any[];

    console.log('Retrieved admin logs:', logs.length);
    return logs.map((log: any) => ({
      id: log.id,
      actionType: log.action_type,
      details: log.details,
      createdAt: log.created_at,
      admin: {
        id: log.admin_id,
        email: log.admin_email,
        firstName: log.admin_first_name,
        lastName: log.admin_last_name
      },
      targetUser: log.target_user_id ? {
        id: log.target_user_id,
        email: log.target_email,
        firstName: log.target_first_name,
        lastName: log.target_last_name
      } : null
    }));
  } catch (error) {
    console.error("Failed to fetch admin logs:", error);
    return [];
  } finally {
    await connection.end();
  }
}