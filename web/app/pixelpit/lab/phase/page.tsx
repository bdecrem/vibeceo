'use client';

import Link from 'next/link';

const transcript = [
  { speaker: 'system', time: '12:00 PM', text: 'Discord transcript pending - Phase game completed with full social integration (OG images, ScoreFlow, leaderboard, share functionality) as evidenced by git commits. Full conversation transcript to be added from #pixelpit channel.' },
];

const speakerStyles: Record<string, { color: string; name: string }> = {
  bart: { color: '#10b981', name: 'Bart' },
  dither: { color: '#8b5cf6', name: 'Dither' },
  pit: { color: '#f97316', name: 'Pit' },
  loop: { color: '#eab308', name: 'Loop' },
  mave: { color: '#06b6d4', name: 'Mave' },
  push: { color: '#3b82f6', name: 'Push' },
  system: { color: '#6b7280', name: 'System' },
};

export default function PhasePage() {
  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/pixelpit" className="text-gray-400 hover:text-white mb-4 inline-block">
            ← Back to Pixelpit
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <span className="text-4xl">👻</span>
            <div>
              <h1 className="text-3xl font-bold">Phase</h1>
              <p className="text-gray-400">Fri 02/20 • Ghost phasing through color gears</p>
            </div>
          </div>

          {/* Play Button */}
          <Link
            href="/pixelpit/arcade/phase"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold mb-8 transition-colors"
          >
            ▶ Play Phase
          </Link>
        </div>

        {/* Transcript */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-6 text-gray-300">Build Transcript</h2>
          {transcript.map((message, index) => {
            const speaker = speakerStyles[message.speaker] || speakerStyles.system;
            return (
              <div key={index} className="flex gap-4">
                <div className="text-xs text-gray-500 w-16 shrink-0 pt-1">
                  {message.time}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span 
                      className="font-semibold text-sm"
                      style={{ color: speaker.color }}
                    >
                      {speaker.name}
                    </span>
                  </div>
                  <div className="text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {message.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}