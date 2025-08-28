/**
 * Test script to verify wtaf_desktop_config table access
 * Run this in browser console after applying the RLS fix
 */

async function testDesktopConfigAccess() {
    console.log('🧪 Testing wtaf_desktop_config table access...');
    
    // Initialize Supabase client (same as desktop)
    const SUPABASE_URL = 'https://tqniseocczttrfwtpbdr.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmlzZW9jY3p0dHJmd3RwYmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM0ODA3MTcsImV4cCI6MjAzOTA1NjcxN30.XvI08vG37MNaFPMV2CUBKfscFh7VlJw4oC0FKQT6vXg';
    
    let testClient;
    
    // Check if Supabase is available
    if (typeof supabase !== 'undefined') {
        testClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
    } else {
        console.error('❌ Supabase library not loaded');
        return false;
    }
    
    let allTestsPassed = true;
    
    // Test 1: Read default config (should work with anon key)
    console.log('\n📋 Test 1: Reading default desktop config...');
    try {
        const { data: defaultConfig, error: defaultError } = await testClient
            .from('wtaf_desktop_config')
            .select('*')
            .is('user_id', null)
            .eq('desktop_version', 'webtoys-os-v3')
            .single();
        
        if (defaultError) {
            console.error('❌ Test 1 FAILED:', defaultError.message, defaultError.code);
            allTestsPassed = false;
        } else if (defaultConfig) {
            console.log('✅ Test 1 PASSED: Default config loaded');
            console.log('   - Apps count:', defaultConfig.app_registry?.length || 0);
            console.log('   - Background:', defaultConfig.settings?.background || 'not set');
        } else {
            console.warn('⚠️ Test 1 PARTIAL: No default config found (but no error)');
        }
    } catch (error) {
        console.error('❌ Test 1 FAILED with exception:', error);
        allTestsPassed = false;
    }
    
    // Test 2: Read all configs (should work with new policies)
    console.log('\n📋 Test 2: Reading all configs...');
    try {
        const { data: allConfigs, error: allError } = await testClient
            .from('wtaf_desktop_config')
            .select('user_id, desktop_version, created_at')
            .eq('desktop_version', 'webtoys-os-v3');
        
        if (allError) {
            console.error('❌ Test 2 FAILED:', allError.message, allError.code);
            allTestsPassed = false;
        } else {
            console.log('✅ Test 2 PASSED: All configs readable');
            console.log('   - Total configs:', allConfigs?.length || 0);
            const publicCount = allConfigs?.filter(c => c.user_id === null).length || 0;
            const userCount = allConfigs?.filter(c => c.user_id !== null).length || 0;
            console.log('   - Public configs:', publicCount);
            console.log('   - User configs:', userCount);
        }
    } catch (error) {
        console.error('❌ Test 2 FAILED with exception:', error);
        allTestsPassed = false;
    }
    
    // Test 3: Try to update default config (should work if policies allow)
    console.log('\n📋 Test 3: Testing update permissions...');
    try {
        const testUpdate = {
            updated_at: new Date().toISOString(),
            // Just update timestamp, don't change actual data
        };
        
        const { error: updateError } = await testClient
            .from('wtaf_desktop_config')
            .update(testUpdate)
            .is('user_id', null)
            .eq('desktop_version', 'webtoys-os-v3');
        
        if (updateError) {
            // This might fail and that's OK depending on policy setup
            console.warn('⚠️ Test 3 INFO: Update not allowed:', updateError.message);
            console.log('   (This is expected if policies restrict anon updates)');
        } else {
            console.log('✅ Test 3 PASSED: Update allowed');
        }
    } catch (error) {
        console.warn('⚠️ Test 3 INFO: Update threw exception (may be expected)');
    }
    
    // Test 4: Check permissions by trying to read table structure
    console.log('\n📋 Test 4: Checking table access permissions...');
    try {
        const { data: tableInfo, error: infoError } = await testClient
            .from('wtaf_desktop_config')
            .select('id, user_id, desktop_version, created_at')
            .limit(1);
        
        if (infoError) {
            console.error('❌ Test 4 FAILED:', infoError.message);
            allTestsPassed = false;
        } else {
            console.log('✅ Test 4 PASSED: Table accessible');
        }
    } catch (error) {
        console.error('❌ Test 4 FAILED with exception:', error);
        allTestsPassed = false;
    }
    
    // Summary
    console.log('\n🏁 Test Summary:');
    if (allTestsPassed) {
        console.log('✅ All critical tests passed! The 401 errors should be fixed.');
        console.log('🎉 WebtoysOS v3 desktop should now load configs from database.');
    } else {
        console.log('❌ Some tests failed. RLS policies may still need adjustment.');
        console.log('🔧 Consider running the fix script: /scripts/fix-desktop-config-rls-policies.sql');
    }
    
    return allTestsPassed;
}

// Auto-run if in desktop context
if (typeof window !== 'undefined' && window.location?.pathname?.includes('webtoys-os')) {
    console.log('🚀 Auto-running desktop config tests...');
    setTimeout(testDesktopConfigAccess, 2000);
} else {
    console.log('💡 Run testDesktopConfigAccess() to test the desktop config access');
}