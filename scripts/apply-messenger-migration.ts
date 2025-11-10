import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL!,
  envVars.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('\n=== Checking messenger_sender_id Column ===\n');
  
  // Check if column exists by trying to select it
  const { data: testCustomer, error: selectError } = await supabase
    .from('customers')
    .select('id, messenger_sender_id')
    .limit(1)
    .maybeSingle();
    
  if (!selectError && testCustomer !== null && 'messenger_sender_id' in testCustomer) {
    console.log('✅ messenger_sender_id column already exists!');
    return;
  }
  
  console.log('Column does not exist yet. Please run the following SQL in your Supabase Dashboard:\n');
  console.log('Go to: Supabase Dashboard > SQL Editor > New Query\n');
  console.log('Copy and paste this SQL:\n');
  console.log('----------------------------------------');
  
  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'supabase_sql', 'migration_add_messenger_sender_id.sql'),
    'utf8'
  );
  
  console.log(migrationSQL);
  console.log('----------------------------------------\n');
  console.log('After running the SQL, run this script again to verify.');
}

applyMigration()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  });

