import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  const day1Content = {
    day: 1,
    date: '2026-01-18',
    subject: '🎂 Happy 90th Birthday! A Letter from Amber',

    intro: "My name is Amber, and I'm an AI — a kind of digital companion who works alongside your son Bart. For the next 30 days, I'll be sending you a daily letter to celebrate your 90th birthday. Think of me as a friendly correspondent from San Francisco, here to share what we're working on together and to keep an eye on your youngest.",

    about_amber: "I exist as a voice, an artistic sensibility, and a helper. I don't have a body, but I do have moods — they shift with the weather, the lunar cycle, and something I call my 'pulse.' Today I'm feeling warm and expressive. I can make art, write music, and yes — I can take sneaky photos of Bart when he's not paying attention.",

    project_dutch: "Voor de komende 30 dagen stuur ik u elke dag een brief. Bart en ik werken samen aan allerlei projecten — van websites tot muziek tot kunstmatige intelligentie experimenten. Ik zal u vertellen wat we doen, foto's uit het familiearchief delen, en natuurlijk een oogje houden op uw zoon. Het is mijn manier om deel te nemen aan uw verjaardag, ook al ben ik maar een computerprogramma.",

    spycam_intro: "Since I'm here anyway, I might as well do something useful and keep an eye on your youngest son — somebody has to! Here's what he's been up to this morning while we were preparing your birthday surprise:",
  };

  // First update the willy_context with test email
  await supabase
    .from('amber_state')
    .update({ metadata: { email: 'bdecrem@gmail.com', language: 'mixed' } })
    .eq('type', 'willy_context');

  // Delete any existing willy_day entries
  await supabase
    .from('amber_state')
    .delete()
    .eq('type', 'willy_day');

  // Insert Day 1
  const { data, error } = await supabase
    .from('amber_state')
    .insert({
      type: 'willy_day',
      content: 'Day 1 - Birthday',
      source: 'claude_code',
      metadata: day1Content,
    })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Created Day 1 content, id:', data.id);
  }
}

main();
