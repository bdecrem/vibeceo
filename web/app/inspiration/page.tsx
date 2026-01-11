"use client";

import { useState } from "react";

type Mode = "image" | "video" | "wall-of-text";
type Style = "illuminated-wellness" | "paper-cut-wellness" | "tech-dark";

interface Storyboard {
  scene1?: {
    narration: string;
    image: string;
    overlay: string;
  };
  scene2?: {
    narration: string;
    image: string;
    overlay: string;
  };
  fullNarration: string;
}

const STYLE_PREVIEWS: Record<Style, { gradient: string; accent: string }> = {
  "illuminated-wellness": {
    gradient: "from-[#1A1A3E] to-[#2d2d5a]",
    accent: "#D4A84B",
  },
  "paper-cut-wellness": {
    gradient: "from-[#1a4a4a] to-[#2A7B8C]",
    accent: "#F5F5F0",
  },
  "tech-dark": {
    gradient: "from-[#0a0a12] to-[#1a1a2e]",
    accent: "#8B5CF6",
  },
};

export default function InspirationPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("video");
  const [style, setStyle] = useState<Style>("illuminated-wellness");
  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setStoryboard(null);

    try {
      const res = await fetch("/inspiration/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, mode, style }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setStoryboard(data.storyboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const stylePreview = STYLE_PREVIEWS[style];

  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-amber-900/10 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-black text-lg">✦</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Inspiration</h1>
          </div>
          <p className="text-white/40 text-sm ml-11">Create stunning video ads with AI</p>
        </header>

        {/* Topic Input */}
        <section className="mb-12">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
            Topic
          </label>
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="how acai bowls became all the rage"
              className="w-full px-5 py-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-lg text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 to-purple-500/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        </section>

        {/* Mode Selection */}
        <section className="mb-12">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-4">
            Format
          </label>
          <div className="flex gap-3">
            {[
              { value: "image", label: "Single Image", icon: "◻" },
              { value: "video", label: "Video", icon: "▶" },
              { value: "wall-of-text", label: "Wall of Text", icon: "≡", disabled: true },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => !opt.disabled && setMode(opt.value as Mode)}
                disabled={opt.disabled}
                className={`group flex-1 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200 ${
                  mode === opt.value
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : opt.disabled
                    ? "bg-white/[0.02] text-white/20 cursor-not-allowed border border-white/[0.03]"
                    : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]"
                }`}
              >
                <span className={`block text-lg mb-1 ${mode === opt.value ? "opacity-100" : "opacity-50 group-hover:opacity-70"}`}>
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Style Selection */}
        <section className="mb-14">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-4">
            Visual Style
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                value: "illuminated-wellness",
                label: "Illuminated",
                desc: "Navy & gold elegance",
                colors: ["#1A1A3E", "#D4A84B", "#F5F0DC"]
              },
              {
                value: "paper-cut-wellness",
                label: "Paper Cut",
                desc: "Teal & cream minimal",
                colors: ["#2A7B8C", "#F5F5F0", "#ffffff"]
              },
              {
                value: "tech-dark",
                label: "Tech Dark",
                desc: "Purple & cyan glow",
                colors: ["#0a0a12", "#8B5CF6", "#06B6D4"]
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStyle(opt.value as Style)}
                className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                  style === opt.value
                    ? "ring-2 ring-white/30 ring-offset-2 ring-offset-[#09090b]"
                    : "hover:scale-[1.02]"
                }`}
              >
                {/* Color preview bar */}
                <div className="h-24 relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${opt.colors[0]} 0%, ${opt.colors[0]} 60%, ${opt.colors[1]} 100%)` }}
                  />
                  {/* Decorative accent */}
                  <div
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full opacity-80"
                    style={{ backgroundColor: opt.colors[1], boxShadow: `0 0 20px ${opt.colors[1]}40` }}
                  />
                  <div
                    className="absolute top-3 left-3 w-3 h-3 rounded-full opacity-60"
                    style={{ backgroundColor: opt.colors[2] }}
                  />
                </div>
                {/* Label */}
                <div className={`px-4 py-3 text-left transition-colors ${
                  style === opt.value ? "bg-white/10" : "bg-white/[0.03]"
                }`}>
                  <div className="text-sm font-medium text-white/90">{opt.label}</div>
                  <div className="text-xs text-white/40">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || loading}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 ${
            !topic.trim() || loading
              ? "bg-white/5 text-white/20 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:scale-[1.01]"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            "Generate Storyboard"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-lg">⚠</span>
              <div>
                <div className="text-red-400 font-medium text-sm">Something went wrong</div>
                <div className="text-red-400/70 text-sm mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Storyboard Result */}
        {storyboard && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider">Storyboard</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="grid gap-4">
              {storyboard.scene1 && (
                <div className={`p-6 rounded-2xl bg-gradient-to-br ${stylePreview.gradient} border border-white/[0.08]`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: stylePreview.accent, color: style === 'tech-dark' ? 'white' : 'black' }}
                    >
                      1
                    </div>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Scene One</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-white/40">Narration: </span>
                      <span className="text-white/80">{storyboard.scene1.narration}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Visual: </span>
                      <span className="text-white/60 italic">{storyboard.scene1.image}</span>
                    </div>
                    <div className="pt-2">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ backgroundColor: stylePreview.accent, color: style === 'tech-dark' ? 'white' : 'black' }}
                      >
                        {storyboard.scene1.overlay}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {storyboard.scene2 && (
                <div className={`p-6 rounded-2xl bg-gradient-to-br ${stylePreview.gradient} border border-white/[0.08]`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: stylePreview.accent, color: style === 'tech-dark' ? 'white' : 'black' }}
                    >
                      2
                    </div>
                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Scene Two</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-white/40">Narration: </span>
                      <span className="text-white/80">{storyboard.scene2.narration}</span>
                    </div>
                    <div>
                      <span className="text-white/40">Visual: </span>
                      <span className="text-white/60 italic">{storyboard.scene2.image}</span>
                    </div>
                    <div className="pt-2">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                        style={{ backgroundColor: stylePreview.accent, color: style === 'tech-dark' ? 'white' : 'black' }}
                      >
                        {storyboard.scene2.overlay}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Next Step Button */}
            <button className="w-full py-4 rounded-2xl font-semibold text-base bg-white/5 text-white/40 border border-white/10 cursor-not-allowed">
              Generate Video (Coming Soon)
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 text-center">
          <p className="text-xs text-white/20">TryAir v2 • Powered by Claude & GPT Image</p>
        </footer>
      </div>
    </div>
  );
}
