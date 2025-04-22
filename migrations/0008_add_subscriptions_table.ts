export async function up(db: any) {
  console.log('Running migration: add subscriptions table');
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        package_type ENUM('OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE') NOT NULL,
        status ENUM('ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
        amount DECIMAL(10, 2) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        payment_method ENUM('PAYSTACK', 'BANK_TRANSFER', 'OTHER') NOT NULL DEFAULT 'PAYSTACK',
        payment_reference VARCHAR(255),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    console.log('Successfully created subscriptions table');
    
    return true;
  } catch (error) {
    console.error('Error creating subscriptions table:', error);
    throw error;
  }
}

export async function down(db: any) {
  console.log('Running down migration: remove subscriptions table');
  
  try {
    await db.execute(`DROP TABLE IF EXISTS subscriptions;`);
    console.log('Successfully removed subscriptions table');
    
    return true;
  } catch (error) {
    console.error('Error removing subscriptions table:', error);
    throw error;
  }
}