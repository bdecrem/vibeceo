'use client';

import { Skull, Flame } from 'lucide-react';

export default function WtafLandingPage() {
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

        {/* Example cards */}
        <div className="space-y-8">
          {/* Example 1 - Mood Tracker */}
          <div className="bg-purple-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="aspect-video bg-gradient-to-br from-purple-800 to-indigo-900 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">📊</div>
                <p className="text-purple-200">Mood Tracker Preview</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl md:text-2xl text-pink-400 font-semibold">
                "I need a mood tracker that lies to me 😈"
              </h3>
              <p className="text-purple-200">Because sometimes honesty hurts</p>
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300">
                View Full App →
              </button>
            </div>
          </div>

          {/* Example 2 - Snail Delivery */}
          <div className="bg-purple-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="aspect-video bg-gradient-to-br from-green-800 to-blue-900 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">🐌</div>
                <p className="text-purple-200">Startup Pitch Preview</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl md:text-2xl text-pink-400 font-semibold">
                "Make me a startup pitch for snail delivery 🐌"
              </h3>
              <p className="text-purple-200">Slow but steady wins the funding</p>
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300">
                View Full App →
              </button>
            </div>
          </div>

          {/* Example 3 - Vampire Dating */}
          <div className="bg-purple-900/50 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div className="aspect-video bg-gradient-to-br from-red-800 to-purple-900 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">🧛</div>
                <p className="text-purple-200">Dating App Preview</p>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl md:text-2xl text-pink-400 font-semibold">
                "Build me a dating app for vampires 🧛"
              </h3>
              <p className="text-purple-200">Real prompts. Real chaos. Shipped to the web.</p>
              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300">
                View Full App →
              </button>
            </div>
          </div>
        </div>

        {/* More button */}
        <div className="text-center space-y-4">
          <button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105">
            MORE! 🎲
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