"use client";

import { ArrowLeft, Share2, Repeat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  const handleBack = () => {
    // Smart back navigation - try to go back in history first
    if (typeof window !== 'undefined') {
      // Check if there's a history to go back to
      if (window.history.length > 1) {
        router.back();
      } else {
        // Fallback to user's creations page
        router.push(`/wtaf/${userSlug}/creations`);
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

  return (
    <div className="wtaf-nav-bar">
      {/* Back Button */}
      <button 
        onClick={handleBack}
        className="nav-back-btn"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Back to WTAF</span>
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
        .wtaf-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #000;
          border-bottom: 2px solid #ff0080;
          padding: 12px 20px;
          position: relative;
          z-index: 1000;
          min-height: 60px;
        }

        .nav-back-btn {
          display: flex;
          align-items: center;
          background: transparent;
          border: none;
          color: #00ffff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .nav-back-btn:hover {
          background: rgba(0, 255, 255, 0.1);
          transform: translateX(-2px);
        }

        .nav-branding {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          color: #ff0080;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 900;
          font-size: 16px;
          letter-spacing: 1px;
          text-shadow: 0 0 10px rgba(255, 0, 128, 0.5);
          white-space: nowrap;
        }

        .nav-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .nav-action-btn {
          display: flex;
          align-items: center;
          background: transparent;
          border: 1.5px solid;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 8px 16px;
          border-radius: 25px;
          min-width: 85px;
          justify-content: center;
        }

        .share-btn {
          border-color: #00ffff;
          color: #00ffff;
        }

        .share-btn:hover {
          background: #00ffff;
          color: #000;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        .remix-btn {
          border-color: #ff0080;
          color: #ff0080;
        }

        .remix-btn:hover {
          background: #ff0080;
          color: #fff;
          box-shadow: 0 0 15px rgba(255, 0, 128, 0.3);
        }

        .nav-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .wtaf-nav-bar {
            padding: 10px 16px;
            min-height: 56px;
          }

          .nav-branding {
            font-size: 12px;
            max-width: 280px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .nav-back-btn {
            font-size: 13px;
            padding: 6px 8px;
          }

          .nav-action-btn {
            font-size: 12px;
            padding: 6px 12px;
            min-width: 70px;
          }

          .nav-actions {
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .nav-branding {
            font-size: 10px;
            max-width: 200px;
          }

          .nav-action-btn span {
            display: none;
          }

          .nav-action-btn {
            min-width: 40px;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
} 