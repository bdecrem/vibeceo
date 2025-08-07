const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWebConsole() {
  console.log('🔍 Testing web console command processing...\n');

  // Find bartdecrem+15 user
  const testEmail = 'bartdecrem+15@gmail.com';
  
  console.log('📝 Looking for user:', testEmail);
  
  // Check by email
  const { data: byEmail, error: emailError } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('email', testEmail)
    .single();
  
  if (emailError) {
    console.log('❌ Error finding by email:', emailError.message);
  } else if (byEmail) {
    console.log('✅ Found by email:');
    console.log('  - ID:', byEmail.id);
    console.log('  - Slug:', byEmail.slug);
    console.log('  - Role:', byEmail.role);
    console.log('  - Supabase ID:', byEmail.supabase_id);
    console.log('  - Phone:', byEmail.phone_number);
  }
  
  // Also check for any user with this email pattern
  console.log('\n📝 Checking for similar emails...');
  const { data: similar, error: simError } = await supabase
    .from('sms_subscribers')
    .select('email, slug, role, supabase_id')
    .ilike('email', '%bartdecrem+15%')
    .limit(5);
  
  if (simError) {
    console.log('❌ Error in similarity search:', simError);
  } else if (similar && similar.length > 0) {
    console.log('✅ Found similar emails:');
    similar.forEach(s => {
      console.log(`  - ${s.email} (@${s.slug}, role: ${s.role})`);
    });
  } else {
    console.log('❌ No similar emails found');
  }
  
  // Check what commands are allowed for 'coder' role
  console.log('\n📝 Checking allowed commands for coder role...');
  const ALLOWED_COMMANDS = {
    user: ['wtaf', 'meme', 'commands'],
    coder: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'commands'],
    degen: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix', 'commands'],
    operator: ['wtaf', 'meme', 'edit', 'slug', 'index', 'fave', 'remix', 'public', 'stackzad', 'stackpublic', 'commands']
  };
  
  console.log('Coder can use:', ALLOWED_COMMANDS.coder.join(', '));
  
  // Test command parsing
  const testCommand = 'wtaf make me a page';
  const parts = testCommand.trim().split(/\s+/);
  const type = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1).join(' ');
  
  console.log('\n📝 Testing command parsing...');
  console.log('Command:', testCommand);
  console.log('Parsed type:', type);
  console.log('Parsed args:', args);
  console.log('Is allowed for coder?:', ALLOWED_COMMANDS.coder.includes(type));
  
  console.log('\n✨ Test complete!');
}

testWebConsole().catch(console.error);