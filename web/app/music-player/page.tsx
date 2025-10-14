'use client';

import { Suspense, type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RealtimeAudioClient, StreamingAudioPlayer } from '@/lib/realtime-audio';
import PlayInCrashAppBanner from '@/components/PlayInCrashAppBanner';

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
  'You are an expert co-host helping listeners understand the AI Daily episode they just heard. Use the provided paper details to answer questions accurately, cite paper titles when referencing them, and keep responses concise.';

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
    const fullText = truncateForContext(paper.fullText, 3200);
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
  const [showInfo, setShowInfo] = useState(false);
  const [isAppBannerDismissed, setIsAppBannerDismissed] = useState(false);
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

    return {
      id: 'ai-daily-latest',
      title: titleParam?.trim() || 'AI Daily — Latest Episode',
      description: descriptionParam?.trim() || undefined,
      src,
      showName: 'AI Daily',
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
    setIsAppBannerDismissed(false);
  }, [currentTrack?.id]);

  const bannerInfo = useMemo(() => {
    const topicId = currentTrack?.topicId ?? aiDailyTrackData?.topicId ?? null;
    const episodeNumber = currentTrack?.episodeNumber ?? aiDailyTrackData?.episodeNumber ?? null;
    const hasEpisodeNumber = typeof episodeNumber === 'number' && !Number.isNaN(episodeNumber);
    const rawIsDated = currentTrack?.isDated ?? aiDailyTrackData?.isDated ?? false;

    return {
      topicId,
      episodeNumber: hasEpisodeNumber ? episodeNumber : null,
      isDated: hasEpisodeNumber ? false : Boolean(rawIsDated),
    };
  }, [aiDailyTrackData, currentTrack]);

  const shouldShowCrashAppBanner = Boolean(
    isAiDailyTrack && bannerInfo.topicId && !isAppBannerDismissed
  );

  const { topicId: bannerTopicId, episodeNumber: bannerEpisodeNumber, isDated: bannerIsDated } = bannerInfo;

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

  const handlePrevious = useCallback(() => {
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

    // Circular rotation backwards: AI Daily (0) ← Peer Review (1) ← Crypto (2) ← AI Daily (0)
    setCurrentTrackIndex((index) => {
      const prevIndex = (index - 1 + playlist.length) % playlist.length;
      return prevIndex;
    });
    setCurrentTime(0);
    setIsPlaying(true);
  }, [isMicActive, playlist.length]);

  const handleInfo = useCallback(() => {
    setShowInfo((prev) => !prev);
  }, []);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    if (navigator.share) {
      void navigator.share({
        title: currentTrack.title,
        text: currentTrack.description || '',
        url: window.location.href,
      }).catch(() => {
        // Share cancelled or failed
      });
    }
  }, [currentTrack]);

  const micDisabled = !canUseMic || isConnecting || (!isMicAvailable && !isMicActive);
  const micTooltip = !canUseMic
    ? 'Microphone is only available for AI Daily episodes with research context.'
    : isMicActive
      ? 'Stop recording'
      : micDisabled
        ? 'Mic unlocks after the episode finishes'
        : 'Ask a question about this episode';

  const handleMic = useCallback(async () => {
    if (!canUseMic || !aiDailyInstructions || !aiDailyContext) {
      setAiStatus('Microphone is only available once the AI Daily papers finish loading.');
      return;
    }
    const instructionsForSession = aiDailyInstructions;
    const contextForSession = aiDailyContext;

    try {
      if (!isMicActive && !isMicAvailable) {
        setAiStatus('Mic will unlock once this episode finishes.');
        return;
      }

      if (isMicActive) {
        // Stop recording
        realtimeClientRef.current?.stopRecording();
        setIsMicActive(false);
        setAiResponse('');
        setAiStatus('Processing response...');
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
            onTranscriptDelta: (text) => {
              console.log('📝 [CALLBACK] Transcript delta received:', text);
              setAiStatus('Responding...');
              setAiResponse((prev) => prev + text);
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 px-6 py-10">
      <article className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
        <header className="mb-8 text-center">
          <p className="text-lg font-bold uppercase tracking-wider text-gray-800">B52S.ME</p>
        </header>

        <section className="space-y-6">
          {shouldShowCrashAppBanner && bannerTopicId ? (
            <PlayInCrashAppBanner
              topicId={bannerTopicId}
              episodeNumber={bannerEpisodeNumber ?? undefined}
              isDated={bannerIsDated}
              className="border border-white/10"
              onClose={() => setIsAppBannerDismissed(true)}
            />
          ) : null}
          <div className="relative rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 shadow-lg">
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                type="button"
                onClick={handleInfo}
                className={`rounded-full p-2 backdrop-blur-sm transition active:scale-95 ${
                  showInfo ? 'bg-white/40' : 'bg-white/20 hover:bg-white/30'
                }`}
                aria-label="Episode info"
              >
                <svg className="h-5 w-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="rounded-full bg-white/20 p-2 backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
                aria-label="Share episode"
              >
                <svg className="h-5 w-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-900/70">Now Playing</p>
            <h2 className="mt-2 pr-20 text-xl font-bold text-gray-900">{displayTitle}</h2>
            {showInfo && currentTrack.description ? (
              <p className="mt-3 border-t border-orange-900/20 pt-3 text-sm leading-relaxed text-gray-800">
                {currentTrack.description}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-gray-50 p-6 shadow-md">
            <div className="flex flex-col gap-3">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleScrub}
                className="w-full accent-orange-500"
                aria-label="Seek"
              />
              <div className="flex items-center justify-between text-sm font-bold text-gray-600">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleRewind}
                  className="rounded-full bg-gray-200 px-4 py-2.5 text-xl font-bold text-gray-700 shadow-md transition hover:bg-gray-300 active:scale-95"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 text-lg font-bold text-white shadow-xl transition hover:from-orange-600 hover:to-orange-700 active:scale-95"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  className="rounded-full bg-gray-200 px-4 py-2.5 text-xl font-bold text-gray-700 shadow-md transition hover:bg-gray-300 active:scale-95"
                >
                  ↻
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 active:scale-95"
                >
                  Next ▶︎
                </button>
                {canUseMic ? (
                  <button
                    type="button"
                    onClick={handleMic}
                    disabled={micDisabled}
                    className={`rounded-full p-2.5 shadow-md transition hover:scale-105 active:scale-95 ${
                      isMicActive
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : micDisabled
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    aria-label="Microphone"
                    title={micTooltip}
                  >
                    <svg
                      className={`h-5 w-5 ${isMicActive ? 'text-white' : 'text-gray-700'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* AI Response Display */}
          {(aiStatus || aiResponse) && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-md border border-blue-200">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800 mb-1">AI Assistant</p>
                  {aiStatus ? (
                    <p className="text-sm font-medium text-blue-900 mb-1">{aiStatus}</p>
                  ) : null}
                  {aiResponse ? (
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>

      </article>

      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="auto"
        controls={false}
        playsInline
      />
    </main>
  );
}

export default function MusicPlayerPage(): JSX.Element {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading player...</div>}>
      <MusicPlayerContent />
    </Suspense>
  );
}
