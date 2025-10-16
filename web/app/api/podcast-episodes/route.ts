import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Topic IDs for the three shows
// Note: If a topic doesn't have a valid UUID, we'll try to find it by title
const SHOWS = [
  {
    name: 'AI Daily',
    topicId: '770a27b8-28a8-40bd-ad82-d9c0952924ce',
    title: 'AI Research Papers - Daily',
    order: 0,
  },
  {
    name: 'Peer Review Fight Club',
    topicId: '5c6c2fd7-fcec-417b-ab48-27db253443b8',
    title: null,
    order: 1,
  },
  {
    name: 'Crypto Daily Research',
    topicId: process.env.CRYPTO_PODCAST_TOPIC_ID || null,
    title: 'Crypto Market Daily Brief',
    order: 2,
  },
] as const;

export async function GET() {
  try {
    const episodes = [];

    // Fetch current episode for each show
    for (const showInfo of SHOWS) {
      try {
        let topic = null;

        // Try to find topic by ID first, then by title
        if (showInfo.topicId) {
          const { data, error } = await supabase
            .from('topics')
            .select('id, title, current_episode_id')
            .eq('id', showInfo.topicId)
            .maybeSingle();

          if (!error && data) {
            topic = data;
          }
        }

        // If not found by ID and we have a title, try finding by title
        if (!topic && showInfo.title) {
          const { data, error } = await supabase
            .from('topics')
            .select('id, title, current_episode_id')
            .ilike('title', showInfo.title)
            .maybeSingle();

          if (!error && data) {
            topic = data;
          }
        }

        if (!topic) {
          console.warn(`Topic not found for ${showInfo.name}`);
          continue;
        }

        if (!topic.current_episode_id) {
          console.warn(`No current episode for ${showInfo.name}`);
          continue;
        }

        // Fetch the current episode
        const { data: episode, error: episodeError } = await supabase
          .from('episodes')
          .select('id, title, description, audio_url, episode_number')
          .eq('id', topic.current_episode_id)
          .maybeSingle();

        if (episodeError) {
          console.error(`Error fetching episode for ${showInfo.name}:`, episodeError);
          continue;
        }

        if (episode && episode.audio_url) {
          let papers = undefined as
            | Array<{
                id: string;
                title: string;
                summary?: string;
                fullText?: string;
              }>
            | undefined;

          if (showInfo.name === 'AI Daily') {
            try {
              const { data: coveredPapers, error: coveredPapersError } = await supabase
                .from('covered_papers')
                .select(
                  'paper_id, title, paper_content, paper_full_text, covered_at'
                )
                .eq('episode_id', episode.id)
                .order('covered_at', { ascending: true })
                .limit(3);

              if (coveredPapersError) {
                console.warn('Error fetching AI Daily papers:', coveredPapersError);
              } else if (coveredPapers && coveredPapers.length > 0) {
                papers = coveredPapers.map((paper) => ({
                  id: paper.paper_id,
                  title: paper.title,
                  summary: paper.paper_content || undefined,
                  fullText: paper.paper_full_text || undefined,
                }));
              }
            } catch (papersError) {
              console.warn('Unexpected error loading AI Daily papers:', papersError);
            }
          }

          episodes.push({
            id: `${showInfo.name.toLowerCase().replace(/\s+/g, '-')}-${episode.id}`,
            title: `${showInfo.name} — ${episode.title || `Episode ${episode.episode_number}`}`,
            description: episode.description || undefined,
            src: episode.audio_url,
            showName: showInfo.name,
            order: showInfo.order,
            papers,
            topicId: topic.id,
            episodeNumber: episode.episode_number,
            isDated: true, // All shows display dates
          });
        }
      } catch (err) {
        console.error(`Error processing ${showInfo.name}:`, err);
      }
    }

    // Sort by order
    episodes.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      episodes,
      count: episodes.length,
    });
  } catch (error) {
    console.error('Error fetching podcast episodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    );
  }
}
