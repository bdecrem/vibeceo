'use client';

import { Skull, Flame, ExternalLink, Shuffle } from 'lucide-react';
import { useFeaturedWTAF, extractTitleFromHTML, formatAppSlugAsTitle, getPageURL } from '@/lib/hooks/use-featured-wtaf';

export default function WtafLandingPage() {
  const { featuredPages, loading, error, loadRandomPages } = useFeaturedWTAF();

  const handleMoreClick = () => {
    loadRandomPages(3);
  };

  const handleViewApp = (userSlug: string, appSlug: string) => {
    const url = getPageURL(userSlug, appSlug);
    window.open(url, '_blank');
  };

  // Helper to get emoji for page based on content
  const getPageEmoji = (prompt: string, appSlug: string) => {
    const text = (prompt + ' ' + appSlug).toLowerCase();
    
    if (text.includes('mood') || text.includes('feeling')) return '📊';
    if (text.includes('dating') || text.includes('love') || text.includes('vampire')) return '🧛';
    if (text.includes('snail') || text.includes('delivery')) return '🐌';
    if (text.includes('game') || text.includes('play')) return '🎮';
    if (text.includes('food') || text.includes('recipe')) return '🍕';
    if (text.includes('music') || text.includes('song')) return '🎵';
    if (text.includes('art') || text.includes('paint') || text.includes('draw')) return '🎨';
    if (text.includes('chat') || text.includes('talk')) return '💬';
    if (text.includes('weather') || text.includes('forecast')) return '🌤️';
    if (text.includes('todo') || text.includes('task')) return '✅';
    if (text.includes('money') || text.includes('finance')) return '💰';
    if (text.includes('travel') || text.includes('trip')) return '✈️';
    if (text.includes('pet') || text.includes('animal')) return '🐾';
    if (text.includes('book') || text.includes('read')) return '📚';
    if (text.includes('workout') || text.includes('fitness')) return '💪';
    
    return '⚡'; // Default
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black text-white relative overflow-hidden">
      <style jsx>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        @keyframes neonGlow {
          0%, 100% { text-shadow: 0 0 20px #e01aaa, 0 0 30px #e01aaa, 0 0 40px #e01aaa }
          50% { text-shadow: 0 0 10px #610c6e, 0 0 20px #610c6e, 0 0 30px #610c6e }
        }
        @keyframes punkPulse {
          0%, 100% { transform: scale(1) }
          50% { transform: scale(1.05) }
        }
      `}</style>
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent"></div>
      <div className="absolute top-20 left-10 text-purple-400/30 text-6xl">💀</div>
      <div className="absolute bottom-20 right-10">
        <Flame className="text-orange-400/30" size={80} />
      </div>
      <div className="absolute top-1/2 left-5 text-purple-300/20 text-4xl">⚡</div>
      
      {/* Above the fold - Hero section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="text-center space-y-8 max-w-4xl">
          {/* Main branding */}
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-4">
              <Skull className="text-pink-400 mr-3" size={40} />
              <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                WTAF.me
              </h1>
              <Flame className="text-orange-400 ml-3" size={40} />
            </div>
                          <h2 className="text-2xl md:text-4xl text-white font-medium">
                One-shot prompting over SMS 📱
              </h2>
              <p className="text-lg md:text-2xl text-purple-200 font-medium">
                Ship from your flip phone 📞
              </p>
          </div>

          {/* CTA Section */}
          <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30 shadow-2xl shadow-purple-500/20">
            <p className="text-lg md:text-xl mb-6 text-purple-100">
              Ready to get started? 🚀
            </p>
            
            <div className="space-y-4">
              <button 
                onClick={() => navigator.clipboard.writeText('866-330-0015')}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-full text-lg md:text-xl transition-all duration-300"
              >
                Text START to 866-330-0015 ⚡
              </button>
              
              <p className="text-sm text-purple-300">
                Click to copy number • Standard SMS rates apply
              </p>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-pink-400 italic font-semibold" style={{
            animation: 'punkPulse 3s ease infinite'
          }}>
            WHERE INK MEETS REBELLION ⛓️ 🤘 ⚡
          </p>
        </div>
      </section>

      {/* Below the fold - Examples section */}
      <section className="px-4 py-16 max-w-6xl mx-auto space-y-16">
        {/* Section header */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
            ⚡ Built by your unhinged texts
          </h2>
          <p className="text-xl text-purple-200 italic">
            Real prompts. Real chaos. Shipped to the web.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <p className="text-purple-300">Loading chaotic creations...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💀</div>
            <p className="text-red-400">Failed to load examples: {error}</p>
            <button 
              onClick={() => loadRandomPages(3)}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Featured pages */}
        {!loading && !error && featuredPages.length > 0 && (
          <div className="space-y-8">
            {featuredPages.map((page, index) => {
              const title = extractTitleFromHTML(page.html_content) || formatAppSlugAsTitle(page.app_slug);
              const emoji = getPageEmoji(page.prompt, page.app_slug);
              
              return (
                <div key={`${page.id}-${index}`} className="bg-purple-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
                  <div className="aspect-video bg-gradient-to-br from-purple-800 to-indigo-900 rounded-xl flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="text-6xl">{emoji}</div>
                      <p className="text-purple-200">{title}</p>
                      <p className="text-sm text-purple-400">
                        wtaf.me/{page.user_slug}/{page.app_slug}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-2xl text-pink-400 font-semibold">
                      "{page.prompt}"
                    </h3>
                    <p className="text-purple-200">Real prompts. Real chaos. Shipped to the web.</p>
                    <button 
                      onClick={() => handleViewApp(page.user_slug, page.app_slug)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      View Full App <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No featured pages fallback */}
        {!loading && !error && featuredPages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🚧</div>
            <p className="text-purple-300">No featured pages available yet.</p>
            <p className="text-sm text-purple-400 mt-2">Check back soon for chaotic creations!</p>
          </div>
        )}

        {/* More button */}
        <div className="text-center space-y-4">
          <button 
            onClick={handleMoreClick}
            disabled={loading}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <div className="animate-spin">⚡</div>
                Loading...
              </>
            ) : (
              <>
                <Shuffle size={20} />
                MORE! 🎲
              </>
            )}
          </button>
          <p className="text-purple-300">Click to shuffle in 3 more chaotic creations</p>
          <div className="flex justify-center">
            <Flame className="text-orange-400" size={64} />
          </div>
        </div>
      </section>
    </div>
  );
}