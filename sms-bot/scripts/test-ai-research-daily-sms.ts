/**
 * One-off script to test AI Research Daily SMS message
 * Generates the combined report and sends SMS with new format
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

const BART_PHONE = '+16508989508';

async function main() {
  console.log('🚀 Testing AI Research Daily SMS...\n');

  try {
    // Dynamic imports to ensure env is loaded first
    const twilio = (await import('twilio')).default;
    const {
      getLatestAiDailyEpisode,
      formatAiDailySms,
      getAiDailyShortLink,
      generateAndStoreAiResearchDailyReport
    } = await import('../lib/sms/ai-daily.js');
    const { getLatestReportMetadata } = await import('../agents/report-storage.js');
    const { buildReportViewerUrl } = await import('../lib/utils/report-viewer-link.js');
    const { createShortLink } = await import('../lib/utils/shortlink-service.js');

    // 1. Fetch AI Daily episode
    console.log('1️⃣ Fetching AI Daily episode...');
    const episode = await getLatestAiDailyEpisode();
    console.log(`   ✅ Got episode: ${episode.title}`);

    // 2. Get podcast shortlink
    console.log('\n2️⃣ Creating podcast shortlink...');
    const podcastShortLink = await getAiDailyShortLink(episode, 'test_script');
    console.log(`   ✅ Podcast link: ${podcastShortLink}`);

    // 3. Generate combined AI Research Daily report
    console.log('\n3️⃣ Generating combined AI Research Daily report...');
    await generateAndStoreAiResearchDailyReport();
    console.log('   ✅ Report generated and stored');

    // 4. Get report metadata
    console.log('\n4️⃣ Retrieving report metadata...');
    const reportMetadata = await getLatestReportMetadata('ai-research-daily');

    if (!reportMetadata) {
      throw new Error('Could not retrieve report metadata');
    }
    console.log(`   ✅ Report date: ${reportMetadata.date}`);
    console.log(`   ✅ Report path: ${reportMetadata.reportPath}`);

    // 5. Build viewer URL and create shortlink
    console.log('\n5️⃣ Creating report viewer shortlink...');
    const viewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
    console.log(`   📄 Viewer URL: ${viewerUrl}`);

    const reportShortLink = await createShortLink(viewerUrl, {
      context: 'ai-research-daily-report',
      createdFor: 'test_script',
      createdBy: 'sms-bot'
    });
    console.log(`   ✅ Report shortlink: ${reportShortLink}`);

    // 6. Format SMS message
    console.log('\n6️⃣ Formatting SMS message...');
    const message = formatAiDailySms(episode, {
      shortLink: podcastShortLink ?? undefined,
      reportLink: reportShortLink ?? undefined
    });

    console.log('\n📱 SMS Message Preview:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));

    // 7. Send SMS
    console.log('\n7️⃣ Sending SMS to Bart...');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials in environment variables');
    }

    const client = twilio(accountSid, authToken);

    await client.messages.create({
      body: message,
      to: BART_PHONE,
      from: fromNumber
    });

    console.log('   ✅ SMS sent successfully!');
    console.log('\n✨ Test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
