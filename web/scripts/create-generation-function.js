const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sql = `
-- Function to calculate the generation level of a single app
-- Uses same recursive logic as get_app_genealogy but for one app

CREATE OR REPLACE FUNCTION get_app_generation_level(app_id UUID)
RETURNS INTEGER AS $$
DECLARE
    generation_level INTEGER := 0;
    current_app_id UUID := app_id;
    parent_app_id UUID;
BEGIN
    -- Walk up the lineage tree to count generations
    LOOP
        -- Check if current app is a remix (has a parent)
        SELECT rl.parent_app_id INTO parent_app_id
        FROM wtaf_remix_lineage rl
        WHERE rl.child_app_id = current_app_id;
        
        -- If no parent found, we've reached the original app
        IF parent_app_id IS NULL THEN
            EXIT;
        END IF;
        
        -- Move up one generation
        generation_level := generation_level + 1;
        current_app_id := parent_app_id;
        
        -- Safety check to prevent infinite loops
        IF generation_level > 10 THEN
            RAISE WARNING 'Generation level exceeded 10, stopping recursion for app %', app_id;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN generation_level;
END;
$$ LANGUAGE plpgsql;
`;

async function createFunction() {
  console.log('🔧 Creating get_app_generation_level SQL function...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
    
    if (error) {
      // Try direct SQL execution if exec_sql RPC doesn't exist
      console.log('⚡ Trying direct SQL execution...');
      const { data: directData, error: directError } = await supabase
        .from('wtaf_content')
        .select('id')
        .limit(1);
      
      if (directError) {
        console.error('❌ Database connection failed:', directError);
        return;
      }
      
      console.log('✅ Database connected. Please run this SQL manually in Supabase:');
      console.log('=====================================');
      console.log(sql);
      console.log('=====================================');
      console.log('📋 Copy the above SQL and paste it in the SQL Editor in your Supabase dashboard');
    } else {
      console.log('✅ SQL function created successfully!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('📋 Please run this SQL manually in Supabase:');
    console.log('=====================================');
    console.log(sql);
    console.log('=====================================');
  }
}

createFunction(); 