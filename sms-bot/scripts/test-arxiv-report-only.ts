/**
 * Test script - just fetch and display the latest arXiv report
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

const BART_PHONE = '+16508989508';

async function main() {
  console.log('🚀 Testing arXiv Report retrieval...\n');

  try {
    const twilio = (await import('twilio')).default;
    const { getLatestStoredArxivGraphReport } = await import('../agents/arxiv-research-graph/index.js');
    const { buildReportViewerUrl } = await import('../lib/utils/report-viewer-link.js');
    const { createShortLink } = await import('../lib/utils/shortlink-service.js');

    // 1. Get latest arXiv report
    console.log('1️⃣ Fetching latest arXiv report...');
    const arxivReport = await getLatestStoredArxivGraphReport();

    if (!arxivReport) {
      throw new Error('No arXiv report found. Run the collection job first.');
    }

    console.log(`   ✅ Report date: ${arxivReport.date}`);
    console.log(`   ✅ Featured papers: ${arxivReport.featuredCount}`);
    console.log(`   ✅ Summary: ${arxivReport.summary}`);

    // 2. Build viewer URL and shortlink
    console.log('\n2️⃣ Creating report viewer shortlink...');
    const viewerUrl = buildReportViewerUrl({ path: arxivReport.reportPath });
    console.log(`   📄 Viewer URL: ${viewerUrl}`);

    const reportShortLink = await createShortLink(viewerUrl, {
      context: 'arxiv-report-test',
      createdFor: 'test_script',
      createdBy: 'sms-bot'
    });
    console.log(`   ✅ Shortlink: ${reportShortLink}`);

    // 3. Format test message
    const message = `📚 arXiv Research Report - ${arxivReport.date}

${arxivReport.summary}

Read full report: ${reportShortLink}`;

    console.log('\n📱 SMS Message Preview:');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));

    // 4. Send SMS
    console.log('\n3️⃣ Sending SMS to Bart...');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials');
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
