'use client'

import React from 'react'
import Link from 'next/link'
import RemixButton from '@/components/remix-button'
import TruncatedPrompt from '@/components/truncated-prompt'

export interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  total_descendants?: number
  recent_remixes?: number
  is_remix: boolean
  parent_app_id: string | null
  is_featured: boolean
  last_remixed_at: string | null
  Fave?: boolean
  Forget?: boolean
}

interface EmptyState {
  icon: string
  title: string
  description: string
}

interface WtafAppGridProps {
  apps: WtafApp[]
  emptyState?: EmptyState
  showRemixButtons?: boolean
  showUserInMeta?: boolean // For trending page to show "By username"
  layoutStyle?: 'standard' | 'homepage' // Choose layout style
}

export function WtafAppGrid({ 
  apps, 
  emptyState, 
  showRemixButtons = true,
  showUserInMeta = false,
  layoutStyle = 'standard'
}: WtafAppGridProps) {
  if (apps.length === 0 && emptyState) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{emptyState.icon}</div>
        <h3 className="text-2xl text-white mb-4">{emptyState.title}</h3>
        <p className="text-gray-300 text-lg">{emptyState.description}</p>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .wtaf-service-card {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 25px;
          padding: 45px 35px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          margin-bottom: 35px;
        }

        .wtaf-service-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff0080, #00ffff, #ffff00, #ff0080);
          background-size: 200% 100%;
          animation: borderGlow 3s linear infinite;
        }

        @keyframes borderGlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .wtaf-service-card:hover {
          transform: translateY(-8px);
          background: rgba(0, 0, 0, 0.7);
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(255, 0, 128, 0.2);
          border-color: rgba(255, 0, 128, 0.3);
        }

        .wtaf-service-image {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          border-radius: 1rem 1rem 0 0; /* rounded-t-2xl to match container */
        }

        .wtaf-service-card:hover .wtaf-service-image {
          transform: scale(1.02);
          filter: drop-shadow(0 0 30px rgba(255, 0, 128, 0.8));
          border-color: rgba(255, 0, 128, 0.7);
          box-shadow: 0 10px 40px rgba(255, 0, 128, 0.3);
        }

        .wtaf-prompt-showcase {
          color: #00ffff;
          font-family: 'Space Grotesk', monospace;
          font-size: 1.8rem;
          font-weight: 500;
          background: rgba(0, 255, 255, 0.1);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 15px;
          padding: 30px 35px;
          margin: 0;
          text-align: left;
          text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
          backdrop-filter: blur(5px);
          font-style: italic;
          line-height: 1.3;
        }

        .wtaf-prompt-label {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 25px 0;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
          opacity: 0.8;
          text-align: left;
        }

        /* Desktop layout for feature cards with images */
        @media (min-width: 769px) {
          .wtaf-service-card.wtaf-image-card {
            display: flex !important;
            align-items: center !important;
            gap: 40px !important;
            padding: 45px 50px !important;
            max-width: 1400px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            width: 100% !important;
          }
          
          .wtaf-service-card.wtaf-image-card .wtaf-image-container {
            flex: 0 0 auto !important;
            margin: 0 !important;
            width: 160px !important;
            max-width: 160px !important;
            min-width: 160px !important;
            height: auto !important;
          }
          
          .wtaf-service-card.wtaf-image-card .wtaf-image-content {
            flex: 2 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            min-height: 200px !important;
          }
          
          .wtaf-service-card.wtaf-image-card .wtaf-prompt-label {
            margin: 0 0 25px 0 !important;
            font-size: 1.2rem !important;
          }
          
          .wtaf-service-card.wtaf-image-card .wtaf-prompt-showcase {
            margin: 0 0 30px 0 !important;
            font-size: 2.2rem !important;
            padding: 35px 40px !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {apps.map((app) => (
          <div key={app.id} className="wtaf-service-card wtaf-image-card">
            <div className="wtaf-image-container">
              <Link href={`/${app.user_slug}/${app.app_slug}`}>
                <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
                  <img
                    src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`}
                    alt={`${app.app_slug} preview`}
                    className="wtaf-service-image"
                    style={{ margin: 0, width: '100%' }}
                  />
                  {/* iMessage-style metadata footer */}
                  <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 rounded-b-2xl">
                    <div className="text-white font-semibold text-sm mb-1" style={{ fontFamily: 'Space Grotesk, monospace' }}>
                      WTAF by AF
                    </div>
                    <div className="text-gray-300 text-xs font-mono">
                      {app.app_slug}
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* User info below image - right aligned */}
              <div style={{ textAlign: 'right', marginTop: '15px' }}>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '0.9rem',
                  fontFamily: 'Space Grotesk, sans-serif',
                  marginBottom: '8px'
                }}>
                  By {app.user_slug} • Created {new Date(app.created_at).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                  {app.recent_remixes && app.recent_remixes > 0 && (
                    <span style={{
                      background: 'rgba(255, 165, 0, 0.3)',
                      color: '#ffcc99',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 165, 0, 0.5)',
                      fontSize: '0.75rem',
                      backdropFilter: 'blur(5px)'
                    }}>
                      🔥 {app.recent_remixes} recent remix{app.recent_remixes !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {(app.total_descendants || app.remix_count || 0) > 0 && (
                    <span style={{
                      background: 'rgba(255, 20, 147, 0.3)',
                      color: '#ffb3d9',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 20, 147, 0.5)',
                      fontSize: '0.75rem',
                      backdropFilter: 'blur(5px)'
                    }}>
                      💎 {app.total_descendants || app.remix_count || 0} total remix{(app.total_descendants || app.remix_count || 0) !== 1 ? 'es' : ''}
                    </span>
                  )}
                  {app.is_remix && (
                    <span style={{
                      background: 'rgba(0, 123, 255, 0.3)',
                      color: '#99d6ff',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 123, 255, 0.5)',
                      fontSize: '0.75rem',
                      backdropFilter: 'blur(5px)'
                    }}>
                      🔄 Remix
                    </span>
                  )}
                  {app.Fave && (
                    <span style={{
                      background: 'rgba(255, 193, 7, 0.3)',
                      color: '#fff3cd',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 193, 7, 0.5)',
                      fontSize: '0.75rem',
                      backdropFilter: 'blur(5px)'
                    }}>
                      📌 Pinned
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="wtaf-image-content">
              <div className="wtaf-prompt-label">The prompt:</div>
              <TruncatedPrompt
                prompt={app.original_prompt}
                maxLength={120}
                className="wtaf-prompt-showcase"
                copyOnClick={true}
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
              
              {/* Actions - positioned at bottom right */}
              {showRemixButtons && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                  <RemixButton appSlug={app.app_slug} userSlug={app.user_slug} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
} 