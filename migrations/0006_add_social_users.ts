export async function up(db: any) {
  console.log('Running migration: add is_social field to users table');
  try {
    // Check if the column already exists
    const [columns] = await db.execute(
      "SHOW COLUMNS FROM users LIKE 'is_social'"
    );

    if (columns.length === 0) {
      // Add is_social column
      await db.execute(
        "ALTER TABLE users ADD COLUMN is_social BOOLEAN NOT NULL DEFAULT FALSE"
      );
      console.log("Added is_social column to users table");
    } else {
      console.log("Column is_social already exists in users table, skipping");
    }
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}

export async function down(db: any) {
  console.log('Running down migration: remove is_social field from users table');
  try {
    // Check if the column exists
    const [columns] = await db.execute(
      "SHOW COLUMNS FROM users LIKE 'is_social'"
    );

    if (columns.length > 0) {
      // Remove is_social column
      await db.execute("ALTER TABLE users DROP COLUMN is_social");
      console.log("Removed is_social column from users table");
    } else {
      console.log("Column is_social does not exist in users table, skipping");
    }
  } catch (error) {
    console.error("Error during down migration:", error);
    throw error;
  }
}