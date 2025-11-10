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

async function fixNullTenants() {
  console.log('\n=== Fixing Orders with NULL tenant_id ===\n');
  
  // Get orders with NULL tenant_id
  const { data: nullOrders } = await supabase
    .from('orders')
    .select('id, customer_id')
    .is('tenant_id', null);
    
  if (!nullOrders || nullOrders.length === 0) {
    console.log('✅ No orders with NULL tenant_id found');
    return;
  }
  
  console.log(`Found ${nullOrders.length} orders with NULL tenant_id\n`);
  
  // Get the customer's tenant_id for each order
  for (const order of nullOrders) {
    const { data: customer } = await supabase
      .from('customers')
      .select('tenant_id')
      .eq('id', order.customer_id)
      .single();
      
    if (customer?.tenant_id) {
      console.log(`Updating order ${order.id.substring(0, 8)}... with tenant_id ${customer.tenant_id.substring(0, 8)}...`);
      
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ tenant_id: customer.tenant_id })
        .eq('id', order.id);
        
      if (orderError) {
        console.error(`  ❌ Error updating order: ${orderError.message}`);
      } else {
        console.log(`  ✅ Order updated`);
      }
      
      // Update order_items
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ tenant_id: customer.tenant_id })
        .eq('order_id', order.id);
        
      if (itemsError) {
        console.error(`  ❌ Error updating order items: ${itemsError.message}`);
      } else {
        console.log(`  ✅ Order items updated`);
      }
    } else {
      console.log(`⚠️  Order ${order.id.substring(0, 8)}... - customer has no tenant_id!`);
    }
  }
  
  console.log('\n✅ Done!');
}

fixNullTenants()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  });

