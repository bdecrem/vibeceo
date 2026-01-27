'use client';

import { useEffect, useRef } from 'react';

interface ShareButtonContainerProps {
  /** Unique ID for the container element */
  id: string;
  /** URL to share */
  url: string;
  /** Share text */
  text: string;
  /** Button style */
  style?: 'button' | 'icon' | 'minimal';
  /** Whether the social library is loaded */
  socialLoaded: boolean;
  /** Optional className for styling */
  className?: string;
}

/**
 * React wrapper for PixelpitSocial.ShareButton.
 *
 * Automatically initializes the share button when the social library loads
 * and the component mounts.
 *
 * @example
 * ```tsx
 * const [socialLoaded, setSocialLoaded] = useState(false);
 *
 * <ShareButtonContainer
 *   id="share-btn"
 *   url={`${window.location.origin}/pixelpit/arcade/beam/share/${score}`}
 *   text={`I scored ${score} on BEAM! Can you beat me?`}
 *   style="minimal"
 *   socialLoaded={socialLoaded}
 * />
 * ```
 */
export function ShareButtonContainer({
  id,
  url,
  text,
  style = 'button',
  socialLoaded,
  className,
}: ShareButtonContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!socialLoaded || !window.PixelpitSocial || !containerRef.current) {
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (containerRef.current && !initializedRef.current) {
        // Clear any existing button
        containerRef.current.innerHTML = '';
        window.PixelpitSocial!.ShareButton(id, { url, text, style });
        initializedRef.current = true;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [socialLoaded, id, url, text, style]);

  // Reset initialization flag when URL or text changes
  useEffect(() => {
    if (initializedRef.current && containerRef.current) {
      containerRef.current.innerHTML = '';
      initializedRef.current = false;

      if (socialLoaded && window.PixelpitSocial) {
        window.PixelpitSocial.ShareButton(id, { url, text, style });
        initializedRef.current = true;
      }
    }
  }, [url, text]);

  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{ marginTop: 10 }}
    />
  );
}
