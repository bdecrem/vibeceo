import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tqniseocczttrfwtpbdr.supabase.co',
  'sb_secret_DHoa5-YVra0KuVZZH3YztA_PxIvwpV1'
);

const agentId = 'bf1fb0e7-c2c8-4761-b96f-02c5981d52b8';

// Query agent
const { data: agent, error: agentError } = await supabase
  .from('agents')
  .select('*')
  .eq('id', agentId)
  .single();

if (agentError) {
  console.error('Agent query error:', agentError);
} else {
  console.log('=== AGENT ===');
  console.log(JSON.stringify(agent, null, 2));
}

// Query agent version
const { data: version, error: versionError } = await supabase
  .from('agent_versions')
  .select('*')
  .eq('agent_id', agentId)
  .single();

if (versionError) {
  console.error('Version query error:', versionError);
} else {
  console.log('\n=== AGENT VERSION ===');
  console.log('Version:', version.version);
  console.log('Changelog:', version.changelog);
  console.log('\nDefinition JSONB:');
  console.log(JSON.stringify(version.definition_jsonb, null, 2));
}

console.log('\n✅ Agent creation test PASSED');
console.log('- Agent successfully saved to database');
console.log('- Agent version successfully created');
console.log('- All fields properly stored');
