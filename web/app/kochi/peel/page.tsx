"use client";

import { useState, useCallback, useRef } from "react";
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface LayerImage {
  url: string;
  width: number;
  height: number;
}

interface PeelResult {
  images: LayerImage[];
  seed: number;
  prompt: string;
}

type ProcessingState = "idle" | "processing" | "complete" | "error";

export default function PeelPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [numLayers, setNumLayers] = useState(4);
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PeelResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      if (!selectedFile.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Check for HEIC/HEIF (iPhone default format) - not supported
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith(".heic") || fileName.endsWith(".heif") || selectedFile.type.includes("heic") || selectedFile.type.includes("heif")) {
        setError("HEIC format not supported — try a JPG or PNG, or change iPhone settings to 'Most Compatible'");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("Image must be less than 10MB");
        return;
      }

      setError(null);
      setResult(null);
      setState("idle");

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }, []);

  const handlePeel = async () => {
    if (!preview) return;

    setState("processing");
    setError(null);

    try {
      const response = await fetch("/api/peel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: preview,
          num_layers: numLayers,
          prompt: prompt || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process image");
      }

      setResult(data);
      setState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setState("error");
    }
  };

  const downloadLayer = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `layer-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Failed to download layer");
    }
  };

  const downloadAll = async () => {
    if (!result) return;
    for (let i = 0; i < result.images.length; i++) {
      await downloadLayer(result.images[i].url, i);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const reset = () => {
    setPreview(null);
    setResult(null);
    setState("idle");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={`${bricolage.className} min-h-screen`}
      style={{
        background: "linear-gradient(180deg, #faf8f5 0%, #f5f0e8 100%)",
      }}
    >
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-20">
        {/* Header */}
        <header
          className="text-center mb-12 sm:mb-16"
          style={{ animation: "fadeUp 0.6s ease-out" }}
        >
          <h1
            className="text-6xl sm:text-8xl font-bold tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffcc02 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "0 4px 30px rgba(255,107,53,0.3)",
            }}
          >
            Peel
          </h1>
          <p
            className="mt-4 text-xl sm:text-2xl font-medium"
            style={{ color: "#555" }}
          >
            Unwrap the layers hiding in your image
          </p>
        </header>

        {/* Upload Zone */}
        {!result && (
          <div
            className="mb-8"
            style={{ animation: "fadeUp 0.6s ease-out 0.1s backwards" }}
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative cursor-pointer transition-all duration-300 hover:scale-[1.01]"
              style={{
                background: preview ? "transparent" : "#fff",
                borderRadius: "24px",
                border: preview ? "none" : "2px dashed #d4cfc5",
                minHeight: preview ? "auto" : "280px",
                boxShadow: preview ? "none" : "0 4px 24px rgba(0,0,0,0.04)",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {preview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full rounded-2xl"
                    style={{
                      maxHeight: "400px",
                      objectFit: "contain",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "#ffecd2" }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#e67e22"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p
                    className="text-lg font-medium"
                    style={{ color: "#1a1a1a" }}
                  >
                    Drop an image here
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "#999" }}>
                    PNG, JPG up to 10MB
                  </p>
                  <div
                    className="mt-4 px-6 py-3 rounded-xl font-semibold text-sm"
                    style={{
                      background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                      color: "#fff",
                    }}
                  >
                    Choose Image
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        {preview && !result && state !== "processing" && (
          <div
            className="flex flex-col gap-4 mb-8"
            style={{ animation: "fadeUp 0.4s ease-out" }}
          >
            {/* Prompt Input */}
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your image... does this do anything? only one way to find out 🤷"
              className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all focus:ring-2 focus:ring-orange-300"
              style={{
                background: "#fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                color: "#1a1a1a",
              }}
            />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Layer Slider */}
              <div
                className="flex items-center gap-4 px-6 py-4 rounded-2xl flex-1 w-full sm:w-auto"
                style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
              <label
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: "#666" }}
              >
                Layers
              </label>
              <input
                type="range"
                min={2}
                max={10}
                value={numLayers}
                onChange={(e) => setNumLayers(parseInt(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #e67e22 0%, #e67e22 ${((numLayers - 2) / 8) * 100}%, #e5e0d8 ${((numLayers - 2) / 8) * 100}%, #e5e0d8 100%)`,
                }}
              />
              <span
                className="text-2xl font-bold w-8 text-center"
                style={{ color: "#e67e22" }}
              >
                {numLayers}
              </span>
            </div>

            {/* Peel Button */}
              <button
                onClick={handlePeel}
                className="px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                style={{
                  background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(230, 126, 34, 0.4)",
                }}
              >
                Peel it!
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {state === "processing" && (
          <div
            className="text-center py-16"
            style={{ animation: "fadeUp 0.4s ease-out" }}
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: "3px solid transparent",
                    borderTopColor: "#e67e22",
                    animation: `spin 1s linear infinite`,
                    animationDelay: `${i * 0.15}s`,
                    opacity: 1 - i * 0.3,
                    transform: `scale(${1 - i * 0.15})`,
                  }}
                />
              ))}
            </div>
            <p className="text-xl font-medium" style={{ color: "#1a1a1a" }}>
              Peeling... 🍊
            </p>
            <p className="mt-2 text-sm" style={{ color: "#999" }}>
              Hang tight, magic in progress
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            className="mb-8 px-6 py-4 rounded-2xl text-center"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              animation: "shake 0.4s ease-out",
            }}
          >
            {error}
          </div>
        )}

        {/* Results Grid */}
        {result && (
          <div style={{ animation: "fadeUp 0.6s ease-out" }}>
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-2xl font-bold"
                style={{ color: "#1a1a1a" }}
              >
                {result.images.length} layers peeled! ✨
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={downloadAll}
                  className="px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e0d8",
                    color: "#666",
                  }}
                >
                  Download All
                </button>
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-xl font-medium text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                    color: "#fff",
                  }}
                >
                  New Image
                </button>
              </div>
            </div>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              }}
            >
              {result.images.map((layer, index) => (
                <div
                  key={index}
                  className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: "repeating-conic-gradient(#e5e0d8 0% 25%, #fff 0% 50%) 50% / 16px 16px",
                    aspectRatio: "1",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    animation: `fadeUp 0.4s ease-out ${index * 0.08}s backwards`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={layer.url}
                    alt={`Layer ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-contain"
                  />

                  {/* Layer badge */}
                  <div
                    className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      color: "#1a1a1a",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    Layer {index + 1}
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => downloadLayer(layer.url, index)}
                    className="absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                    style={{
                      background: "rgba(0,0,0,0.7)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-16 text-center text-sm"
          style={{ color: "#999" }}
        >
          <p>
            Powered by{" "}
            <a
              href="https://kochi.to"
              className="underline hover:no-underline"
              style={{ color: "#e67e22" }}
            >
              Kochi.to
            </a>
          </p>
          <p className="mt-3">
            Experiment — wanna lend a hand?{" "}
            <a
              href="https://discord.gg/659eJPUcjg"
              className="underline hover:no-underline"
              style={{ color: "#e67e22" }}
            >
              Hop on the Discord
            </a>
          </p>
        </footer>
      </div>

      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #e67e22;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #e67e22;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
