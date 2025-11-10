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
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
    process.env[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  console.log('\n=== Checking Database ===\n');
  
  // Check orders directly with admin client
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_id, status, total, created_at, tenant_id')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('=== Recent Orders (Admin View) ===');
  if (error) {
    console.error('❌ Error fetching orders:', error.message);
    console.error('Details:', error);
  } else {
    console.log(`✅ Found ${orders?.length || 0} orders\n`);
    orders?.forEach((o: any) => {
      const hasTenanId = 'tenant_id' in o;
      console.log(`Order: ${o.id.substring(0, 13)}...`);
      console.log(`  Total: $${o.total}`);
      console.log(`  Status: ${o.status}`);
      console.log(`  Tenant ID: ${o.tenant_id || '❌ MISSING COLUMN!'}`);
      console.log(`  Has tenant_id field: ${hasTenanId ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });
  }
  
  // Check customers
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, tenant_id')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('=== Recent Customers ===');
  customers?.forEach((c: any) => {
    console.log(`- ${c.name} (${c.phone}): tenant_id = ${c.tenant_id || '❌ MISSING!'}`);
  });
  
  console.log('\n=== Diagnosis ===');
  if (orders && orders.length > 0) {
    const firstOrder: any = orders[0];
    if (!('tenant_id' in firstOrder) || firstOrder.tenant_id === null) {
      console.log('❌ PROBLEM: tenant_id column is missing or NULL in orders table');
      console.log('📝 SOLUTION: You need to run the migration: src/supabase_sql/supabase.sql');
      console.log('   This will add tenant_id columns and set up proper RLS policies.');
    } else {
      console.log('✅ tenant_id column exists');
      console.log('🔍 Orders might be filtered by RLS policies. Check your Supabase auth.');
    }
  } else {
    console.log('ℹ️  No orders found in database');
  }
}

checkDB().then(() => process.exit(0)).catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});

