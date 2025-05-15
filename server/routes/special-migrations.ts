import { Router } from 'express';
import { createConnection } from '../db';

const router = Router();

// Endpoint to run the address fields migration - no auth check for this specific endpoint
router.post('/run-address-fields-migration', async (req: any, res) => {
  // This is a special migration endpoint that doesn't require authentication
  // We're allowing this to be called without authentication to ensure the migration can run

  const connection = await createConnection();
  try {
    console.log('Running address fields migration...');
    
    // Check if suburb column already exists
    const [suburbCheck] = await connection.execute('SHOW COLUMNS FROM users LIKE "suburb"');
    if ((suburbCheck as any[]).length === 0) {
      console.log('Adding suburb column');
      await connection.execute('ALTER TABLE users ADD COLUMN suburb VARCHAR(255) DEFAULT ""');
    } else {
      console.log('suburb column already exists');
    }
    
    // Check if province column already exists
    const [provinceCheck] = await connection.execute('SHOW COLUMNS FROM users LIKE "province"');
    if ((provinceCheck as any[]).length === 0) {
      console.log('Adding province column');
      await connection.execute('ALTER TABLE users ADD COLUMN province VARCHAR(255) DEFAULT ""');
    } else {
      console.log('province column already exists');
    }
    
    // Check if city column already exists
    const [cityCheck] = await connection.execute('SHOW COLUMNS FROM users LIKE "city"');
    if ((cityCheck as any[]).length === 0) {
      console.log('Adding city column');
      await connection.execute('ALTER TABLE users ADD COLUMN city VARCHAR(255) DEFAULT ""');
    } else {
      console.log('city column already exists');
    }
    
    res.json({ success: true, message: 'Address fields migration completed successfully' });
  } catch (error) {
    console.error('Error in migration:', error);
    res.status(500).json({ error: 'Migration failed', details: error });
  } finally {
    await connection.end();
  }
});

export default router;