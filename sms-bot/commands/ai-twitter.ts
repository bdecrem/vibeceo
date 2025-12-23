/**
 * AI Twitter Daily SMS Command
 *
 * Commands:
 * - AIT / AI TWITTER - Get latest report + podcast
 * - AIT SUB - Subscribe to daily digest
 * - AIT UNSUB - Unsubscribe
 * - AIT ADD @handle - (Admin) Add account to sources
 * - AIT RUN - (Admin) Run the daily agent manually
 */

import type { CommandContext, CommandHandler } from './types.js';
import { supabase } from '../lib/supabase.js';
import { loadUserContext } from '../lib/context-loader.js';
import { runAITwitterDaily, getTopicId } from '../agents/ai-twitter-daily/index.js';
import { getAgentSubscribers, subscribeToAgent, unsubscribeFromAgent } from '../lib/agent-subscriptions.js';
import { getLatestReportMetadata } from '../agents/report-storage.js';
import { buildReportViewerUrl } from '../lib/utils/report-viewer-link.js';
import { buildMusicPlayerUrl } from '../lib/utils/music-player-link.js';
import { createShortLink } from '../lib/utils/shortlink-service.js';

const AGENT_SLUG = 'ai-twitter-daily';
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '').split(',').filter(Boolean);

export const aiTwitterCommandHandler: CommandHandler = {
  name: 'ai-twitter',

  matches(context: CommandContext): boolean {
    const msg = context.messageUpper.trim();
    return (
      msg === 'AIT' ||
      msg.startsWith('AIT ') ||
      msg === 'AI TWITTER' ||
      msg.startsWith('AI TWITTER ')
    );
  },

  async handle(context: CommandContext): Promise<boolean> {
    const { message, from, normalizedFrom, twilioClient, sendSmsResponse, sendChunkedSmsResponse, updateLastMessageDate } = context;
    const msgUpper = message.toUpperCase().trim();

    const reply = async (msg: string) => {
      await sendChunkedSmsResponse(from, msg, twilioClient);
      await updateLastMessageDate(normalizedFrom);
    };

    // Parse subcommand
    let subCommand = '';
    if (msgUpper.startsWith('AIT ')) {
      subCommand = msgUpper.replace('AIT ', '').trim();
    } else if (msgUpper.startsWith('AI TWITTER ')) {
      subCommand = msgUpper.replace('AI TWITTER ', '').trim();
    }

    // Get user context
    const userContext = await loadUserContext(normalizedFrom);
    const subscriberId = userContext?.subscriberId;
    const isAdmin = ADMIN_PHONES.includes(normalizedFrom);

    // Handle subcommands
    if (subCommand === 'SUB' || subCommand === 'SUBSCRIBE') {
      if (!subscriberId) {
        await reply('Please register first by sending "HI"');
        return true;
      }
      await subscribeToAgent(subscriberId, AGENT_SLUG);
      await reply(
        `Subscribed to AI Twitter Daily!\n\n` +
          `You'll receive daily summaries of what AI researchers are discussing.\n\n` +
          `Send "AIT UNSUB" to unsubscribe.`
      );
      return true;
    }

    if (subCommand === 'UNSUB' || subCommand === 'UNSUBSCRIBE') {
      if (!subscriberId) {
        await reply('You are not subscribed.');
        return true;
      }
      await unsubscribeFromAgent(subscriberId, AGENT_SLUG);
      await reply('Unsubscribed from AI Twitter Daily.');
      return true;
    }

    if (subCommand.startsWith('ADD ') && isAdmin) {
      const handle = subCommand.replace('ADD ', '').replace('@', '').trim();
      if (!handle) {
        await reply('Usage: AIT ADD @username');
        return true;
      }

      const { error } = await supabase.from('content_sources').insert({
        agent_slug: AGENT_SLUG,
        source_type: 'twitter_account',
        identifier: handle,
        display_name: handle,
        priority: 50,
      });

      if (error) {
        if (error.code === '23505') {
          await reply(`@${handle} is already in the list.`);
        } else {
          await reply(`Failed to add @${handle}: ${error.message}`);
        }
      } else {
        await reply(`Added @${handle} to AI Twitter Daily sources.`);
      }
      return true;
    }

    if (subCommand === 'RUN' && isAdmin) {
      await sendSmsResponse(from, 'Running AI Twitter Daily...', twilioClient);

      try {
        const result = await runAITwitterDaily();
        const reportLink = result.reportShortLink || result.reportUrl || 'N/A';
        const podcastLink = result.podcastShortLink || result.podcastUrl || 'N/A';

        await reply(
          `AI Twitter Daily complete!\n\n` +
            `Tweets analyzed: ${result.tweetCount}\n` +
            `Topics found: ${result.analysis.topicGroups.length}\n\n` +
            `Report: ${reportLink}\n` +
            `Podcast: ${podcastLink}`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await reply(`AI Twitter Daily failed: ${errorMessage}`);
      }
      return true;
    }

    if (subCommand === 'LIST' && isAdmin) {
      const { data: sources } = await supabase
        .from('content_sources')
        .select('identifier, display_name, priority')
        .eq('agent_slug', AGENT_SLUG)
        .eq('active', true)
        .order('priority', { ascending: false });

      if (!sources || sources.length === 0) {
        await reply('No Twitter sources configured.');
        return true;
      }

      const list = sources.map((s) => `@${s.identifier}`).join(', ');
      await reply(`AI Twitter sources (${sources.length}):\n${list}`);
      return true;
    }

    // Default: Get latest report and episode
    const topicId = getTopicId();

    // Get latest report metadata
    const reportMetadata = await getLatestReportMetadata('ai-twitter-daily');

    // Get latest episode
    const { data: latestEpisode } = await supabase
      .from('episodes')
      .select('title, description, audio_url, published_date')
      .eq('topic_id', topicId)
      .order('published_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestEpisode && !reportMetadata) {
      await reply(
        `AI Twitter Daily\n\n` +
          `No episodes yet. Subscribe with "AIT SUB" to get daily updates on what AI researchers are discussing.`
      );
      return true;
    }

    // Build proper viewer/player URLs with shortlinks
    let reportLink: string | null = null;
    let podcastLink: string | null = null;

    if (reportMetadata) {
      const reportViewerUrl = buildReportViewerUrl({ path: reportMetadata.reportPath });
      try {
        reportLink = await createShortLink(reportViewerUrl, {
          context: 'ai-twitter-daily',
          createdBy: 'sms-bot',
        });
      } catch (e) {
        reportLink = reportViewerUrl;
      }
    }

    if (latestEpisode?.audio_url) {
      const musicPlayerUrl = buildMusicPlayerUrl({
        src: latestEpisode.audio_url,
        title: latestEpisode.title || 'AI Twitter Daily',
        description: latestEpisode.description?.substring(0, 200),
        autoplay: true,
      });
      try {
        podcastLink = await createShortLink(musicPlayerUrl, {
          context: 'ai-twitter-daily',
          createdBy: 'sms-bot',
        });
      } catch (e) {
        podcastLink = musicPlayerUrl;
      }
    }

    const displayDate = latestEpisode?.published_date || reportMetadata?.date || new Date().toISOString().split('T')[0];
    const description = latestEpisode?.description?.substring(0, 250) || reportMetadata?.summary?.substring(0, 250) || 'Today\'s AI Twitter digest';

    const response = [
      `AI Twitter Daily`,
      `${displayDate}`,
      '',
      description,
      '',
    ];

    if (reportLink) {
      response.push(`Read: ${reportLink}`);
    }

    if (podcastLink) {
      response.push(`Listen: ${podcastLink}`);
    }

    response.push('');
    response.push('Reply "AIT SUB" to subscribe daily.');

    await reply(response.join('\n'));
    return true;
  },
};
