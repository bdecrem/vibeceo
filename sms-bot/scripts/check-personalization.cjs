const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Check for subscriber(s)
  const { data: subscribers, error: subError } = await supabase
    .from('sms_subscribers')
    .select('id, phone_number, personalization')
    .ilike('phone_number', '%7185');

  if (subError) {
    console.log('Subscriber error:', subError.message);
    process.exit(1);
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('No subscribers found');
    process.exit(1);
  }

  console.log('=== SUBSCRIBERS ===');
  subscribers.forEach(sub => {
    console.log('\nPhone:', sub.phone_number);
    console.log('ID:', sub.id);
    console.log('Personalization:', JSON.stringify(sub.personalization, null, 2));
  });

  const subscriber = subscribers[0];

  // Check conversation_context
  const { data: contexts, error: ctxError } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('subscriber_id', subscriber.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== RECENT CONVERSATION CONTEXT ===');
  if (ctxError) {
    console.log('Context error:', ctxError.message);
  } else if (!contexts || contexts.length === 0) {
    console.log('No conversation context found');
  } else {
    contexts.forEach(ctx => {
      console.log('\nType:', ctx.context_type);
      console.log('Created:', ctx.created_at);
      console.log('History:', JSON.stringify(ctx.conversation_history, null, 2));
      console.log('Metadata:', JSON.stringify(ctx.metadata, null, 2));
    });
  }

  process.exit(0);
})();
