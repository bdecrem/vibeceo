"use client"

import React, { useEffect, useState } from "react"

interface CopiedModalProps {
  show: boolean
  text: string
  onClose: () => void
}

type DeviceType = 'desktop' | 'android' | 'iphone' | 'unknown'

export default function CopiedModal({ show, text, onClose }: CopiedModalProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown')

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      
      if (/iphone|ipod|ipad/.test(userAgent)) {
        return 'iphone'
      } else if (/android/.test(userAgent)) {
        return 'android'
      } else {
        return 'desktop'
      }
    }

    setDeviceType(detectDevice())
  }, [])

  if (!show) return null

  return (
    <>
      {/* Modal */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="copied-modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onClose}>×</button>
          <div className="modal-content">
            <div className="success-indicator">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="modal-title">COPIED!</h3>
            <div className="copied-text-display">
              {text}
            </div>
            <p className="instruction-text">
              Now text this to
            </p>
            <a href="sms:+18663300015" className="phone-button">
              +1-866-330-0015
            </a>
            <p className="paste-hint">
              👉 Long press to paste the magic
            </p>
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
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: modal-fade-in 0.2s ease-out;
        }

        @keyframes modal-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .copied-modal {
          background: #FFFFFF;
          border: 3px solid #FDE047;
          border-radius: 1rem;
          max-width: 400px;
          width: 90%;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          animation: modal-slide-up 0.3s ease-out;
        }

        @keyframes modal-slide-up {
          0% { 
            opacity: 0; 
            transform: translateY(20px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }

        .modal-content {
          padding: 2.5rem 2rem;
          text-align: center;
        }

        .success-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #B6FFB3;
          border-radius: 50%;
          margin-bottom: 1rem;
          color: #2A2A2A;
        }

        .modal-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #2A2A2A;
          margin: 0 0 1.5rem 0;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: #6B6B6B;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #F5F5F5;
          color: #2A2A2A;
        }

        .copied-text-display {
          background: #FEFEF5;
          border: 2px solid #B6FFB3;
          border-radius: 1rem;
          padding: 1.25rem 1.75rem;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Consolas', monospace;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2A2A2A;
          word-break: break-word;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .instruction-text {
          font-size: 0.9rem;
          color: #6B6B6B;
          margin: 0 0 1rem 0;
        }

        .phone-button {
          display: inline-block;
          background: #87CEEB;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 2rem;
          font-size: 1.1rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          margin-bottom: 1rem;
        }

        .phone-button:hover {
          background: #5FA8D3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(135, 206, 235, 0.3);
        }

        .phone-button:active {
          transform: translateY(0);
        }

        .paste-hint {
          font-size: 0.8rem;
          color: #6B6B6B;
          margin: 0;
          font-style: italic;
        }
      `}</style>
    </>
  )
}