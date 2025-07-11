const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkWtafSchema() {
  console.log('🔍 Checking wtaf_submissions table schema...\n');
  
  try {
    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('Environment check:');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');
    
    // Try to get the table structure by attempting a simple query
    console.log('\n📋 Attempting to query table structure...');
    const { data: tableData, error: tableError } = await supabase
      .from('wtaf_submissions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table query error:', tableError);
      return;
    }
    
    console.log('✅ Table exists and is queryable');
    
    if (tableData && tableData.length > 0) {
      console.log('\n📊 Sample record structure:');
      console.log('Keys:', Object.keys(tableData[0]));
      console.log('Sample data:', JSON.stringify(tableData[0], null, 2));
    } else {
      console.log('\n📊 Table exists but has no records');
      
      // Try to insert a test record to see what fields are required
      console.log('\n🧪 Testing insert to understand required fields...');
      const testData = {
        submission_data: { test: 'value' },
        created_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('wtaf_submissions')
        .insert(testData)
        .select('*');
      
      if (insertError) {
        console.error('❌ Insert error (this tells us about required fields):');
        console.error(insertError);
      } else {
        console.log('✅ Insert successful! Record structure:');
        console.log(JSON.stringify(insertData, null, 2));
        
        // Clean up test record
        await supabase
          .from('wtaf_submissions')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkWtafSchema(); 