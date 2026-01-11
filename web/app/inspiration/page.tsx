"use client";

import { useState } from "react";

type Mode = "image" | "video" | "wall-of-text";
type Style = "illuminated-wellness" | "paper-cut-wellness" | "tech-dark";

interface VideoComp {
  mood: string;
  scene1: { image: string; overlay: string };
  scene2: { image: string; overlay: string };
}

interface WallOfTextComp {
  mood: string;
  backgroundImage: string;
}

interface ImageComp {
  mood: string;
  image: string;
  headline: string;
}

interface VideoStoryboard {
  type: "video";
  narration: { scene1: string; scene2: string };
  compA: VideoComp;
  compB: VideoComp;
}

interface WallOfTextStoryboard {
  type: "wall-of-text";
  script: string;
  compA: WallOfTextComp;
  compB: WallOfTextComp;
}

interface ImageStoryboard {
  type: "image";
  compA: ImageComp;
  compB: ImageComp;
}

type Storyboard = VideoStoryboard | WallOfTextStoryboard | ImageStoryboard;

interface CompImages {
  compA?: { scene1?: string; scene2?: string; background?: string; single?: string };
  compB?: { scene1?: string; scene2?: string; background?: string; single?: string };
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

const STYLE_PROMPTS: Record<Style, string> = {
  "illuminated-wellness": "Render in an illuminated manuscript style with deep navy blue backgrounds, golden accents, and cream-colored elements. Rich, luxurious, elegant.",
  "paper-cut-wellness": "Render in a paper-cut layered style with teal, cream, and soft white colors. Minimal, clean, dimensional shadows.",
  "tech-dark": "Render in a dark tech style with deep blacks, purple glows, and cyan accents. Futuristic, sleek, high-contrast.",
};

export default function InspirationPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("video");
  const [style, setStyle] = useState<Style>("illuminated-wellness");
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [compImages, setCompImages] = useState<CompImages>({});
  const [selectedComp, setSelectedComp] = useState<"A" | "B" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setStoryboard(null);
    setCompImages({});
    setSelectedComp(null);

    try {
      // Step 1: Generate storyboard
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
      setLoading(false);

      // Step 2: Generate images for both comps in parallel
      setGeneratingImages(true);
      await generateCompImages(data.storyboard);
      setGeneratingImages(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setGeneratingImages(false);
    }
  };

  const generateCompImages = async (sb: Storyboard) => {
    const stylePrompt = STYLE_PROMPTS[style];
    const imagePromises: Promise<void>[] = [];

    const generateImage = async (prompt: string): Promise<string | undefined> => {
      try {
        const res = await fetch("/inspiration/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${prompt}\n\n${stylePrompt}\n\nIMPORTANT: Generate an image with NO TEXT, NO WORDS, NO LABELS.`,
            size: mode === "image" ? "1024x1024" : "1024x1536",
          }),
        });
        if (!res.ok) return undefined;
        const data = await res.json();
        return data.image;
      } catch {
        return undefined;
      }
    };

    if (sb.type === "video") {
      // Generate scene1 images for both comps in parallel
      imagePromises.push(
        generateImage(sb.compA.scene1.image).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compA: { ...prev.compA, scene1: img },
          }));
        }),
        generateImage(sb.compB.scene1.image).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compB: { ...prev.compB, scene1: img },
          }));
        })
      );
    } else if (sb.type === "wall-of-text") {
      imagePromises.push(
        generateImage(sb.compA.backgroundImage).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compA: { ...prev.compA, background: img },
          }));
        }),
        generateImage(sb.compB.backgroundImage).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compB: { ...prev.compB, background: img },
          }));
        })
      );
    } else if (sb.type === "image") {
      imagePromises.push(
        generateImage(sb.compA.image).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compA: { ...prev.compA, single: img },
          }));
        }),
        generateImage(sb.compB.image).then((img) => {
          setCompImages((prev) => ({
            ...prev,
            compB: { ...prev.compB, single: img },
          }));
        })
      );
    }

    await Promise.all(imagePromises);
  };

  const getCompImage = (comp: "A" | "B"): string | undefined => {
    const images = comp === "A" ? compImages.compA : compImages.compB;
    if (!images) return undefined;
    return images.scene1 || images.background || images.single;
  };

  const getCompMood = (comp: "A" | "B"): string => {
    if (!storyboard) return "";
    const c = comp === "A" ? storyboard.compA : storyboard.compB;
    return c.mood;
  };

  const stylePreview = STYLE_PREVIEWS[style];

  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-amber-900/10 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-8 py-16">
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

        {!storyboard ? (
          <>
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
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
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
                  { value: "wall-of-text", label: "Wall of Text", icon: "≡" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value as Mode)}
                    className={`group flex-1 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200 ${
                      mode === opt.value
                        ? "bg-white text-black shadow-lg shadow-white/10"
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
                  Generating creative directions...
                </span>
              ) : (
                "Generate Comps"
              )}
            </button>
          </>
        ) : (
          <>
            {/* Comp Selection View */}
            <div className="mb-8">
              <button
                onClick={() => {
                  setStoryboard(null);
                  setCompImages({});
                  setSelectedComp(null);
                }}
                className="text-white/40 hover:text-white/60 text-sm flex items-center gap-2 transition-colors"
              >
                ← Back to setup
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Choose your direction</h2>
              <p className="text-white/40 text-sm">
                Topic: <span className="text-white/60">{topic}</span>
              </p>
            </div>

            {/* Narration Preview (for video/wall-of-text) */}
            {storyboard.type === "video" && (
              <div className="mb-8 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Shared Narration</div>
                <p className="text-white/70 text-sm italic">"{storyboard.narration.scene1}"</p>
                <p className="text-white/70 text-sm italic mt-2">"{storyboard.narration.scene2}"</p>
              </div>
            )}

            {storyboard.type === "wall-of-text" && (
              <div className="mb-8 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Script</div>
                <p className="text-white/70 text-sm italic whitespace-pre-wrap">"{storyboard.script}"</p>
              </div>
            )}

            {/* Comp Cards */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {(["A", "B"] as const).map((comp) => {
                const image = getCompImage(comp);
                const mood = getCompMood(comp);
                const isSelected = selectedComp === comp;

                return (
                  <div
                    key={comp}
                    onClick={() => setSelectedComp(comp)}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-[#09090b] scale-[1.02]"
                        : "hover:scale-[1.01] border border-white/[0.08]"
                    }`}
                  >
                    {/* Image or Placeholder */}
                    <div className="aspect-[9/16] relative bg-gradient-to-br from-white/5 to-white/[0.02]">
                      {image ? (
                        <img
                          src={`data:image/png;base64,${image}`}
                          alt={`Comp ${comp}`}
                          className="w-full h-full object-cover"
                        />
                      ) : generatingImages ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3" />
                            <div className="text-white/40 text-sm">Generating...</div>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white/20 text-sm">No image</div>
                        </div>
                      )}

                      {/* Comp Label */}
                      <div className="absolute top-3 left-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: isSelected ? stylePreview.accent : "rgba(255,255,255,0.1)",
                            color: isSelected && style !== "tech-dark" ? "black" : "white",
                          }}
                        >
                          {comp}
                        </span>
                      </div>

                      {/* Selected Checkmark */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <span className="text-black text-sm">✓</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className={`p-4 bg-gradient-to-br ${stylePreview.gradient}`}>
                      <div className="text-sm font-medium text-white/90 mb-1">Comp {comp}</div>
                      <div className="text-xs text-white/50">{mood}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                disabled={!selectedComp || generatingImages}
                className={`w-full py-4 rounded-2xl font-semibold text-base transition-all duration-300 ${
                  !selectedComp || generatingImages
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20"
                }`}
              >
                {generatingImages ? "Generating images..." : selectedComp ? `Generate ${mode === "image" ? "Final Image" : "Video"} with Comp ${selectedComp}` : "Select a comp to continue"}
              </button>

              <button
                className="w-full py-3 rounded-2xl font-medium text-sm bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-all"
              >
                Not quite right? Let's discuss...
              </button>
            </div>
          </>
        )}

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

        {/* Footer */}
        <footer className="mt-20 text-center">
          <p className="text-xs text-white/20">TryAir v2 • Powered by Claude & GPT Image</p>
        </footer>
      </div>
    </div>
  );
}
