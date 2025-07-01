import React from 'react'
import Link from 'next/link'
import RemixButton from '@/components/remix-button'

export interface WtafApp {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
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
}

export function WtafAppGrid({ 
  apps, 
  emptyState, 
  showRemixButtons = true,
  showUserInMeta = false 
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
    <div className="space-y-6 md:space-y-8">
      {apps.map((app) => (
        <div 
          key={app.id} 
          className="relative bg-gradient-to-br from-purple-900/20 via-black/40 to-pink-900/20 backdrop-blur-sm rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 border-2"
          style={{
            borderImage: 'linear-gradient(135deg, #ff00ff, #00ffff, #ffff00, #ff00ff) 1',
            boxShadow: '0 8px 32px rgba(255, 0, 255, 0.3), 0 0 20px rgba(0, 255, 255, 0.2)'
          }}
        >
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-12 md:p-8">
            {/* OG Image with iMessage-style footer */}
            <div className="flex-shrink-0 w-full md:flex-1 md:max-w-[60%] relative">
              <Link href={`/${app.user_slug}/${app.app_slug}`}>
                {/* Image container with integrated footer */}
                <div className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
                  <img
                    src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${app.user_slug}-${app.app_slug}.png`}
                    alt={`${app.app_slug} preview`}
                    className="w-full h-auto"
                    style={{
                      aspectRatio: '2/1',
                      display: 'block'
                    }}
                  />
                  {/* iMessage-style metadata footer */}
                  <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3">
                    <div className="text-white font-semibold text-sm mb-1" style={{ fontFamily: 'Space Grotesk, monospace' }}>
                      WTAF by AF
                    </div>
                    <div className="text-gray-300 text-xs font-mono">
                      {app.app_slug}
                    </div>
                  </div>
                </div>
                
                {/* Favorite Pin Icon */}
                {app.Fave && (
                  <div 
                    className="absolute top-2 right-2 md:top-4 md:right-4 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center backdrop-blur-sm border"
                    style={{
                      background: 'rgba(255, 215, 0, 0.9)',
                      borderColor: 'rgba(255, 215, 0, 0.5)',
                      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)'
                    }}
                  >
                    <span className="text-black text-xs md:text-sm">📌</span>
                  </div>
                )}
              </Link>
            </div>

            {/* Content */}
            <div className="flex-1 md:max-w-[40%] space-y-4 md:space-y-6">
              {/* The Prompt Label */}
              <div className="text-gray-300 text-base md:text-lg font-semibold tracking-wider uppercase">
                THE PROMPT:
              </div>

              {/* Prompt Text */}
              <div className="bg-gradient-to-br from-black/40 to-purple-900/30 border-2 border-cyan-400/60 rounded-2xl p-4 md:p-6 backdrop-blur-sm">
                <p 
                  className="text-cyan-200 text-sm md:text-xl font-medium leading-relaxed"
                  style={{
                    fontFamily: 'Space Grotesk, monospace',
                    fontStyle: 'italic'
                  }}
                >
                  "{app.original_prompt}"
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                <span className="text-gray-300 text-xs">
                  {showUserInMeta && `By ${app.user_slug} • `}
                  Created {new Date(app.created_at).toLocaleDateString()}
                </span>
                {app.recent_remixes && app.recent_remixes > 0 && (
                  <span className="bg-orange-500/30 text-orange-200 px-2 py-1 md:px-3 md:py-1 rounded-full border border-orange-400/50 text-xs backdrop-blur-sm">
                    🔥 {app.recent_remixes} recent remix{app.recent_remixes !== 1 ? 'es' : ''}
                  </span>
                )}
                {app.remix_count > 0 && (
                  <span className="bg-pink-500/30 text-pink-200 px-2 py-1 md:px-3 md:py-1 rounded-full border border-pink-400/50 text-xs backdrop-blur-sm">
                    💎 {app.remix_count} total remix{app.remix_count !== 1 ? 'es' : ''}
                  </span>
                )}
                {app.is_remix && (
                  <span className="bg-blue-500/30 text-blue-200 px-2 py-1 md:px-3 md:py-1 rounded-full border border-blue-400/50 text-xs backdrop-blur-sm">
                    🔄 Remix
                  </span>
                )}
                {app.is_featured && (
                  <span className="bg-yellow-500/30 text-yellow-200 px-2 py-1 md:px-3 md:py-1 rounded-full border border-yellow-400/50 text-xs backdrop-blur-sm">
                    ⭐ Featured
                  </span>
                )}
                {app.Fave && (
                  <span className="bg-amber-500/30 text-amber-200 px-2 py-1 md:px-3 md:py-1 rounded-full border border-amber-400/50 text-xs backdrop-blur-sm">
                    📌 Pinned
                  </span>
                )}
              </div>

              {/* Actions */}
              {showRemixButtons && (
                <div className="flex justify-center mt-4">
                  <RemixButton appSlug={app.app_slug} userSlug={app.user_slug} />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 