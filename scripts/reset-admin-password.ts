import { createConnection } from '../server/db';

async function resetAdminPassword() {
  const connection = await createConnection();
  try {
    console.log('Resetting super admin password...');
    
    await connection.execute(
      `UPDATE users 
       SET password = ? 
       WHERE is_super_admin = 1`,
      ['$2b$10$KwHVaHkVt5J3YmHj0GsYOeoI2G1G8VO1RnYkl5tD5OXOxC3v9hOkS']
    );
    
    console.log('Password reset successful');
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetAdminPassword().catch(console.error);
