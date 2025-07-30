"use client";

import { ArrowLeft, Share2, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface WTAFNavigationBarProps {
  userSlug: string;
  appSlug: string;
  onShare?: () => void;
  onRemix?: () => void;
}

export default function WTAFNavigationBar({ 
  userSlug, 
  appSlug, 
  onShare, 
  onRemix 
}: WTAFNavigationBarProps) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleBack = () => {
    console.log('🔙 Back button clicked');
    // Smart back navigation - try to go back in history first
    if (typeof window !== 'undefined') {
      // Check if there's a history to go back to
      if (window.history.length > 1) {
        console.log('🔙 Going back in history');
        router.back();
      } else {
        // Fallback to user's creations page
        console.log('🔙 No history, going to user page:', userSlug);
        router.push(`/${userSlug}`);
      }
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    setIsSharing(true);
    const url = `${window.location.origin}/wtaf/${userSlug}/${appSlug}`;
    
    try {
      if (navigator.share) {
        // Use native sharing if available (mobile)
        await navigator.share({
          title: `Check out this WTAF app: ${appSlug}`,
          text: "Web toys, artifacts & fun - made with WTAF!",
          url: url,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        // Show temporary feedback
        const btn = document.querySelector('.share-btn');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = 'COPIED!';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      }
    } catch (error) {
      console.log('Sharing failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemix = () => {
    if (onRemix) {
      onRemix();
    } else {
      // Navigate to remix page or trigger remix modal
      const remixUrl = `/remix/${userSlug}/${appSlug}`;
      router.push(remixUrl);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className="wtaf-nav-bar">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="nav-back-btn"
        aria-label="Go back"
        type="button"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Back to WEBTOYS</span>
        <span className="sm:hidden">Back</span>
      </button>

      {/* Center Branding */}
      <div className="nav-branding">
        TEXT +1-866-330-0015 WITH REMIX CODE
      </div>

      {/* Action Buttons */}
      <div className="nav-actions">
        <button 
          onClick={handleShare}
          className="nav-action-btn share-btn"
          disabled={isSharing}
          aria-label="Share app"
        >
          <Share2 className="w-4 h-4 mr-1.5" />
          <span>SHARE</span>
        </button>
        
        <button 
          onClick={handleRemix}
          className="nav-action-btn remix-btn"
          aria-label="Remix app"
        >
          <Repeat className="w-4 h-4 mr-1.5" />
          <span>REMIX</span>
        </button>
      </div>

      <style jsx>{`
        /* WEBTOYS Design System Colors */
        :root {
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }

        .wtaf-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          padding: 0.8rem 1.5rem;
          position: relative;
          z-index: 1000;
          min-height: 60px;
        }

        .nav-back-btn {
          display: flex;
          align-items: center;
          background: transparent;
          border: none;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 10;
        }

        .nav-back-btn:hover {
          color: #666;
        }

        .nav-branding {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          padding: 0.5rem 1rem;
          border-radius: 20px;
        }

        .nav-actions {
          display: flex;
          gap: 0.8rem;
          align-items: center;
        }

        .nav-action-btn {
          display: flex;
          align-items: center;
          background: white;
          border: 1px solid #333;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0.6rem 1.2rem;
          border-radius: 20px;
          min-width: 80px;
          justify-content: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-action-btn:hover {
          background: #333;
          color: white;
        }

        .nav-action-btn:active {
          transform: scale(0.95);
        }

        .nav-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .wtaf-nav-bar {
            padding: 0.6rem 1rem;
          }

          .nav-branding {
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .nav-back-btn {
            font-size: 0.8rem;
          }

          .nav-action-btn {
            font-size: 0.75rem;
            padding: 0.5rem 0.8rem;
            min-width: 70px;
          }

          .nav-actions {
            gap: 0.6rem;
          }
        }

        @media (max-width: 480px) {
          .nav-branding {
            font-size: 0.65rem;
            padding: 0.3rem 0.6rem;
            max-width: 180px;
          }

          .nav-action-btn span {
            display: none;
          }

          .nav-action-btn {
            min-width: 40px;
            padding: 0.5rem;
            border-radius: 50%;
          }
        }
      `}</style>
    </div>
  );
} 