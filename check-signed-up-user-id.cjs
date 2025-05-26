const mysql = require('mysql2/promise');

async function checkSignedUpUserId() {
  console.log('Checking leads assigned via signed_up_user_id...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check leads with signed_up_user_id = 80
    const [signedUpLeads] = await connection.execute(`
      SELECT id, first_name, last_name, email, status, assigned_agent_id, signed_up_user_id, created_at
      FROM leads WHERE signed_up_user_id = 80
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 Leads with signed_up_user_id = 80: ${signedUpLeads.length}`);
    signedUpLeads.forEach(lead => {
      console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email}) - assigned_agent_id: ${lead.assigned_agent_id}`);
    });
    
    // Check the leads table schema to understand the fields
    const [tableSchema] = await connection.execute(`
      DESCRIBE leads
    `);
    
    console.log('\n📊 Leads table schema:');
    tableSchema.forEach(field => {
      if (field.Field.includes('agent') || field.Field.includes('signed')) {
        console.log(`  - ${field.Field}: ${field.Type}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSignedUpUserId();
