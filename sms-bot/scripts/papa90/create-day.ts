/**
 * Papa 90 - Create Day Content
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/create-day.ts <day_number>
 *
 * Example:
 *   npx tsx --env-file=.env.local scripts/papa90/create-day.ts 1
 *
 * This creates a willy_day entry with placeholder content that you can then
 * edit before sending. Or, Amber can call this programmatically with real content.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DayContent {
  day: number;
  date: string;
  subject: string;
  greeting: string;
  paragraph1: string;
  highlight: string;
  paragraph2: string;
  image_url?: string;
  image_description?: string;
  sent?: boolean;
}

async function createDay(dayNumber: number, content?: Partial<DayContent>) {
  const today = new Date().toISOString().split('T')[0];

  const dayContent: DayContent = {
    day: dayNumber,
    date: content?.date || today,
    subject: content?.subject || `🌅 Brief ${dayNumber} van Amber`,
    greeting: content?.greeting || 'Beste Papa,',
    paragraph1: content?.paragraph1 || '[Eerste paragraaf - wat we vandaag hebben gedaan of ontdekt]',
    highlight: content?.highlight || '[Belangrijk punt of interessant feit om te benadrukken]',
    paragraph2: content?.paragraph2 || '[Afsluitende paragraaf - persoonlijke noot of vooruitblik naar morgen]',
    image_url: content?.image_url,
    image_description: content?.image_description,
    sent: false,
  };

  const { data, error } = await supabase
    .from('amber_state')
    .insert({
      type: 'willy_day',
      content: `Day ${dayNumber} - ${today}`,
      source: 'claude_code',
      metadata: dayContent,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating day:', error);
    process.exit(1);
  }

  console.log(`✓ Created willy_day for Day ${dayNumber}`);
  console.log('  ID:', data.id);
  console.log('  Date:', dayContent.date);
  console.log('');
  console.log('Content (edit in Supabase or send as-is):');
  console.log(JSON.stringify(dayContent, null, 2));
  console.log('');
  console.log('To send:');
  console.log('  npx tsx --env-file=.env.local scripts/papa90/send-daily-email.ts');
}

// Parse command line args
const dayArg = process.argv[2];

if (!dayArg) {
  console.log('Usage: npx tsx --env-file=.env.local scripts/papa90/create-day.ts <day_number>');
  console.log('');
  console.log('Or import and call createDay() programmatically with content.');
  process.exit(1);
}

const dayNumber = parseInt(dayArg, 10);
if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 30) {
  console.error('Day number must be between 1 and 30');
  process.exit(1);
}

createDay(dayNumber);

export { createDay, DayContent };
