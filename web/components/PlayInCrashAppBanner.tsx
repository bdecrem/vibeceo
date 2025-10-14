import Link from 'next/link';
import { FC } from 'react';

type PlayInCrashAppBannerProps = {
  topicId: string;
  episodeNumber?: number;
  isDated?: boolean;
  className?: string;
  onClose?: () => void;
};

const PlayInCrashAppBanner: FC<PlayInCrashAppBannerProps> = ({
  topicId,
  episodeNumber,
  isDated = false,
  className = '',
  onClose,
}) => {
  const href = isDated
    ? `https://listen.crashcourse.cc/topics/${topicId}/latest`
    : `https://listen.crashcourse.cc/topics/${topicId}${episodeNumber ? `/episodes/${episodeNumber}` : ''}`;

  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl bg-[#1c1f2b] p-4 text-white shadow-lg ${className}`}
      role="complementary"
    >
      <img
        src="/crash-icon.svg"
        alt="Crash app"
        width={32}
        height={32}
        className="shrink-0"
      />
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#7ac7ff]">
          Play in the Crash app
        </span>
        <span className="text-sm">
          Jump to this episode inside Crash for offline playback and progress tracking.
        </span>
      </div>
      <Link
        href={href}
        className="ml-auto inline-flex items-center rounded-lg bg-[#4c7dff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3b62d6]"
      >
        Open Crash
      </Link>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-white/10 px-1 text-sm font-semibold text-white transition hover:bg-white/20"
          aria-label="Dismiss banner"
        >
          X
        </button>
      ) : null}
    </div>
  );
};

export default PlayInCrashAppBanner;
