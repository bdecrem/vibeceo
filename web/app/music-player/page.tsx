'use client';

import { Suspense, type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RealtimeAudioClient, StreamingAudioPlayer } from '@/lib/realtime-audio';
import PlayInCrashAppBanner from '@/components/PlayInCrashAppBanner';

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_PLAYBACK_SPEED_INDEX = PLAYBACK_SPEEDS.indexOf(1);
const WAVEFORM_BAR_HEIGHTS = [
  48, 26, 38, 42, 34, 52, 28, 40, 44, 30,
  46, 32, 38, 50, 28, 44, 36, 48, 30, 42,
  34, 52, 28, 46, 40, 32, 44, 38, 50, 30,
  46, 34, 40, 42, 28, 48, 36, 44, 32, 38,
] as const;
const MAX_WAVEFORM_HEIGHT = Math.max(...WAVEFORM_BAR_HEIGHTS);

interface TrackPaper {
  id: string;
  title: string;
  summary?: string;
  fullText?: string;
}

interface TrackItem {
  id: string;
  title: string;
  description?: string;
  src: string;
  showName?: string;
  order?: number;
  papers?: TrackPaper[];
  topicId?: string | null;
  episodeNumber?: number | null;
  episodeId?: string | null;
  isDated?: boolean;
}

const FALLBACK_PLAYLIST: TrackItem[] = [
  {
    id: 'ai-daily-demo',
    title: 'AI Daily — Sample Episode',
    description: 'A short sample clip to demonstrate the player controls.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
    showName: 'AI Daily',
    order: 0,
    topicId: '770a27b8-28a8-40bd-ad82-d9c0952924ce',
    isDated: true,
  },
  {
    id: 'peer-review-demo',
    title: 'Peer Review Fight Club — Sample',
    description: 'Another sample audio file for the play-next flow.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
    showName: 'Peer Review Fight Club',
    order: 1,
  },
  {
    id: 'crypto-demo',
    title: 'Crypto Daily — Sample',
    description: 'Final sample track to round out the playlist.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
    showName: 'Crypto Daily',
    order: 2,
  },
];

const KOCHI_APP_HOME = 'https://listen.crashcourse.cc/';
const SHOW_TOPIC_IDS: Record<string, string> = {
  'ai daily': '770a27b8-28a8-40bd-ad82-d9c0952924ce',
  'peer review fight club': '5c6c2fd7-fcec-417b-ab48-27db253443b8',
  'crypto research daily': '151e2d10-46ff-50d9-9071-223702b75ddd',
  'crypto market daily brief': '151e2d10-46ff-50d9-9071-223702b75ddd',
  'crypto daily': '151e2d10-46ff-50d9-9071-223702b75ddd',
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60)
    .toString()
    .padStart(1, '0');
  const remainingSeconds = (wholeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

function dbToGain(db: number): number {
  return Number.isFinite(db) ? Math.pow(10, db / 20) : 1;
}

const BASE_REALTIME_INSTRUCTIONS =
  "You're a casual, enthusiastic co-host chatting with a friend about cool AI research. Keep it conversational and natural - use phrases like 'check this out', 'here's the thing', or 'so get this'. Speak in short, punchy sentences with contractions and casual language. When referencing the papers, mention their titles naturally but don't be too formal about it. Keep the energy high and the vibe friendly - like you're excited to share what you just learned.";

function truncateForContext(value: string | undefined, limit = 2000): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit - 1).trim()}…`;
}

function buildRealtimeContext(
  episodeTitle: string,
  episodeDescription: string | undefined,
  papers: TrackPaper[]
): string {
  const headerLines: string[] = [];

  const normalizedTitle = episodeTitle?.trim() || 'AI Daily Episode';
  headerLines.push(`Episode: ${normalizedTitle}`);

  if (episodeDescription?.trim()) {
    headerLines.push(`Episode Summary: ${episodeDescription.trim()}`);
  }

  const paperSections = papers.map((paper, index) => {
    const lines: string[] = [];
    const paperIndex = index + 1;
    lines.push(`Paper ${paperIndex}: ${paper.title}`);
    const summaryText = truncateForContext(paper.summary, 800);
    if (summaryText) {
      lines.push(`Summary: ${summaryText}`);
    }
    const fullText = truncateForContext(paper.fullText, 15000);
    if (fullText) {
      lines.push(`Full Text:\n${fullText}`);
    }
    return lines.join('\n');
  });

  headerLines.push('Research papers for reference:');
  headerLines.push(paperSections.join('\n\n'));

  return headerLines.join('\n');
}

function MusicPlayerContent(): JSX.Element {
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedPlaylist, setLoadedPlaylist] = useState<TrackItem[]>(FALLBACK_PLAYLIST);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [playbackRateIndex, setPlaybackRateIndex] = useState(DEFAULT_PLAYBACK_SPEED_INDEX);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preGainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const makeupGainNodeRef = useRef<GainNode | null>(null);

  // Realtime Audio state
  const realtimeClientRef = useRef<RealtimeAudioClient | null>(null);
  const audioPlayerRef = useRef<StreamingAudioPlayer | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isMicAvailable, setIsMicAvailable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);

  const customTrack = useMemo((): TrackItem | null => {
    if (!searchParams) {
      return null;
    }

    const src = searchParams.get('src');
    if (!src) {
      return null;
    }

    try {
      // Basic validation; throws if invalid
      const parsedUrl = new URL(src);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }
    } catch {
      return null;
    }

    const titleParam = searchParams.get('title');
    const descriptionParam = searchParams.get('description');

    // Extract show name from title (everything before " — " or " - ")
    const fullTitle = titleParam?.trim() || 'AI Daily — Latest Episode';
    let showName = 'AI Daily'; // default

    // Try to split on " — " first (em dash)
    const emDashParts = fullTitle.split(' — ');
    if (emDashParts.length > 1) {
      showName = emDashParts[0];
    } else {
      // Try to split on " - " (hyphen)
      const hyphenParts = fullTitle.split(' - ');
      if (hyphenParts.length > 1) {
        showName = hyphenParts[0];
      }
    }

    return {
      id: 'ai-daily-latest',
      title: fullTitle,
      description: descriptionParam?.trim() || undefined,
      src,
      showName,
    };
  }, [searchParams]);

  // Fetch real episodes on mount
  useEffect(() => {
    async function fetchEpisodes() {
      try {
        const response = await fetch('/api/podcast-episodes');
        if (!response.ok) {
          throw new Error('Failed to fetch episodes');
        }
        const data = await response.json();
        if (Array.isArray(data.episodes) && data.episodes.length > 0) {
          setLoadedPlaylist(data.episodes as TrackItem[]);
        }
      } catch (error) {
        console.error('Error fetching episodes:', error);
        // Keep using fallback playlist
      }
    }
    void fetchEpisodes();
  }, []);

  const playlist = useMemo(() => {
    if (customTrack) {
      return [customTrack, ...loadedPlaylist];
    }
    return loadedPlaylist;
  }, [customTrack, loadedPlaylist]);

  const autoPlayRequested = useMemo(() => {
    if (!searchParams) {
      return false;
    }
    const autoplayParam = searchParams.get('autoplay');
    return autoplayParam === '1' || autoplayParam?.toLowerCase() === 'true';
  }, [searchParams]);

  useEffect(() => {
    if (currentTrackIndex >= playlist.length) {
      setCurrentTrackIndex(0);
    }
  }, [currentTrackIndex, playlist.length]);

  useEffect(() => {
    if (customTrack) {
      setCurrentTrackIndex(0);
      setIsPlaying(autoPlayRequested);
    }
  }, [autoPlayRequested, customTrack]);

  useEffect(() => {
    setIsMicAvailable(false);
    setAiStatus('');
    setAiResponse('');
    setIsMicActive(false);
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    audioPlayerRef.current?.stop();
  }, [currentTrackIndex]);

  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

  const aiDailyTrackData = useMemo(
    () => loadedPlaylist.find((track) => track.showName === 'AI Daily'),
    [loadedPlaylist]
  );

  const isAiDailyTrack = currentTrack?.showName === 'AI Daily';

  const aiDailyPapers = useMemo(() => {
    if (!isAiDailyTrack) {
      return undefined;
    }
    if (currentTrack?.papers?.length) {
      return currentTrack.papers;
    }
    return aiDailyTrackData?.papers;
  }, [aiDailyTrackData, currentTrack, isAiDailyTrack]);

  const hasAiDailyPapers = Boolean(isAiDailyTrack && aiDailyPapers && aiDailyPapers.length > 0);

  const aiDailyContext = useMemo(() => {
    if (!hasAiDailyPapers || !aiDailyPapers) {
      return null;
    }
    return buildRealtimeContext(
      currentTrack?.title || 'AI Daily Episode',
      currentTrack?.description,
      aiDailyPapers
    );
  }, [aiDailyPapers, currentTrack?.description, currentTrack?.title, hasAiDailyPapers]);

  const aiDailyInstructions = useMemo(() => {
    if (!aiDailyContext) {
      return null;
    }
    return `${BASE_REALTIME_INSTRUCTIONS}\n\n${aiDailyContext}`;
  }, [aiDailyContext]);

  const canUseMic = Boolean(aiDailyInstructions && aiDailyContext);

  useEffect(() => {
    setIsBannerDismissed(false);
    setPlaybackRateIndex(DEFAULT_PLAYBACK_SPEED_INDEX);
  }, [currentTrack?.id]);

  const bannerHref = useMemo(() => {
    const track = currentTrack;
    if (!track) {
      return KOCHI_APP_HOME;
    }

    const normalizedShowName = track.showName?.trim().toLowerCase() ?? '';
    const topicId = SHOW_TOPIC_IDS[normalizedShowName];

    if (!topicId) {
      return KOCHI_APP_HOME;
    }

    if (track.episodeId) {
      return `https://listen.crashcourse.cc/topics/${topicId}/episodes/${track.episodeId}`;
    }

    return `https://listen.crashcourse.cc/topics/${topicId}`;
  }, [currentTrack]);

  const mainClassName = [
    'relative min-h-screen w-full bg-gradient-to-b from-[#FAFAF8] to-[#F5F5F0] px-4 pb-12 sm:px-6',
    isBannerDismissed ? 'pt-16 sm:pt-20' : 'pt-32 sm:pt-28',
  ].join(' ');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const nextRate = PLAYBACK_SPEEDS[playbackRateIndex];
    audio.playbackRate = nextRate;
  }, [playbackRateIndex]);

  // Shorten title for display
  const displayTitle = useMemo(() => {
    const track = currentTrack;
    if (!track) return '';

    // Extract the part after the " — " separator
    const parts = track.title.split(' — ');
    if (parts.length > 1) {
      // Return everything after the show name
      return parts.slice(1).join(' — ');
    }
    return track.title;
  }, [currentTrack]);

  const playbackSpeed = PLAYBACK_SPEEDS[playbackRateIndex];
  const playbackSpeedLabel = Number.isInteger(playbackSpeed)
    ? `${playbackSpeed}×`
    : `${playbackSpeed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
  const showTitle = currentTrack?.showName || 'Now Playing';

  const secondaryLabel = useMemo(() => {
    if (!currentTrack) {
      return '';
    }

    // Priority 1: Try to find a date in description or title
    const sources = [currentTrack.description, currentTrack.title];
    const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/;

    for (const source of sources) {
      if (!source) {
        continue;
      }
      const match = source.match(isoDateRegex);
      if (match) {
        const isoDate = match[0];
        // Format date string directly to ensure consistent display globally (not affected by timezone)
        const [year, month, day] = isoDate.split('-').map(Number);

        // Create Date in UTC to get the correct weekday
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        const weekday = utcDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

        return `${weekday} ${month}/${day}`;
      }
    }

    // Priority 2: If no date found, show episode number
    if (currentTrack.episodeNumber) {
      return `Episode ${currentTrack.episodeNumber}`;
    }

    // Priority 3: If neither date nor episode number, return empty
    return '';
  }, [currentTrack]);

  const waveformBars = useMemo(() => {
    const barCount = WAVEFORM_BAR_HEIGHTS.length;
    const progressRatio = Math.min(1, Math.max(0, duration > 0 ? currentTime / duration : 0));

    return WAVEFORM_BAR_HEIGHTS.map((height, index) => {
      const relativePosition = (index + 1) / barCount;
      const isPlayed = relativePosition <= progressRatio;
      const fillPercent = Math.round((height / MAX_WAVEFORM_HEIGHT) * 100);
      const inactiveFill = Math.max(30, Math.round(fillPercent * 0.65));
      return {
        height,
        isPlayed,
        fillPercent: isPlayed ? Math.min(100, fillPercent + 5) : inactiveFill,
        animationDelay: index * 0.04,
      };
    });
  }, [currentTime, duration]);

  const progressPercent = Math.min(100, Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0));
  const micDisabled = !canUseMic || isConnecting;
  const micNotYetAvailable = !isMicAvailable && !isMicActive && !isConnecting;
  const micTooltip = !canUseMic
    ? 'Microphone is only available for AI Daily episodes with research context.'
    : isMicActive
      ? 'Stop recording'
      : !isMicAvailable
        ? 'Click to learn about Interactive Mode'
        : 'Ask a question about this episode';

  const micModalActionDisabled = (!isMicActive && !isMicAvailable) || (isConnecting && !isMicActive);
  const micModalStateLabel = isMicActive
    ? 'Listening... tap to finish'
    : isConnecting
      ? 'Connecting to microphone...'
      : isMicAvailable
        ? 'Tap to start speaking'
        : 'Available after playback';
  const micCircleClassName = [
    'flex h-24 w-24 items-center justify-center rounded-full border-4 text-[#2C3E1F] transition-all duration-200 sm:h-32 sm:w-32',
    isMicActive
      ? 'border-[#2C3E1F] bg-[#2C3E1F] text-white shadow-[0_0_0_16px_rgba(44,62,31,0.18)] animate-pulse'
      : isConnecting
        ? 'border-[#E2B74A] bg-[#FFF4D6] text-[#8A6200] animate-pulse'
        : 'border-[#D7DCC8] bg-[#F7F8F2]',
  ]
    .filter(Boolean)
    .join(' ');

  const controlButtonFocus =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C3E1F] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const controlButtonSmall = [
    'flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E0] bg-white text-[#2C3E1F] transition-all duration-200',
    'hover:scale-[1.04] hover:border-[#2C3E1F] hover:bg-[#FAFAF8]',
    'active:scale-95',
    controlButtonFocus,
  ]
    .filter(Boolean)
    .join(' ');
  const controlButtonLarge = [
    'flex h-14 w-14 items-center justify-center rounded-full border border-[#2C3E1F] bg-[#2C3E1F] text-white transition-all duration-200',
    'hover:bg-[#1F2E16] hover:border-[#1F2E16] hover:shadow-[0_0_0_6px_rgba(44,62,31,0.08)]',
    'active:scale-95',
    controlButtonFocus,
  ]
    .filter(Boolean)
    .join(' ');
  const micButtonClassName = [
    'group flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#E5E5E0] bg-gradient-to-br from-[#FAFAF8] to-[#F5F5F0] px-4 py-3 text-sm font-semibold tracking-tight text-[#2C3E1F] transition-all duration-200',
    micDisabled
      ? 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none hover:border-[#E5E5E0]'
      : micNotYetAvailable
        ? 'opacity-60'
        : 'hover:-translate-y-0.5 hover:border-[#2C3E1F] hover:shadow-[0_12px_24px_rgba(44,62,31,0.12)]',
    isMicActive
      ? 'border-[#2C3E1F] bg-[#2C3E1F] text-white shadow-[0_0_0_12px_rgba(44,62,31,0.08)] mic-active'
      : '',
    controlButtonFocus,
  ]
    .filter(Boolean)
    .join(' ');

  const handlePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => undefined);
      }
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.warn('Unable to start playback:', error);
    }
  }, []);

  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    setIsPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      void handlePlay();
    } else {
      handlePause();
    }
  }, [handlePause, handlePlay]);

  const handleStop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleScrub = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const nextTime = Number(event.target.value);
    audio.currentTime = Number.isFinite(nextTime) ? nextTime : 0;
    setCurrentTime(audio.currentTime);
  }, []);

  const handleRewind = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = Math.max(audio.currentTime - 15, 0);
    setCurrentTime(audio.currentTime);
  }, []);

  const handleForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const target = Math.min(audio.currentTime + 15, duration || audio.duration || 0);
    audio.currentTime = target;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const handlePlaybackSpeed = useCallback(() => {
    setPlaybackRateIndex((index) => (index + 1) % PLAYBACK_SPEEDS.length);
  }, []);

  const handleNext = useCallback(() => {
    if (isMicActive) {
      realtimeClientRef.current?.stopRecording();
      setIsMicActive(false);
    }
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
    }
    audioPlayerRef.current?.stop();
    setAiResponse('');
    setAiStatus('');
    setIsMicAvailable(false);

    // Circular rotation: AI Daily (0) → Peer Review (1) → Crypto (2) → AI Daily (0)
    setCurrentTrackIndex((index) => {
      const nextIndex = (index + 1) % playlist.length;
      return nextIndex;
    });
    setCurrentTime(0);
    setIsPlaying(true);
  }, [isMicActive, playlist.length]);

  const handleOpenMicModal = useCallback(() => {
    setIsMicModalOpen(true);
  }, []);

  const handleCloseMicModal = useCallback(() => {
    console.log('🔌 Closing modal - stopping Realtime interaction...');

    // Stop recording if active
    if (isMicActive && realtimeClientRef.current) {
      realtimeClientRef.current.stopRecording();
      console.log('🎤 Stopped recording');
    }

    // Disconnect realtime client
    if (realtimeClientRef.current) {
      realtimeClientRef.current.disconnect();
      realtimeClientRef.current = null;
      console.log('🔌 Disconnected Realtime client');
    }

    // Stop audio player
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      console.log('🔇 Stopped audio player');
    }

    // Reset all state
    setIsMicActive(false);
    setIsConnecting(false);
    setAiStatus('');
    setAiResponse('');
    setIsMicAvailable(true);  // Keep available since episode already finished

    // Close the modal
    setIsMicModalOpen(false);

    console.log('✅ Modal closed - ready for normal mode');
  }, [isMicActive]);

  const handleInteractiveButtonClick = useCallback(() => {
    if (!canUseMic) {
      return;
    }

    // If mic is active, open the modal
    if (isMicActive) {
      setIsMicModalOpen(true);
      return;
    }

    // If mic is available, open the modal to start interaction
    if (isMicAvailable) {
      handleOpenMicModal();
      return;
    }

    // If mic is not available yet (episode still playing), show info message
    setAiStatus('Interactive Mode lets you discuss this episode once it\'s finished playing.');
  }, [canUseMic, handleOpenMicModal, isMicActive, isMicAvailable]);

  const handleMicModalToggle = useCallback(async () => {
    if (!canUseMic || !aiDailyInstructions || !aiDailyContext) {
      return;
    }
    const instructionsForSession = aiDailyInstructions;
    const contextForSession = aiDailyContext;

    try {
      if (!isMicActive && !isMicAvailable) {
        return;
      }

      if (isMicActive) {
        // Stop recording
        realtimeClientRef.current?.stopRecording();
        setIsMicActive(false);
        setIsMicAvailable(false);
        console.log('🎤 Stopped mic');
      } else {
        // Start recording
        setIsConnecting(true);
        setAiStatus('Connecting to WebSocket...');
        setAiResponse('');
        setIsMicAvailable(false);

        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new StreamingAudioPlayer();
        }

        try {
          await audioPlayerRef.current.prepare();
          audioPlayerRef.current.stop();
        } catch (error) {
          console.error('❌ Failed to prepare audio playback:', error);
          setAiStatus('Audio playback unavailable');
        }

        // Initialize client if needed
        if (!realtimeClientRef.current) {
          console.log('🔧 Creating new RealtimeAudioClient...');
          const client = new RealtimeAudioClient({
            initialInstructions: instructionsForSession,
            onTranscriptDelta: () => {
              // Audio only - no text display when modal is used
            },
            onAudioDelta: (audioData) => {
              console.log('🔊 [CALLBACK] Audio delta received, size:', audioData.byteLength);
              if (!audioPlayerRef.current) {
                console.log('🔧 Creating new StreamingAudioPlayer...');
                audioPlayerRef.current = new StreamingAudioPlayer();
                void audioPlayerRef.current.prepare();
              }
              setAiStatus('Responding...');
              void audioPlayerRef.current.addChunk(audioData);
            },
            onConnected: () => {
              console.log('✅ [CALLBACK] Realtime Audio connected');
              setIsConnecting(false);
              setAiStatus('Connected. Starting microphone...');
            },
            onDisconnected: () => {
              console.log('🔌 [CALLBACK] Realtime Audio disconnected');
              setIsMicActive(false);
              setIsConnecting(false);
              setAiStatus('Disconnected');
              setIsMicAvailable(true);
              audioPlayerRef.current?.stop();
              realtimeClientRef.current = null;
            },
            onError: (error) => {
              console.error('❌ [CALLBACK] Realtime Audio error:', error);
              setAiStatus('WebSocket Error: ' + error.message);
              setAiResponse('');
              setIsMicActive(false);
              setIsConnecting(false);
              setIsMicAvailable(true);
              realtimeClientRef.current = null;
            },
            onAudioCommitted: () => {
              setAiStatus('Processing response...');
            },
            onResponseStarted: () => {
              setAiStatus('AI is thinking...');
            },
            onResponseFinished: () => {
              setAiStatus('Done');
              setIsMicAvailable(true);
            },
            onSpeechStart: () => {
              setAiStatus('Listening...');
            },
            onSpeechEnd: () => {
              setAiStatus('Processing response...');
            }
          });

          client.setInstructions(instructionsForSession);
          client.setContext(contextForSession);

          try {
            await client.connect();
            realtimeClientRef.current = client;
            console.log('✅ WebSocket connected, now requesting microphone...');
          } catch (wsError) {
            console.error('❌ WebSocket connection failed:', wsError);
            setAiStatus('Cannot connect to WebSocket server (port 3001). Is it running?');
            setAiResponse('');
            setIsConnecting(false);
            realtimeClientRef.current = null;
            return;
          }
        }

        realtimeClientRef.current?.setInstructions(instructionsForSession);
        realtimeClientRef.current?.setContext(contextForSession);

        // Start recording
        setAiStatus('Requesting microphone access...');
        setAiResponse('');
        try {
          await realtimeClientRef.current.startRecording();
          setIsMicActive(true);
          setIsConnecting(false);
          setAiStatus('Listening...');
          console.log('🎤 Started mic');
        } catch (micError) {
          console.error('❌ Microphone access failed:', micError);
          setAiStatus('Microphone access denied. Check browser permissions.');
          setAiResponse('');
          setIsConnecting(false);
          setIsMicAvailable(true);
          realtimeClientRef.current = null;
          return;
        }
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setAiStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setAiResponse('');
      setIsMicActive(false);
      setIsConnecting(false);
      setIsMicAvailable(true);
      realtimeClientRef.current = null;
    }
  }, [aiDailyContext, aiDailyInstructions, canUseMic, isMicActive, isMicAvailable]);

  useEffect(() => {
    if (!isMicModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseMicModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    let originalOverflow = '';
    if (typeof document !== 'undefined') {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [handleCloseMicModal, isMicModalOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setCurrentTime(audio.currentTime);
      setIsMicAvailable(false);
    };

    const handlePlaybackEnded = () => {
      setIsPlaying(false);
      setIsMicAvailable(true);
      setAiStatus('Episode finished. Tap the mic to ask a question.');
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
        realtimeClientRef.current = null;
      }
      audioPlayerRef.current?.stop();
    };

    const handlePlayEvent = () => {
      setIsPlaying(true);
      setIsMicAvailable(false);
    };
    const handlePauseEvent = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handlePlaybackEnded);
    audio.addEventListener('play', handlePlayEvent);
    audio.addEventListener('pause', handlePauseEvent);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handlePlaybackEnded);
      audio.removeEventListener('play', handlePlayEvent);
      audio.removeEventListener('pause', handlePauseEvent);
    };
  }, []);

  // Fix #2: Only call load() when track changes, not on pause/play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.load();
    audio.currentTime = 0;
    setCurrentTime(0);
  }, [currentTrackIndex, playlist]);

  // Separate effect for play state - no load() on pause/play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying && audio.paused) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  // Fix #1: Create Web Audio graph once and reuse across tracks
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || typeof window === 'undefined') {
      return;
    }

    // Only create the graph once - reuse for all tracks
    if (sourceNodeRef.current) {
      return;
    }

    // Set CORS for all potential sources
    if (!audioElement.crossOrigin) {
      audioElement.crossOrigin = 'anonymous';
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      console.warn('Web Audio API not supported; skipping dynamics processing.');
      return;
    }

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContextCtor();
      } catch (error) {
        console.warn('Unable to create AudioContext:', error);
        return;
      }
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) {
      return;
    }

    try {
      // createMediaElementSource can only be called ONCE per audio element
      const sourceNode = audioContext.createMediaElementSource(audioElement);
      const preGain = audioContext.createGain();
      preGain.gain.value = dbToGain(10); // +10 dB lift before compression

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 12;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.22;

      const makeupGain = audioContext.createGain();
      makeupGain.gain.value = dbToGain(3); // gentle make-up gain

      sourceNode.connect(preGain);
      preGain.connect(compressor);
      compressor.connect(makeupGain);
      makeupGain.connect(audioContext.destination);

      sourceNodeRef.current = sourceNode;
      preGainNodeRef.current = preGain;
      compressorNodeRef.current = compressor;
      makeupGainNodeRef.current = makeupGain;
    } catch (error) {
      console.warn('Failed to initialise audio processing chain:', error);
    }

    // Only cleanup on component unmount
    return () => {
      makeupGainNodeRef.current?.disconnect();
      compressorNodeRef.current?.disconnect();
      preGainNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();

      makeupGainNodeRef.current = null;
      compressorNodeRef.current = null;
      preGainNodeRef.current = null;
      sourceNodeRef.current = null;

      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []); // Empty deps - create once, reuse across all tracks

  // Cleanup Realtime Audio on unmount
  useEffect(() => {
    return () => {
      if (realtimeClientRef.current) {
        realtimeClientRef.current.disconnect();
        realtimeClientRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.close();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <main className={mainClassName}>
        {!isBannerDismissed ? (
          <PlayInCrashAppBanner href={bannerHref} onClose={() => setIsBannerDismissed(true)} />
        ) : null}

        <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
          <article className="w-full max-w-md rounded-[20px] border border-[#E0E4D7] bg-white/95 p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.03),0_16px_24px_rgba(0,0,0,0.02)] backdrop-blur-sm">
            <header className="mb-8 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7C836F]">Now Playing</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#1A1A1A]">{showTitle}</h1>
              {secondaryLabel ? (
                <p className="mt-1.5 text-sm font-semibold tracking-tight text-[#4A4F3C]">
                  {secondaryLabel}
                </p>
              ) : null}
            </header>

            <section className="space-y-8">
              <div className="flex h-12 items-end gap-[3px] rounded-xl border border-[#F0F0ED] bg-[#FBFBF7] px-2 py-2">
                {waveformBars.map(({ height, isPlayed, fillPercent, animationDelay }, index) => (
                  <span
                    key={index}
                    className={`waveform-bar relative flex-1 overflow-hidden rounded-sm bg-[#F0F0ED] ${isPlayed ? 'waveform-bar-played' : ''}`}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${animationDelay}s`,
                    }}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute inset-x-[2px] bottom-[2px] rounded-sm transition-all duration-500 ${isPlayed ? 'bg-[#2C3E1F]' : 'bg-[#E8D96F]'}`}
                      style={{ height: `${Math.min(100, Math.max(0, fillPercent))}%` }}
                    />
                  </span>
                ))}
              </div>

              <div className="space-y-3">
                <div className="group relative h-2 rounded-full bg-[#F0F0ED] transition-[height] duration-200 hover:h-[10px]">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[#2C3E1F] transition-all duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1 rounded-full border-[3px] border-[#2C3E1F] bg-white shadow-sm transition-opacity duration-200 group-hover:opacity-100"
                    style={{ opacity: progressPercent > 0 ? 1 : 0 }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleScrub}
                    className="player-range absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent"
                    aria-label="Seek"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.18em] text-[#888888]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleRewind}
                    className={controlButtonSmall}
                    aria-label="Rewind 15 seconds"
                  >
                    <svg className="h-4 w-4 text-current" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 6V3L6 9l6 6v-3c3.314 0 6 2.686 6 6h2c0-4.418-3.582-8-8-8Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className={controlButtonLarge}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    <svg
                      className={`h-6 w-6 ${isPlaying ? 'hidden' : 'block'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 5v14l11-7-11-7Z" />
                    </svg>
                    <svg
                      className={`h-6 w-6 ${isPlaying ? 'block' : 'hidden'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                    </svg>
                    <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForward}
                    className={controlButtonSmall}
                    aria-label="Forward 15 seconds"
                  >
                    <svg className="h-4 w-4 text-current" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 6V3l6 6-6 6v-3c-3.314 0-6 2.686-6 6H4c0-4.418 3.582-8 8-8Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className={controlButtonSmall}
                    aria-label="Next episode"
                  >
                    <svg className="h-4 w-4 text-current" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 18V6l8.5 6L6 18Zm10-12h2v12h-2V6Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handlePlaybackSpeed}
                    className={controlButtonSmall}
                    aria-label="Change playback speed"
                  >
                    <span className="text-[11px] font-bold text-[#2C3E1F]">{playbackSpeedLabel}</span>
                  </button>
                </div>

                {canUseMic ? (
                  <>
                    <button
                      type="button"
                      onClick={handleInteractiveButtonClick}
                      disabled={micDisabled}
                      className={micButtonClassName}
                      aria-label="Open interactive mode"
                      title={micTooltip}
                    >
                      <svg
                        className={`h-4 w-4 transition-colors duration-200 ${isMicActive ? 'text-white' : 'text-[#2C3E1F]'}`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3c0 3.074-2.29 5.315-5 5.482V19h2v2h-6v-2h2v-2.518C9.29 16.315 7 14.074 7 11H5c0 3.623 2.559 6.642 6 7.323V21h2v-2.677c3.441-.681 6-3.7 6-7.323h-2Z" />
                      </svg>
                      <span>{isMicActive ? 'Listening...' : 'Interactive mode'}</span>
                    </button>

                    {isMicModalOpen ? (
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Interactive microphone"
                        onClick={handleCloseMicModal}
                      >
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
                        <div
                          className="relative z-10 w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-[0_30px_80px_rgba(26,30,18,0.28)] sm:p-8"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleCloseMicModal}
                              className="rounded-full p-2 text-[#4A4F3C] transition-colors duration-150 hover:bg-[#F4F5EE] hover:text-[#1F2E16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C3E1F] focus-visible:ring-offset-2"
                              aria-label="Close interactive mode"
                            >
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-2 flex flex-col items-center gap-6 sm:gap-8">
                            <div className="space-y-2">
                              <h2 className="text-lg font-semibold tracking-tight text-[#1A1A1A] sm:text-xl">
                                Interactive mode
                              </h2>
                              <p className="text-sm text-[#4A4F3C] sm:text-base">
                                {micModalStateLabel}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleMicModalToggle}
                              disabled={micModalActionDisabled}
                              className={`relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2C3E1F]/30 ${
                                micModalActionDisabled && !isMicActive ? 'cursor-not-allowed opacity-60' : 'hover:scale-105 active:scale-95'
                              }`}
                              aria-pressed={isMicActive}
                              aria-label={isMicActive ? 'Stop recording' : 'Start recording'}
                            >
                              <span className={micCircleClassName}>
                                <svg className="h-10 w-10 sm:h-14 sm:w-14" viewBox="0 0 24 24" fill="currentColor" strokeWidth={2.2}>
                                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3c0 3.074-2.29 5.315-5 5.482V19h2v2h-6v-2h2v-2.518C9.29 16.315 7 14.074 7 11H5c0 3.623 2.559 6.642 6 7.323V21h2v-2.677c3.441-.681 6-3.7 6-7.323h-2Z" />
                                </svg>
                              </span>
                            </button>
                            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#888888] sm:text-sm">
                              Tap once to speak · Tap again to send
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-center text-xs font-medium text-[#8F947D]">
                    Finish the episode to unlock interactive mode.
                  </p>
                )}
              </div>

              {!isMicModalOpen && (aiStatus || aiResponse) && (
                <div className="rounded-2xl border border-[#E5E5E0] bg-white/90 p-4 text-sm text-[#1A1A1A] shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C836F]">AI Assistant</p>
                  {aiStatus ? <p className="mt-2 font-semibold text-[#2C3E1F]">{aiStatus}</p> : null}
                  {aiResponse ? (
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#3A3D2F]">{aiResponse}</p>
                  ) : null}
                </div>
              )}
            </section>
          </article>
        </div>

        <audio ref={audioRef} src={currentTrack.src} preload="auto" controls={false} playsInline />
      </main>
      <style jsx global>{`
        .player-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 9999px;
          background: transparent;
          border: 0;
        }
        .player-range::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          height: 100%;
          background: transparent;
        }
        .player-range::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 9999px;
          background: transparent;
          border: 0;
        }
        .player-range::-moz-range-track {
          height: 100%;
          background: transparent;
        }
        @keyframes gentleWave {
          0%,
          100% {
            transform: scaleY(1);
            opacity: 0.35;
          }
          50% {
            transform: scaleY(1.15);
            opacity: 0.65;
          }
        }
        @keyframes gentleWaveActive {
          0%,
          100% {
            transform: scaleY(1);
            opacity: 0.6;
          }
          50% {
            transform: scaleY(1.3);
            opacity: 1;
          }
        }
        .waveform-bar {
          animation: gentleWave 3s ease-in-out infinite;
        }
        .waveform-bar-played {
          animation: gentleWaveActive 1.4s ease-in-out infinite;
        }
        @keyframes micPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(44, 62, 31, 0.18);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(44, 62, 31, 0);
          }
        }
        .mic-active {
          animation: micPulse 2.2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

export default function MusicPlayerPage(): JSX.Element {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading player...</div>}>
      <MusicPlayerContent />
    </Suspense>
  );
}
