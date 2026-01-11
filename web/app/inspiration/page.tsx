"use client";

import { useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

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

  return (
    <div className={`${inter.className} min-h-screen bg-[#0a0a0a] text-white`}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white/90 flex items-center gap-2">
            <span className="text-amber-400">✦</span> Inspiration
          </h1>
          <p className="text-sm text-white/50 mt-1">AI video ad generator</p>
        </div>

        {/* Topic Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-white/70 mb-2">
            What's the topic?
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="how acai bowls became all the rage"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>

        {/* Mode Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-white/70 mb-3">
            Mode
          </label>
          <div className="flex gap-3">
            {[
              { value: "image", label: "Image" },
              { value: "video", label: "Video (2 scenes)" },
              { value: "wall-of-text", label: "Wall of Text", disabled: true },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => !opt.disabled && setMode(opt.value as Mode)}
                disabled={opt.disabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === opt.value
                    ? "bg-white/15 text-white border border-white/20"
                    : opt.disabled
                    ? "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style Selection */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-white/70 mb-3">
            Style
          </label>
          <div className="space-y-2">
            {[
              { value: "illuminated-wellness", label: "Illuminated Wellness", desc: "Paper-craft, navy + gold, elegant" },
              { value: "paper-cut-wellness", label: "Paper Cut", desc: "Teal + cream, airy, modern" },
              { value: "tech-dark", label: "Tech Dark", desc: "Dark, purple/cyan glows, premium" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStyle(opt.value as Style)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                  style === opt.value
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/5 border border-white/5 hover:bg-white/8"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    style === opt.value ? "border-amber-400 bg-amber-400" : "border-white/30"
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white/90">{opt.label}</div>
                    <div className="text-xs text-white/40">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!topic.trim() || loading}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            !topic.trim() || loading
              ? "bg-white/10 text-white/30 cursor-not-allowed"
              : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {loading ? "Generating..." : "Generate Storyboard"}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Storyboard Result */}
        {storyboard && (
          <div className="mt-10 space-y-6">
            <h2 className="text-lg font-medium text-white/80">Storyboard</h2>

            {storyboard.scene1 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                <div className="text-xs font-medium text-amber-400/80 uppercase tracking-wide">Scene 1</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Narration:</span> {storyboard.scene1.narration}</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Image:</span> {storyboard.scene1.image}</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Overlay:</span> "{storyboard.scene1.overlay}"</div>
              </div>
            )}

            {storyboard.scene2 && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-2">
                <div className="text-xs font-medium text-amber-400/80 uppercase tracking-wide">Scene 2</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Narration:</span> {storyboard.scene2.narration}</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Image:</span> {storyboard.scene2.image}</div>
                <div className="text-sm text-white/60"><span className="text-white/40">Overlay:</span> "{storyboard.scene2.overlay}"</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
