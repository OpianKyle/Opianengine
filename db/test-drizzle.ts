import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function testDrizzleConnection() {
  try {
    console.log('Testing Drizzle ORM connection...');
    
    // Test a simple query
    const result = await db.select().from(users).limit(1);
    console.log('Successfully queried users table. Row count:', result.length);
    
    // Test enum handling
    const usersByPackage = await db.select().from(users)
      .where(eq(users.selectedPackage, 'BEGINNER'));
    console.log('Successfully queried users with package type filter');
    
    console.log('All Drizzle ORM tests passed successfully');
    return true;
  } catch (error) {
    console.error('Drizzle connection test failed:', error);
    return false;
  }
}

testDrizzleConnection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
