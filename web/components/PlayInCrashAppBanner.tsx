import Link from 'next/link';
import { FC } from 'react';

type PlayInCrashAppBannerProps = {
  href: string;
  className?: string;
  onClose?: () => void;
};

const PlayInCrashAppBanner: FC<PlayInCrashAppBannerProps> = ({
  href,
  className = '',
  onClose,
}) => {
  const containerClassName = [
    'fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#2c3e1f14] px-4 py-3 transition-transform duration-300',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName} role="complementary">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2C3E1F] to-[#3A4D2A] shadow-[0_2px_8px_rgba(44,62,31,0.15)]">
          <img
            src="/images/kochito-music-banner.png"
            alt="Kochito mascot"
            width={40}
            height={44}
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold tracking-tight text-[#1A1A1A]">Open in the Kochi app</span>
          <span className="truncate text-xs font-medium text-[#666666]">Background listening and much more!</span>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center rounded-full bg-[#2C3E1F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1F2E16]"
        >
          Open app
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#2C3E1F14]"
            aria-label="Dismiss banner"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 text-[#999999]"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.81Z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default PlayInCrashAppBanner;
