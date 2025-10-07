'use client';

import { Suspense, type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface TrackItem {
  id: string;
  title: string;
  description?: string;
  src: string;
  showName?: string;
  order?: number;
}

const FALLBACK_PLAYLIST: TrackItem[] = [
  {
    id: 'ai-daily-demo',
    title: 'AI Daily — Sample Episode',
    description: 'A short sample clip to demonstrate the player controls.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
    showName: 'AI Daily',
    order: 0,
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

function MusicPlayerContent(): JSX.Element {
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadedPlaylist, setLoadedPlaylist] = useState<TrackItem[]>(FALLBACK_PLAYLIST);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const preGainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const makeupGainNodeRef = useRef<GainNode | null>(null);

  const customTrack = useMemo(() => {
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
    } satisfies TrackItem;
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
        if (data.episodes && data.episodes.length > 0) {
          setLoadedPlaylist(data.episodes);
        }
      } catch (error) {
        console.error('Error fetching episodes:', error);
        // Keep using fallback playlist
      } finally {
        setIsLoadingEpisodes(false);
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

  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

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
    // Circular rotation: AI Daily (0) → Peer Review (1) → Crypto (2) → AI Daily (0)
    setCurrentTrackIndex((index) => {
      const nextIndex = (index + 1) % playlist.length;
      return nextIndex;
    });
    setCurrentTime(0);
    setIsPlaying(true);
  }, [playlist.length]);

  const handlePrevious = useCallback(() => {
    // Circular rotation backwards: AI Daily (0) ← Peer Review (1) ← Crypto (2) ← AI Daily (0)
    setCurrentTrackIndex((index) => {
      const prevIndex = (index - 1 + playlist.length) % playlist.length;
      return prevIndex;
    });
    setCurrentTime(0);
    setIsPlaying(true);
  }, [playlist.length]);

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
    };

    const handlePlaybackEnded = () => {
      handleNext();
    };

    const handlePlayEvent = () => setIsPlaying(true);
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
  }, [handleNext]);

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-blue-50 px-6 py-10">
      <article className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
        <header className="mb-8 text-center">
          <p className="text-lg font-bold uppercase tracking-wider text-gray-800">B52S.ME</p>
        </header>

        <section className="space-y-6">
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
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 active:scale-95"
              >
                Next ▶︎
              </button>
            </div>
          </div>
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
