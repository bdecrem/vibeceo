"use client";

import { useState, useCallback } from "react";

type Mode = "image" | "video" | "wall-of-text" | "talking-head";
type Style = "illuminated-wellness" | "paper-cut-wellness" | "tech-dark";
type ImageModel = "flux-dev" | "flux-max" | "gpt-image-1.5" | "recraft-v3" | "nano-banana";

const IMAGE_MODELS: Record<ImageModel, { label: string; desc: string; icon: string }> = {
  "flux-dev": { label: "FLUX Dev", desc: "Fast quality", icon: "⚡" },
  "flux-max": { label: "FLUX Max", desc: "Best quality", icon: "★" },
  "gpt-image-1.5": { label: "GPT-Image", desc: "Sharp details", icon: "✦" },
  "recraft-v3": { label: "Recraft", desc: "Design focus", icon: "◉" },
  "nano-banana": { label: "Banana", desc: "Fastest", icon: "🍌" },
};

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

interface GeneratedComp {
  id: string;
  mood: string;
  imageDescription: string;
  image?: string;
}

const STYLE_PREVIEWS: Record<Style, { gradient: string; accent: string }> = {
  "illuminated-wellness": { gradient: "from-[#1A1A3E] to-[#2d2d5a]", accent: "#D4A84B" },
  "paper-cut-wellness": { gradient: "from-[#1a4a4a] to-[#2A7B8C]", accent: "#F5F5F0" },
  "tech-dark": { gradient: "from-[#0a0a12] to-[#1a1a2e]", accent: "#8B5CF6" },
};

const STYLE_PROMPTS: Record<Style, string> = {
  "illuminated-wellness": `Style: Professional advertising photography with cinematic lighting.
Color palette: Deep navy blue (#1A1A3E) as primary background, rich gold (#D4A84B) accents, warm cream (#F5E6C8) highlights.
Lighting: Soft, diffused golden hour warmth with subtle rim lighting creating depth.
Mood: Luxurious, elegant, sophisticated wellness aesthetic.
Technical: Sharp focus on subject, shallow depth of field for background, natural skin tones if people present.`,

  "paper-cut-wellness": `Style: Editorial photography with soft, natural lighting reminiscent of high-end wellness magazines.
Color palette: Teal (#2A7B8C) and sage green tones, warm cream (#F5F5F0), soft white accents.
Lighting: Soft diffused daylight, minimal shadows, airy and bright atmosphere.
Mood: Minimal, clean, calming, Scandinavian-inspired wellness aesthetic.
Technical: Even exposure, muted tones, gentle gradients, organic textures.`,

  "tech-dark": `Style: Cinematic still photography with dramatic studio lighting.
Color palette: Deep blacks (#0a0a12), electric purple (#8B5CF6) glows, cyan (#06B6D4) accents.
Lighting: Dramatic side lighting with neon rim lights, high contrast, moody atmosphere.
Mood: Futuristic, sleek, premium tech aesthetic, cyberpunk influence.
Technical: Sharp details, reflective surfaces, subtle lens flares, deep shadows.`,
};

export default function InspirationPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("video");
  const [style, setStyle] = useState<Style>("illuminated-wellness");
  const [imageModel, setImageModel] = useState<ImageModel>("flux-dev");

  // Text styling
  const [textStyle, setTextStyle] = useState({
    fontFamily: "Arial" as "Arial" | "Georgia" | "Montserrat" | "Impact",
    color: "#FFFFFF",
    shadowStyle: "subtle" as "none" | "subtle" | "bold",
    size: "medium" as "small" | "medium" | "large",
  });

  // Animation settings
  const [animationSettings, setAnimationSettings] = useState({
    type: "ken-burns" as "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "ken-burns" | "static",
    speed: "medium" as "slow" | "medium" | "fast",
    focusPoint: "center" as "upper" | "center" | "lower",
  });

  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState("");
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [comps, setComps] = useState<GeneratedComp[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Talking head state
  const [speakerImage, setSpeakerImage] = useState<string | null>(null);
  const [speakerImageFile, setSpeakerImageFile] = useState<File | null>(null);
  const [talkingHeadProgress, setTalkingHeadProgress] = useState("");
  const [talkingHeadVideo, setTalkingHeadVideo] = useState<string | null>(null);

  // Agent state
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
  const [lastErrorAction, setLastErrorAction] = useState<string | null>(null);

  // User-friendly error messages
  const getErrorMessage = (error: string, action: string): { title: string; description: string } => {
    if (error.includes("ANTHROPIC_API_KEY")) {
      return { title: "API not configured", description: "The storyboard service is not set up. Please contact support." };
    }
    if (error.includes("OPENAI_API_KEY") || error.includes("gpt-image")) {
      return { title: "Image service unavailable", description: "Unable to generate images right now. Please try again later." };
    }
    if (error.includes("HUME_API_KEY") || error.includes("audio")) {
      return { title: "Voice service unavailable", description: "Unable to generate voiceover. Please try again later." };
    }
    if (error.includes("FFmpeg") || error.includes("video")) {
      return { title: "Video rendering failed", description: "There was a problem creating your video. Please try again." };
    }
    if (error.includes("fetch") || error.includes("network")) {
      return { title: "Connection problem", description: "Check your internet connection and try again." };
    }
    return { title: `${action} failed`, description: error || "Something unexpected happened. Please try again." };
  };

  const handleRetry = useCallback(() => {
    setError(null);
    if (lastErrorAction === "generate") {
      handleGenerate();
    } else if (lastErrorAction === "video") {
      handleGenerateVideo();
    } else if (lastErrorAction === "agent") {
      handleAgentFeedback();
    }
  }, [lastErrorAction]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setStoryboard(null);
    setComps([]);
    setSelectedCompId(null);
    setGeneratedVideo(null);
    setAgentReasoning(null);

    try {
      const res = await fetch("/inspiration/api/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, mode, style }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setStoryboard(data.storyboard);

      // Extract comps from storyboard
      const initialComps: GeneratedComp[] = [];
      if (data.storyboard.type === "video") {
        initialComps.push(
          { id: "A", mood: data.storyboard.compA.mood, imageDescription: data.storyboard.compA.scene1.image },
          { id: "B", mood: data.storyboard.compB.mood, imageDescription: data.storyboard.compB.scene1.image }
        );
      } else if (data.storyboard.type === "wall-of-text") {
        initialComps.push(
          { id: "A", mood: data.storyboard.compA.mood, imageDescription: data.storyboard.compA.backgroundImage },
          { id: "B", mood: data.storyboard.compB.mood, imageDescription: data.storyboard.compB.backgroundImage }
        );
      } else {
        initialComps.push(
          { id: "A", mood: data.storyboard.compA.mood, imageDescription: data.storyboard.compA.image },
          { id: "B", mood: data.storyboard.compB.mood, imageDescription: data.storyboard.compB.image }
        );
      }

      setComps(initialComps);
      setLoading(false);

      // Generate images
      setGeneratingImages(true);
      await generateCompImages(initialComps);
      setGeneratingImages(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLastErrorAction("generate");
      setLoading(false);
      setGeneratingImages(false);
    }
  };

  const generateCompImages = async (compsToGenerate: GeneratedComp[]) => {
    const stylePrompt = STYLE_PROMPTS[style];

    await Promise.all(
      compsToGenerate.map(async (comp) => {
        if (comp.image) return; // Already has image

        try {
          const res = await fetch("/inspiration/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: `${comp.imageDescription}\n\n${stylePrompt}\n\nIMPORTANT: Generate an image with NO TEXT, NO WORDS, NO LABELS.`,
              size: mode === "image" ? "1024x1024" : "1024x1536",
              model: imageModel,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setComps((prev) =>
              prev.map((c) => (c.id === comp.id ? { ...c, image: data.image } : c))
            );
          }
        } catch {}
      })
    );
  };

  const handleAgentFeedback = async () => {
    if (!agentFeedback.trim() || !storyboard) return;

    setAgentLoading(true);
    setError(null);

    try {
      // Get current A and B comps
      const compA = comps.find((c) => c.id === "A");
      const compB = comps.find((c) => c.id === "B");

      const res = await fetch("/inspiration/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          mode,
          feedback: agentFeedback,
          currentComps: {
            compA: { mood: compA?.mood || "", imageDescription: compA?.imageDescription || "" },
            compB: { mood: compB?.mood || "", imageDescription: compB?.imageDescription || "" },
          },
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      setAgentReasoning(data.reasoning);

      // Add new comps (C, D, E, F, etc.)
      const existingIds = comps.map((c) => c.id);
      const nextId = (id: string) => {
        const code = id.charCodeAt(0);
        return String.fromCharCode(code + 1);
      };

      let newId = "C";
      while (existingIds.includes(newId)) {
        newId = nextId(newId);
      }

      const newComps: GeneratedComp[] = [
        { id: newId, mood: data.compC.mood, imageDescription: data.compC.imageDescription },
        { id: nextId(newId), mood: data.compD.mood, imageDescription: data.compD.imageDescription },
      ];

      setComps((prev) => [...prev, ...newComps]);
      setAgentFeedback("");
      setShowAgentChat(false);

      // Generate images for new comps
      setGeneratingImages(true);
      await generateCompImages(newComps);
      setGeneratingImages(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent failed");
      setLastErrorAction("agent");
    } finally {
      setAgentLoading(false);
    }
  };

  const handleGenerateTalkingHead = async () => {
    if (!topic.trim() || !speakerImage) return;

    setLoading(true);
    setError(null);
    setTalkingHeadProgress("Analyzing image...");
    setTalkingHeadVideo(null);

    try {
      // Extract base64 data from data URL
      const base64Data = speakerImage.split(",")[1];

      const res = await fetch("/inspiration/api/talking-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          imageBase64: base64Data,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to generate talking head");
      }

      // Stream progress updates
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let result = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          result += chunk;

          // Parse SSE events
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.progress) {
                  setTalkingHeadProgress(data.progress);
                }
                if (data.videoUrl) {
                  setTalkingHeadVideo(data.videoUrl);
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for partial data
              }
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Talking head generation failed");
      setLastErrorAction("talking-head");
    } finally {
      setLoading(false);
      setTalkingHeadProgress("");
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedCompId || !storyboard) return;

    setGeneratingVideo(true);
    setVideoProgress("Preparing...");
    setError(null);

    try {
      const selectedComp = comps.find((c) => c.id === selectedCompId);
      if (!selectedComp?.image) throw new Error("No image for selected comp");

      // Get narration text
      let narrationText = "";
      if (storyboard.type === "video") {
        narrationText = `${storyboard.narration.scene1} ${storyboard.narration.scene2}`;
      } else if (storyboard.type === "wall-of-text") {
        narrationText = storyboard.script;
      } else {
        // Image mode - just download
        downloadBase64File(selectedComp.image, "inspiration-image.png", "image/png");
        setGeneratingVideo(false);
        return;
      }

      // Generate audio
      setVideoProgress("Generating voiceover...");
      const audioRes = await fetch("/inspiration/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: narrationText,
          description: "Warm, engaging, conversational podcast host style",
        }),
      });

      if (!audioRes.ok) throw new Error("Failed to generate audio");
      const audioData = await audioRes.json();

      // Get images
      let allImages: string[] = [];

      if (storyboard.type === "video") {
        // Generate scene 2 image
        setVideoProgress("Generating scene 2 image...");

        // Find original comp from storyboard
        const isCompA = selectedCompId === "A";
        const videoComp = isCompA ? storyboard.compA : storyboard.compB;

        const scene2Res = await fetch("/inspiration/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${videoComp.scene2.image}\n\n${STYLE_PROMPTS[style]}\n\nIMPORTANT: Generate an image with NO TEXT, NO WORDS, NO LABELS.`,
            size: "1024x1536",
            model: imageModel,
          }),
        });

        if (!scene2Res.ok) throw new Error("Failed to generate scene 2 image");
        const scene2Data = await scene2Res.json();
        allImages = [selectedComp.image, scene2Data.image];
      } else {
        allImages = [selectedComp.image];
      }

      // Generate video
      setVideoProgress("Rendering video...");

      const getOverlays = () => {
        if (storyboard.type !== "video") return undefined;
        const isCompA = selectedCompId === "A";
        const videoComp = isCompA ? storyboard.compA : storyboard.compB;
        return [videoComp.scene1.overlay, videoComp.scene2.overlay];
      };

      const videoRes = await fetch("/inspiration/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: storyboard.type,
          images: allImages,
          audio: audioData.audio,
          script: storyboard.type === "wall-of-text" ? storyboard.script : undefined,
          overlays: getOverlays(),
          textStyle,
          animation: animationSettings,
        }),
      });

      if (!videoRes.ok) {
        const errorText = await videoRes.text();
        throw new Error(`Failed to generate video: ${errorText}`);
      }

      const videoData = await videoRes.json();
      setGeneratedVideo(videoData.video);
      setVideoProgress("");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Video generation failed");
      setLastErrorAction("video");
      setVideoProgress("");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const downloadBase64File = (base64: string, filename: string, mimeType: string) => {
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stylePreview = STYLE_PREVIEWS[style];
  const selectedComp = comps.find((c) => c.id === selectedCompId);

  return (
    <div className="min-h-screen bg-[#09090b] text-white antialiased">
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-amber-900/10 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-16">
        <header className="mb-8 sm:mb-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black text-lg">✦</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Inspiration</h1>
          </div>
          <p className="text-white/40 text-sm ml-11">Create stunning video ads with AI</p>
        </header>

        {/* Video Result */}
        {generatedVideo ? (
          <div className="space-y-4 sm:space-y-6">
            <button onClick={() => setGeneratedVideo(null)} className="text-white/40 hover:text-white/60 text-sm">← Back to comps</button>
            <h2 className="text-lg sm:text-xl font-semibold">Your video is ready!</h2>
            <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-black">
              <video
                controls
                className="w-full"
                src={`data:video/mp4;base64,${generatedVideo}`}
                playsInline
                preload="metadata"
              />
            </div>
            <button
              onClick={() => downloadBase64File(generatedVideo, "inspiration-video.mp4", "video/mp4")}
              className="w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base bg-gradient-to-r from-amber-500 to-orange-500 text-black"
            >
              Download Video
            </button>
          </div>
        ) : !storyboard ? (
          <>
            {/* Initial Form */}
            <section className="mb-8 sm:mb-12">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2 sm:mb-3">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="how acai bowls became all the rage"
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/[0.03] border border-white/[0.08] rounded-xl sm:rounded-2xl text-base sm:text-lg text-white placeholder-white/25 focus:outline-none focus:border-white/20"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </section>

            <section className="mb-8 sm:mb-12">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3 sm:mb-4">Format</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { value: "image", label: "Single Image", icon: "◻" },
                  { value: "video", label: "Video", icon: "▶" },
                  { value: "wall-of-text", label: "Wall of Text", icon: "≡" },
                  { value: "talking-head", label: "Talking Head", icon: "🗣" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value as Mode)}
                    className={`group px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm font-medium transition-all flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0 ${
                      mode === opt.value ? "bg-white text-black" : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className={`text-lg sm:mb-1 ${mode === opt.value ? "opacity-100" : "opacity-50"}`}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Speaker Photo Upload (Talking Head only) */}
            {mode === "talking-head" && (
              <section className="mb-8 sm:mb-12">
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3 sm:mb-4">Speaker Photo</label>
                <div
                  className={`relative border-2 border-dashed rounded-xl sm:rounded-2xl transition-all ${
                    speakerImage ? "border-amber-500/50 bg-amber-500/5" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSpeakerImageFile(file);
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setSpeakerImage(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {speakerImage ? (
                    <div className="p-4 flex items-center gap-4">
                      <img src={speakerImage} alt="Speaker" className="w-20 h-20 object-cover rounded-lg" />
                      <div className="flex-1">
                        <p className="text-white/80 text-sm font-medium">{speakerImageFile?.name}</p>
                        <p className="text-white/40 text-xs mt-1">Click to change photo</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpeakerImage(null);
                          setSpeakerImageFile(null);
                        }}
                        className="text-white/40 hover:text-white/60 p-2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="text-3xl mb-2 opacity-50">📷</div>
                      <p className="text-white/50 text-sm">Upload a photo of the speaker</p>
                      <p className="text-white/30 text-xs mt-1">Face should be clearly visible</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Visual Style (not for talking-head) */}
            {mode !== "talking-head" && (
            <section className="mb-10 sm:mb-14">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3 sm:mb-4">Visual Style</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { value: "illuminated-wellness", label: "Illuminated", desc: "Navy & gold elegance", colors: ["#1A1A3E", "#D4A84B", "#F5F0DC"] },
                  { value: "paper-cut-wellness", label: "Paper Cut", desc: "Teal & cream minimal", colors: ["#2A7B8C", "#F5F5F0", "#ffffff"] },
                  { value: "tech-dark", label: "Tech Dark", desc: "Purple & cyan glow", colors: ["#0a0a12", "#8B5CF6", "#06B6D4"] },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value as Style)}
                    className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all ${style === opt.value ? "ring-2 ring-white/30 ring-offset-2 ring-offset-[#09090b]" : "hover:scale-[1.02]"}`}
                  >
                    <div className="h-16 sm:h-24 relative overflow-hidden">
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${opt.colors[0]} 0%, ${opt.colors[0]} 60%, ${opt.colors[1]} 100%)` }} />
                      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 w-6 sm:w-8 h-6 sm:h-8 rounded-full opacity-80" style={{ backgroundColor: opt.colors[1] }} />
                    </div>
                    <div className={`px-3 sm:px-4 py-2 sm:py-3 text-left ${style === opt.value ? "bg-white/10" : "bg-white/[0.03]"}`}>
                      <div className="text-sm font-medium text-white/90">{opt.label}</div>
                      <div className="text-xs text-white/40">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            )}

            {/* Image Model Selector (not for talking-head) */}
            {mode !== "talking-head" && (
            <section className="mb-10 sm:mb-14">
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-3 sm:mb-4">Image Model</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                {(Object.entries(IMAGE_MODELS) as [ImageModel, { label: string; desc: string; icon: string }][]).map(([value, opt]) => (
                  <button
                    key={value}
                    onClick={() => setImageModel(value)}
                    className={`group px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                      imageModel === value
                        ? "bg-white text-black"
                        : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className={`text-base sm:text-lg ${imageModel === value ? "opacity-100" : "opacity-50"}`}>{opt.icon}</span>
                    <span className="font-medium">{opt.label}</span>
                    <span className={`text-[10px] sm:text-xs ${imageModel === value ? "text-black/60" : "text-white/40"}`}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </section>
            )}

            {/* Generate Button */}
            {mode === "talking-head" ? (
              <button
                onClick={handleGenerateTalkingHead}
                disabled={!topic.trim() || !speakerImage || loading}
                className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base ${
                  !topic.trim() || !speakerImage || loading ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-gradient-to-r from-amber-500 to-orange-500 text-black"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                    {talkingHeadProgress || "Generating..."}
                  </span>
                ) : "Generate Talking Head"}
              </button>
            ) : (
            <button
              onClick={handleGenerate}
              disabled={!topic.trim() || loading}
              className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base ${
                !topic.trim() || loading ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-gradient-to-r from-amber-500 to-orange-500 text-black"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                  Generating...
                </span>
              ) : "Generate Comps"}
            </button>
            )}
          </>
        ) : talkingHeadVideo ? (
          /* Talking Head Result */
          <div className="space-y-4 sm:space-y-6">
            <button onClick={() => { setTalkingHeadVideo(null); setSpeakerImage(null); setSpeakerImageFile(null); }} className="text-white/40 hover:text-white/60 text-sm">← Create another</button>
            <h2 className="text-lg sm:text-xl font-semibold">Your talking head video is ready!</h2>
            <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-black">
              <video
                controls
                className="w-full"
                src={talkingHeadVideo}
                playsInline
                preload="metadata"
              />
            </div>
            <a
              href={talkingHeadVideo}
              download="talking-head.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base bg-gradient-to-r from-amber-500 to-orange-500 text-black text-center"
            >
              Download Video
            </a>
          </div>
        ) : (
          <>
            {/* Comp Selection */}
            <div className="mb-8">
              <button onClick={() => { setStoryboard(null); setComps([]); setSelectedCompId(null); }} className="text-white/40 hover:text-white/60 text-sm">← Back to setup</button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Choose your direction</h2>
              <p className="text-white/40 text-sm">Topic: <span className="text-white/60">{topic}</span></p>
            </div>

            {/* Agent Reasoning */}
            {agentReasoning && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-2">Agent's reasoning</div>
                <p className="text-amber-100/80 text-sm">{agentReasoning}</p>
              </div>
            )}

            {/* Narration Preview */}
            {storyboard.type === "video" && (
              <div className="mb-6 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Shared Narration</div>
                <p className="text-white/70 text-sm italic">"{storyboard.narration.scene1}"</p>
                <p className="text-white/70 text-sm italic mt-2">"{storyboard.narration.scene2}"</p>
              </div>
            )}

            {storyboard.type === "wall-of-text" && (
              <div className="mb-6 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] max-h-32 overflow-y-auto">
                <div className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Script</div>
                <p className="text-white/70 text-sm italic whitespace-pre-wrap">"{storyboard.script}"</p>
              </div>
            )}

            {/* Comp Grid */}
            <div className={`grid gap-3 sm:gap-4 mb-6 sm:mb-8 ${comps.length <= 2 ? "grid-cols-2" : comps.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
              {comps.map((comp) => {
                const isSelected = selectedCompId === comp.id;
                return (
                  <div
                    key={comp.id}
                    onClick={() => setSelectedCompId(comp.id)}
                    className={`relative rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-[#09090b] scale-[1.02]" : "hover:scale-[1.01] border border-white/[0.08]"
                    }`}
                  >
                    <div className="aspect-[9/16] relative bg-gradient-to-br from-white/5 to-white/[0.02]">
                      {comp.image ? (
                        <img src={`data:image/png;base64,${comp.image}`} alt={`Comp ${comp.id}`} className="w-full h-full object-cover" />
                      ) : generatingImages ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          {/* Skeleton loading animation */}
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                          <span className="text-white/30 text-xs">Generating...</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">No image</div>
                      )}

                      <div className="absolute top-2 left-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isSelected ? "bg-amber-500 text-black" : "bg-white/10 text-white"}`}>
                          {comp.id}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs">✓</span>
                        </div>
                      )}
                    </div>

                    <div className={`p-2 sm:p-3 bg-gradient-to-br ${stylePreview.gradient}`}>
                      <div className="text-xs font-medium text-white/90">Comp {comp.id}</div>
                      <div className="text-xs text-white/50 truncate">{comp.mood}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Customization Panel - shown when comp selected */}
            {selectedCompId && (
              <div className="mb-6 p-4 sm:p-5 bg-white/[0.02] rounded-xl sm:rounded-2xl border border-white/[0.06]">
                <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-4">Customize Your Video</div>

                {/* Text Style Section */}
                <div className="mb-5">
                  <div className="text-xs text-white/40 mb-2">Text Style</div>

                  {/* Font */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {(["Arial", "Georgia", "Montserrat", "Impact"] as const).map((font) => (
                      <button
                        key={font}
                        onClick={() => setTextStyle(s => ({ ...s, fontFamily: font }))}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                          textStyle.fontFamily === font
                            ? "bg-white text-black"
                            : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                        }`}
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>

                  {/* Color */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setTextStyle(s => ({ ...s, color: "#FFFFFF" }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                        textStyle.color === "#FFFFFF"
                          ? "bg-white text-black"
                          : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-white border border-black/20"></span> White
                    </button>
                    <button
                      onClick={() => setTextStyle(s => ({ ...s, color: "#000000" }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                        textStyle.color === "#000000"
                          ? "bg-white text-black"
                          : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-black border border-white/30"></span> Black
                    </button>
                    <input
                      type="color"
                      value={textStyle.color}
                      onChange={(e) => setTextStyle(s => ({ ...s, color: e.target.value }))}
                      className="w-10 h-9 rounded-lg cursor-pointer bg-transparent"
                      title="Custom color"
                    />
                  </div>

                  {/* Shadow */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {([
                      { value: "none", label: "No Shadow" },
                      { value: "subtle", label: "Subtle" },
                      { value: "bold", label: "Bold" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTextStyle(s => ({ ...s, shadowStyle: opt.value }))}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          textStyle.shadowStyle === opt.value
                            ? "bg-white text-black"
                            : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "small", label: "Small" },
                      { value: "medium", label: "Medium" },
                      { value: "large", label: "Large" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTextStyle(s => ({ ...s, size: opt.value }))}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          textStyle.size === opt.value
                            ? "bg-white text-black"
                            : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Section */}
                {mode !== "image" && (
                  <div>
                    <div className="text-xs text-white/40 mb-2">Animation</div>

                    {/* Type */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                      {([
                        { value: "zoom-in", label: "Zoom In", icon: "↗" },
                        { value: "zoom-out", label: "Zoom Out", icon: "↙" },
                        { value: "pan-left", label: "Pan Left", icon: "←" },
                        { value: "pan-right", label: "Pan Right", icon: "→" },
                        { value: "ken-burns", label: "Ken Burns", icon: "✦" },
                        { value: "static", label: "Static", icon: "◻" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAnimationSettings(s => ({ ...s, type: opt.value }))}
                          className={`py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                            animationSettings.type === opt.value
                              ? "bg-white text-black"
                              : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <span className="hidden sm:inline">{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Speed */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {([
                        { value: "slow", label: "Slow" },
                        { value: "medium", label: "Medium" },
                        { value: "fast", label: "Fast" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAnimationSettings(s => ({ ...s, speed: opt.value }))}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${
                            animationSettings.speed === opt.value
                              ? "bg-white text-black"
                              : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Focus Point */}
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: "upper", label: "Upper" },
                        { value: "center", label: "Center" },
                        { value: "lower", label: "Lower" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAnimationSettings(s => ({ ...s, focusPoint: opt.value }))}
                          className={`py-2 rounded-lg text-xs font-medium transition-all ${
                            animationSettings.focusPoint === opt.value
                              ? "bg-white text-black"
                              : "bg-white/[0.03] text-white/60 border border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Video Progress Indicator */}
              {generatingVideo && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-amber-200 text-sm font-medium">{videoProgress || "Processing..."}</div>
                      <div className="text-amber-200/50 text-xs mt-0.5">This may take a minute</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleGenerateVideo}
                disabled={!selectedCompId || generatingImages || generatingVideo}
                className={`w-full py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base ${
                  !selectedCompId || generatingImages || generatingVideo
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-black"
                }`}
              >
                {generatingVideo ? "Generating..." : generatingImages ? "Generating images..." : selectedCompId ? `Generate ${mode === "image" ? "Final Image" : "Video"} with Comp ${selectedCompId}` : "Select a comp"}
              </button>

              <button
                onClick={() => setShowAgentChat(true)}
                disabled={generatingImages || generatingVideo}
                className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-sm bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Not quite right? Let's discuss...
              </button>
            </div>

            {/* Agent Chat Modal */}
            {showAgentChat && (
              <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-[#0f0f13] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-lg border-t sm:border border-white/10 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">What would you like to change?</h3>
                    <button
                      onClick={() => { setShowAgentChat(false); setAgentFeedback(""); }}
                      className="text-white/40 hover:text-white/60 text-xl sm:hidden"
                    >
                      x
                    </button>
                  </div>
                  <p className="text-white/50 text-sm mb-4">Describe what you like, don't like, or want to see differently. I'll generate new directions based on your feedback.</p>

                  <textarea
                    value={agentFeedback}
                    onChange={(e) => setAgentFeedback(e.target.value)}
                    placeholder="I like the warm feeling of A but want it to feel more premium and exclusive..."
                    className="w-full h-28 sm:h-32 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
                    autoFocus
                  />

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setShowAgentChat(false); setAgentFeedback(""); }}
                      className="flex-1 py-3 rounded-xl font-medium text-sm bg-white/[0.03] text-white/50 border border-white/[0.06] hidden sm:block"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAgentFeedback}
                      disabled={!agentFeedback.trim() || agentLoading}
                      className={`flex-1 sm:flex-1 w-full sm:w-auto py-3 rounded-xl font-medium text-sm ${
                        !agentFeedback.trim() || agentLoading
                          ? "bg-white/5 text-white/20 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 text-black"
                      }`}
                    >
                      {agentLoading ? "Thinking..." : "Generate New Comps"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (() => {
          const { title, description } = getErrorMessage(error, lastErrorAction || "Operation");
          return (
            <div className="mt-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
                <div className="flex-1">
                  <div className="text-red-400 font-medium text-sm">{title}</div>
                  <div className="text-red-400/70 text-sm mt-1">{description}</div>
                  <button
                    onClick={handleRetry}
                    className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    Try again
                  </button>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400/50 hover:text-red-400 text-lg flex-shrink-0"
                >
                  x
                </button>
              </div>
            </div>
          );
        })()}

        <footer className="mt-20 text-center">
          <p className="text-xs text-white/20">TryAir v2 • Powered by Claude, FLUX, GPT Image & fal.ai</p>
        </footer>
      </div>
    </div>
  );
}
