'use client';

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Disable static generation for this page since it uses searchParams
export const dynamic = 'force-dynamic';

interface TrackItem {
  id: string;
  title: string;
  description?: string;
  src: string;
}

const DEFAULT_PLAYLIST: TrackItem[] = [
  {
    id: 'ai-daily-demo',
    title: 'AI Daily — Sample Episode',
    description: 'A short sample clip to demonstrate the player controls.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
  },
  {
    id: 'peer-review-demo',
    title: 'Peer Review Fight Club — Sample',
    description: 'Another sample audio file for the play-next flow.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
  },
  {
    id: 'crypto-demo',
    title: 'Crypto Brief — Sample',
    description: 'Final sample track to round out the playlist.',
    src: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
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

export default function MusicPlayerPage(): JSX.Element {
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const playlist = useMemo(() => {
    if (customTrack) {
      return [customTrack, ...DEFAULT_PLAYLIST];
    }
    return DEFAULT_PLAYLIST;
  }, [customTrack]);

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

  const handlePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
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

    const target = Math.min(audio.currentTime + 30, duration || audio.duration || 0);
    audio.currentTime = target;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const handleNext = useCallback(() => {
    setCurrentTrackIndex((index) => (index + 1) % playlist.length);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [playlist.length]);

  const handlePrevious = useCallback(() => {
    setCurrentTrackIndex((index) => (index - 1 + playlist.length) % playlist.length);
    setCurrentTime(0);
    setIsPlaying(true);
  }, [playlist.length]);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.load();
    audio.currentTime = 0;
    setCurrentTime(0);

    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex, isPlaying, playlist]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-10 text-slate-50">
      <article className="w-full max-w-xl rounded-2xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-700">
        <header className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">b52s.me</p>
        </header>

        <section className="space-y-4">
          <div className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700/80">
            <p className="text-xs uppercase tracking-widest text-slate-400">Now Playing</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-50">{currentTrack.title}</h2>
            {currentTrack.description ? (
              <p className="mt-1 text-sm text-slate-300">{currentTrack.description}</p>
            ) : null}
          </div>

          <div className="rounded-xl bg-slate-800/40 p-4 ring-1 ring-slate-700/60">
            <div className="flex flex-col gap-3">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleScrub}
                className="w-full accent-sky-400"
                aria-label="Seek"
              />
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                ◀︎ Prev
              </button>
              <button
                type="button"
                onClick={handleRewind}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                ↺ 15s
              </button>
              <button
                type="button"
                onClick={handlePlayPause}
                className="rounded-full bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={handleForward}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                30s ↻
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 shadow transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
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
