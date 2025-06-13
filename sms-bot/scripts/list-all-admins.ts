import 'dotenv/config';
import { supabase } from '../lib/supabase.js';

async function listAllAdmins() {
  try {
    console.log('Fetching all admin users...');
    
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('phone_number, confirmed, is_admin, unsubscribed, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admins:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No admin users found');
      return;
    }

    console.log(`✅ Found ${data.length} admin user(s):`);
    console.log('=====================================');
    
    data.forEach((admin, index) => {
      const status = admin.unsubscribed ? '❌ UNSUBSCRIBED' : 
                    admin.confirmed ? '✅ ACTIVE' : '⏳ PENDING';
      
      console.log(`${index + 1}. ${admin.phone_number}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${new Date(admin.created_at).toLocaleDateString()}`);
      console.log('');
    });
    
    const activeAdmins = data.filter(admin => !admin.unsubscribed && admin.confirmed);
    console.log(`📊 Summary: ${activeAdmins.length} active admin(s) can use CODE command`);
    
  } catch (error) {
    console.error('Error listing admins:', error);
  } finally {
    process.exit();
  }
}

listAllAdmins(); 