"use client"

import React from "react"

interface CopiedModalProps {
  show: boolean
  text: string
  onClose: () => void
}

export default function CopiedModal({ show, text, onClose }: CopiedModalProps) {
  if (!show) return null

  return (
    <>
      {/* Modal */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="copied-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="close-button" onClick={onClose}>×</button>
            <div className="header-center">
              <div className="success-icon">✨</div>
              <h3 className="modal-title">Copied!</h3>
            </div>
            <div className="header-spacer"></div>
          </div>
          <div className="modal-body">
            <p className="instruction-text">
              Now text this to <span className="phone-number">+1-866-330-0015</span>
            </p>
            <div className="copied-text-display">
              {text}
            </div>
          </div>
          <div className="modal-footer">
            <button className="got-it-button" onClick={onClose}>
              Got it!
            </button>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(42, 42, 42, 0.9);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: modal-fade-in 0.3s ease-out;
        }

        @keyframes modal-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .copied-modal {
          background: #FEFEF5; /* var(--white-pure) */
          border: 6px solid #FFD63D; /* var(--yellow) */
          border-radius: 2rem;
          max-width: 600px;
          width: 90%;
          position: relative;
          box-shadow: 0 20px 0 #8B7FD4, 0 40px 80px rgba(201, 194, 249, 0.25); /* var(--purple-accent), var(--purple-shadow) */
          animation: modal-bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          transform-origin: center;
        }

        @keyframes modal-bounce-in {
          0% { 
            opacity: 0; 
            transform: scale(0.3) translateY(-50px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 4px solid #FFF4CC; /* var(--cream) */
          background: linear-gradient(135deg, #FFF4CC 0%, #FEFEF5 100%); /* var(--yellow-soft) to var(--white-pure) */
          border-radius: 1.4rem 1.4rem 0 0;
        }

        .header-center {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          justify-content: center;
        }

        .header-spacer {
          width: 40px;
        }

        .success-icon {
          font-size: 2rem;
          animation: sparkle-rotate 2s ease-in-out infinite;
        }

        @keyframes sparkle-rotate {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          50% { transform: rotate(10deg) scale(1.2); }
          75% { transform: rotate(-5deg) scale(1.1); }
        }

        .modal-title {
          font-size: 2rem;
          font-weight: 900;
          color: #2A2A2A; /* var(--charcoal) */
          margin: 0;
          text-transform: uppercase;
          letter-spacing: -1px;
        }

        .close-button {
          background: #FF4B4B; /* var(--red) */
          border: 3px solid #2A2A2A; /* var(--charcoal) */
          color: #FEFEF5; /* var(--white-pure) */
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          line-height: 1;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.3s ease;
          font-weight: 900;
          box-shadow: 0 4px 0 #FF7A7A; /* var(--red-soft) */
        }

        .close-button:hover {
          background: #FF7A7A; /* var(--red-soft) */
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #FF4B4B; /* var(--red) */
        }

        .modal-body {
          padding: 2rem;
          background: #FEFEF5; /* var(--white-pure) */
        }

        .instruction-text {
          font-size: 1.3rem;
          color: #2A2A2A; /* var(--charcoal) */
          margin: 0 0 2rem 0;
          text-align: center;
          font-weight: 600;
        }

        .phone-number {
          background: #6ECBFF; /* var(--blue) */
          color: #FEFEF5; /* var(--white-pure) */
          padding: 0.3rem 0.8rem;
          border-radius: 1rem;
          font-weight: 900;
          font-size: 1.1em;
          border: 2px solid #4A9FD4; /* var(--blue-deep) */
          box-shadow: 0 3px 0 #4A9FD4; /* var(--blue-deep) */
        }

        .copied-text-display {
          background: #FFF4CC; /* var(--cream) */
          border: 4px solid #B6FFB3; /* var(--green-mint) */
          border-radius: 1.5rem;
          padding: 1.5rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
          font-size: 1.1rem;
          color: #2A2A2A; /* var(--charcoal) */
          word-break: break-word;
          line-height: 1.4;
          font-weight: 600;
          position: relative;
          overflow: hidden;
        }

        .copied-text-display::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #B6FFB3, #6ECBFF, #8B7FD4, #B6FFB3); /* var(--green-mint), var(--blue), var(--purple-accent), var(--green-mint) */
          background-size: 200% 200%;
          border-radius: inherit;
          z-index: -1;
          animation: rainbow-border 3s ease-in-out infinite;
        }

        @keyframes rainbow-border {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .modal-footer {
          padding: 2rem;
          display: flex;
          justify-content: center;
          background: #FEFEF5; /* var(--white-pure) */
          border-radius: 0 0 1.4rem 1.4rem;
        }

        .got-it-button {
          background: #B6FFB3; /* var(--green-mint) */
          color: #2A2A2A; /* var(--charcoal) */
          border: 4px solid #7FB069; /* var(--green-sage) */
          padding: 1rem 3rem;
          border-radius: 2rem;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 0 #7FB069; /* var(--green-sage) */
        }

        .got-it-button:hover {
          background: #7FB069; /* var(--green-sage) */
          color: #FEFEF5; /* var(--white-pure) */
          transform: translateY(-3px);
          box-shadow: 0 9px 0 #2A2A2A; /* var(--charcoal) */
        }

        .got-it-button:active {
          transform: translateY(0);
          box-shadow: 0 3px 0 #7FB069; /* var(--green-sage) */
        }
      `}</style>
    </>
  )
}