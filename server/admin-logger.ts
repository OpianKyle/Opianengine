import { createConnection } from './db';

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
      `INSERT INTO admin_logs (admin_id, action_type, target_user_id, details)
       VALUES (?, ?, ?, ?)`,
      [adminId, actionType, targetUserId || null, details]
    );

    const insertId = (result as any).insertId;
    const [rows] = await connection.execute(
      'SELECT * FROM admin_logs WHERE id = ?',
      [insertId]
    );

    console.log('Admin action logged successfully:', rows[0]);
    return rows[0];
  } catch (error) {
    console.error("Failed to log admin action:", error);
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
        a.first_name as admin_first_name,
        a.last_name as admin_last_name,
        a.email as admin_email,
        t.first_name as target_first_name,
        t.last_name as target_last_name,
        t.email as target_email
       FROM admin_logs al
       LEFT JOIN users a ON al.admin_id = a.id
       LEFT JOIN users t ON al.target_user_id = t.id
       ORDER BY al.created_at DESC`
    );

    console.log('Retrieved admin logs:', (logs as any[]).length);
    return logs;
  } catch (error) {
    console.error("Failed to fetch admin logs:", error);
    return [];
  } finally {
    await connection.end();
  }
}