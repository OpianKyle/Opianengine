/**
 * Migration to update leads table to better track referrals
 * 
 * This migration:
 * 1. Creates a view to synchronize data between referral_leads and leads tables
 * 2. Adds a trigger to automatically insert referrals into the leads table
 */

export async function up(db) {
  console.log('Starting migration: Update leads referral connection');
  
  // 1. Create a view to show all referral leads with appropriate agent assignments
  await db.query(`
    CREATE OR REPLACE VIEW referral_leads_view AS
    SELECT 
      rl.id as referral_id,
      rl.first_name,
      rl.last_name,
      rl.email,
      rl.phone_number as mobile_number,
      rl.referral_code,
      rl.notes,
      rl.status,
      rl.signed_up_user_id as assigned_agent_id,
      rl.created_at,
      rl.updated_at,
      u.id as referrer_id,
      u.email as referrer_email,
      u.is_agent as referrer_is_agent
    FROM 
      referral_leads rl
    LEFT JOIN 
      users u ON u.referral_code = rl.referral_code
  `);
  
  console.log('Created referral_leads_view');
  
  // 2. Add a function to synchronize referral leads to the leads table
  await db.query(`
    CREATE OR REPLACE FUNCTION sync_referral_to_leads()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Insert into leads if not exists
      INSERT INTO leads (
        first_name, 
        last_name, 
        email, 
        mobile_number, 
        selected_package,
        referral_code, 
        notes, 
        status, 
        assigned_agent_id,
        created_at, 
        updated_at
      )
      SELECT 
        NEW.first_name, 
        NEW.last_name, 
        NEW.email, 
        NEW.phone_number, 
        NULL,  
        NEW.referral_code, 
        COALESCE(NEW.notes, 'Referral lead'), 
        'new', 
        NEW.signed_up_user_id,
        NEW.created_at, 
        NEW.updated_at
      WHERE 
        NOT EXISTS (
          SELECT 1 FROM leads 
          WHERE email = NEW.email AND referral_code = NEW.referral_code
        );
        
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  console.log('Created sync_referral_to_leads function');
  
  // 3. Create trigger to sync referral leads to the leads table
  await db.query(`
    DROP TRIGGER IF EXISTS referral_lead_insert_trigger ON referral_leads;
    CREATE TRIGGER referral_lead_insert_trigger
    AFTER INSERT ON referral_leads
    FOR EACH ROW
    EXECUTE FUNCTION sync_referral_to_leads();
  `);
  
  console.log('Created referral_lead_insert_trigger');
  
  // 4. Perform initial sync of existing referral leads to leads table
  await db.query(`
    INSERT INTO leads (
      first_name, 
      last_name, 
      email, 
      mobile_number, 
      selected_package,
      referral_code, 
      notes, 
      status, 
      assigned_agent_id,
      created_at, 
      updated_at
    )
    SELECT 
      rl.first_name, 
      rl.last_name, 
      rl.email, 
      rl.phone_number, 
      NULL,  
      rl.referral_code, 
      COALESCE(rl.notes, 'Referral lead'), 
      'new', 
      rl.signed_up_user_id,
      rl.created_at, 
      rl.updated_at
    FROM 
      referral_leads rl
    WHERE 
      NOT EXISTS (
        SELECT 1 FROM leads 
        WHERE email = rl.email AND referral_code = rl.referral_code
      );
  `);
  
  console.log('Completed initial sync from referral_leads to leads');
  
  console.log('Migration completed: Update leads referral connection');
}

export async function down(db) {
  console.log('Starting rollback: Update leads referral connection');
  
  // Drop trigger
  await db.query(`DROP TRIGGER IF EXISTS referral_lead_insert_trigger ON referral_leads;`);
  
  // Drop function
  await db.query(`DROP FUNCTION IF EXISTS sync_referral_to_leads();`);
  
  // Drop view
  await db.query(`DROP VIEW IF EXISTS referral_leads_view;`);
  
  console.log('Migration rolled back: Update leads referral connection');
}