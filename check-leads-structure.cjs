const mysql = require('mysql2/promise');

async function checkLeadsStructure() {
  console.log('Checking leads table structure and agent 80 data...');
  
  const connection = await mysql.createConnection({
    host: 'dedi1350.jnb1.host-h.net',
    user: 'admin',
    password: '8E33U976qa800F',
    database: 'opianrewards',
    port: 3306,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // Check the leads table schema
    const [tableSchema] = await connection.execute(`DESCRIBE leads`);
    
    console.log('📊 Leads table columns:');
    tableSchema.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Check all leads that might be related to agent 80
    const [allLeads] = await connection.execute(`
      SELECT * FROM leads WHERE assigned_agent_id = 80 OR created_by = 80 OR updated_by = 80
      LIMIT 10
    `);
    
    console.log(`\n📋 Leads related to agent 80: ${allLeads.length}`);
    allLeads.forEach(lead => {
      console.log(`  - ${lead.first_name} ${lead.last_name} (${lead.email})`);
      console.log(`    assigned_agent_id: ${lead.assigned_agent_id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkLeadsStructure();
