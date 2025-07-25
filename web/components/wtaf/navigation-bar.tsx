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
          background: var(--white-pure);
          border-bottom: 6px solid var(--yellow);
          padding: 1rem 2rem;
          position: relative;
          z-index: 1000;
          min-height: 80px;
          box-shadow: 0 8px 20px var(--purple-shadow);
        }

        .nav-back-btn {
          display: flex;
          align-items: center;
          background: var(--cream);
          border: 3px solid var(--charcoal);
          color: var(--charcoal);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          box-shadow: 0 4px 0 var(--gray-warm);
        }

        .nav-back-btn:hover {
          background: var(--blue);
          color: var(--white-pure);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--blue-deep);
        }

        .nav-branding {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: var(--red);
          color: var(--white-pure);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          padding: 0.75rem 2rem;
          border-radius: 2rem;
          border: 3px solid var(--charcoal);
          box-shadow: 0 4px 0 var(--red-soft);
          animation: pulse-glow 3s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 4px 0 var(--red-soft), 0 0 0 rgba(255, 75, 75, 0.3);
          }
          50% { 
            box-shadow: 0 4px 0 var(--red-soft), 0 0 20px rgba(255, 75, 75, 0.6);
          }
        }

        .nav-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .nav-action-btn {
          display: flex;
          align-items: center;
          background: var(--white-pure);
          border: 3px solid;
          color: var(--charcoal);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          min-width: 100px;
          justify-content: center;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          position: relative;
          overflow: hidden;
        }

        .share-btn {
          border-color: var(--blue);
          background: var(--blue);
          color: var(--white-pure);
          box-shadow: 0 4px 0 var(--blue-deep);
        }

        .share-btn:hover {
          background: var(--blue-deep);
          transform: translateY(-3px);
          box-shadow: 0 7px 0 var(--charcoal);
        }

        .remix-btn {
          border-color: var(--green-sage);
          background: var(--green-mint);
          color: var(--charcoal);
          box-shadow: 0 4px 0 var(--green-sage);
        }

        .remix-btn:hover {
          background: var(--green-sage);
          color: var(--white-pure);
          transform: translateY(-3px);
          box-shadow: 0 7px 0 var(--charcoal);
        }

        .nav-action-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 0 var(--charcoal);
        }

        .nav-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .wtaf-nav-bar {
            padding: 0.75rem 1rem;
            min-height: 70px;
          }

          .nav-branding {
            font-size: 0.9rem;
            padding: 0.5rem 1.5rem;
            max-width: 280px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .nav-back-btn {
            font-size: 0.85rem;
            padding: 0.5rem 1rem;
          }

          .nav-action-btn {
            font-size: 0.8rem;
            padding: 0.5rem 1rem;
            min-width: 80px;
          }

          .nav-actions {
            gap: 0.5rem;
          }
        }

        @media (max-width: 480px) {
          .wtaf-nav-bar {
            padding: 0.5rem 0.75rem;
            min-height: 60px;
          }

          .nav-branding {
            font-size: 0.7rem;
            padding: 0.4rem 1rem;
            max-width: 200px;
          }

          .nav-back-btn {
            font-size: 0.75rem;
            padding: 0.4rem 0.8rem;
          }

          .nav-action-btn span {
            display: none;
          }

          .nav-action-btn {
            min-width: 45px;
            padding: 0.5rem;
            border-radius: 50%;
          }

          .nav-actions {
            gap: 0.4rem;
          }
        }
      `}</style>
    </div>
  );
} 