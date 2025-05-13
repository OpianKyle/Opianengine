// Check current commission data for shaunk@opianrewards.com
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkAgentCommissions() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || process.env.DB_HOST,
    user: process.env.MYSQL_USER || process.env.DB_USER,
    password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
    port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
  });
  
  try {
    // Get agent ID first
    const agentQuery = `
      SELECT id, email, is_agent 
      FROM users 
      WHERE email = 'shaunk@opianrewards.com';
    `;
    
    const [agentResult] = await connection.execute(agentQuery);
    console.log('Agent details:');
    console.table(agentResult);
    
    if (agentResult.length > 0 && agentResult[0].is_agent) {
      const agentId = agentResult[0].id;
      
      // Get all commission records for the agent
      const commissionsQuery = `
        SELECT ac.id, ac.customer_id, ac.package_type, ac.premium_amount, ac.commission_amount,
               u.email as customer_email, u.selectedPackage as user_package
        FROM agent_commissions ac
        JOIN users u ON ac.customer_id = u.id
        WHERE ac.agent_id = ?
        ORDER BY ac.id;
      `;
      
      const [commissionsResult] = await connection.execute(commissionsQuery, [agentId]);
      console.log('Commission records for agent shaunk@opianrewards.com:');
      console.table(commissionsResult);
      
      // Calculate total commission
      const totalCommission = commissionsResult.reduce((total, record) => {
        return total + record.commission_amount;
      }, 0);
      
      console.log('Total commission amount:', totalCommission);
      
      // Check for inconsistencies between user package and commission package
      const inconsistencies = commissionsResult.filter(record => 
        record.user_package !== null && record.user_package !== record.package_type
      );
      
      if (inconsistencies.length > 0) {
        console.log('Found inconsistencies between user package and commission package:');
        console.table(inconsistencies);
      } else {
        console.log('No inconsistencies found between user package and commission package.');
      }
    }
    
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await connection.end();
  }
}

checkAgentCommissions();
