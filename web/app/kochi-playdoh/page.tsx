"use client";

import { useEffect, useRef, useState } from "react";

const containerClasses =
  "min-h-screen bg-[#fffef7] text-[#2c3e1f] flex flex-col items-center justify-center gap-10 px-4 py-12";
const cardClasses =
  "w-full max-w-3xl bg-white shadow-xl rounded-3xl px-6 sm:px-10 py-10 flex flex-col items-center gap-8 border border-[#ffe9a3]";

type GsapBundle = {
  gsap: typeof import("gsap");
  MorphSVGPlugin: typeof import("gsap/MorphSVGPlugin");
};

export default function KochiPlaydohLab() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const libsRef = useRef<GsapBundle | null>(null);
  const timelineRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [{ gsap }, { MorphSVGPlugin }] = await Promise.all([
          import("gsap"),
          import("gsap/MorphSVGPlugin")
        ]);

        if (!mounted) return;

        gsap.registerPlugin(MorphSVGPlugin);
        libsRef.current = { gsap, MorphSVGPlugin };
        setStatus("ready");
      } catch (error) {
        console.error("Failed to load GSAP or MorphSVGPlugin", error);
        if (mounted) {
          setStatus("error");
        }
      }
    })();

    return () => {
      mounted = false;
      timelineRef.current?.kill();
      timelineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !svgRef.current || !libsRef.current) {
      return;
    }

    const { gsap, MorphSVGPlugin } = libsRef.current;
    const svg = svgRef.current;

    const group = svg.querySelector<SVGGElement>("#kochi");
    const body = svg.querySelector<SVGPathElement>("#body");
    const face = svg.querySelector<SVGPathElement>("#face");
    const eyeL = svg.querySelector<SVGPathElement>("#eyeL");
    const eyeR = svg.querySelector<SVGPathElement>("#eyeR");

    if (!group || !body || !face || !eyeL || !eyeR) {
      console.warn("Missing Kochi nodes for MorphSVG demo.");
      return;
    }

    const eyes = [eyeL, eyeR];
    gsap.set([face, ...eyes], { transformOrigin: "50% 50%" });
    gsap.set(group, { transformOrigin: "50% 70%" });

    const bbox = body.getBBox();
    const neutralRaw = MorphSVGPlugin.getRawPath(body);
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    const normalizeSegment = (segment: any): Array<[number, number]> => {
      if (!segment) return [];
      if (Array.isArray(segment[0])) {
        return (segment as Array<[number, number]>).map(([px, py]) => [px, py]);
      }
      const flat = Array.from(segment as ArrayLike<number>);
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i < flat.length; i += 2) {
        const px = flat[i];
        const py = flat[i + 1];
        if (typeof px === "number" && typeof py === "number") {
          pairs.push([px, py]);
        }
      }
      return pairs;
    };

    const neutralSegments = neutralRaw.map(normalizeSegment);

    type DeformConfig = {
      scaleX?: number;
      scaleY?: number;
      bottomBoost?: number;
      topPinch?: number;
      waveAmp?: number;
      waveFreq?: number;
      lean?: number;
      lift?: number;
    };

    const deformPoint = (px: number, py: number, config: DeformConfig): [number, number] => {
      const {
        scaleX = 1,
        scaleY = 1,
        bottomBoost = 0,
        topPinch = 0,
        waveAmp = 0,
        waveFreq = 2,
        lean = 0,
        lift = 0
      } = config;

      const normY = (py - bbox.y) / bbox.height;
      const normX = (px - bbox.x) / bbox.width - 0.5;
      const bottomInfluence = normY;
      const topInfluence = 1 - normY;

      const localScaleX = scaleX + bottomBoost * bottomInfluence - topPinch * topInfluence;
      const localScaleY = scaleY - bottomBoost * 0.25 * bottomInfluence + topPinch * 0.35 * topInfluence;
      const wave =
        waveAmp *
        Math.sin(normY * Math.PI * waveFreq + normX * Math.PI * 0.35) *
        (1 - Math.min(1, Math.abs(normX) * 1.35));

      const leanOffset = lean * (normY - 0.5);

      const nx = centerX + (px - centerX) * localScaleX + wave;
      const ny = centerY + (py - centerY) * localScaleY + leanOffset * bbox.height + lift;

      return [nx, ny];
    };

    const createShape = (config: DeformConfig): string =>
      MorphSVGPlugin.rawPathToString(
        neutralSegments.map((segment) =>
          segment.map(([px, py]) => deformPoint(px, py, config))
        )
      );

    const shapes = {
      neutral: MorphSVGPlugin.rawPathToString(neutralRaw),
      squash: createShape({
        scaleX: 1.24,
        scaleY: 0.74,
        bottomBoost: 0.62,
        topPinch: 0.18,
        waveAmp: 14,
        waveFreq: 2.6,
        lift: 10
      }),
      stretch: createShape({
        scaleX: 0.88,
        scaleY: 1.32,
        bottomBoost: -0.22,
        topPinch: 0.48,
        waveAmp: 6,
        waveFreq: 1.4,
        lift: -24
      }),
      puddle: createShape({
        scaleX: 1.36,
        scaleY: 0.58,
        bottomBoost: 0.72,
        topPinch: -0.06,
        waveAmp: 18,
        waveFreq: 2.8,
        lift: 18
      }),
      wobble: createShape({
        scaleX: 1.05,
        scaleY: 0.94,
        bottomBoost: 0.18,
        topPinch: 0.08,
        waveAmp: 10,
        waveFreq: 3.2,
        lean: 0.1
      }),
      squiggle: createShape({
        scaleX: 1.08,
        scaleY: 0.9,
        bottomBoost: 0.32,
        topPinch: -0.12,
        waveAmp: 26,
        waveFreq: 4.6,
        lean: 0.2,
        lift: 6
      }),
      settle: createShape({
        scaleX: 1.06,
        scaleY: 0.96,
        bottomBoost: 0.22,
        topPinch: 0.12,
        waveAmp: 6,
        waveFreq: 3.2
      })
    };

    gsap.set(body, { morphSVG: shapes.neutral });

    timelineRef.current?.kill();
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
    timelineRef.current = tl;

    tl.addLabel("anticipate");
    tl.to(
      body,
      { duration: 0.32, morphSVG: shapes.squash, ease: "power3.in" },
      "anticipate"
    );
    tl.to(
      group,
      { y: 42, scaleX: 1.18, scaleY: 0.8, duration: 0.32, ease: "power3.in" },
      "anticipate"
    );
    tl.to(
      face,
      { scaleX: 1.12, scaleY: 0.78, y: 10, duration: 0.32, ease: "power3.in" },
      "anticipate"
    );
    tl.to(
      eyes,
      { scaleY: 0.42, scaleX: 1.28, y: 14, duration: 0.32, ease: "power3.in" },
      "anticipate"
    );

    tl.addLabel("launch");
    tl.to(
      body,
      { duration: 0.46, morphSVG: shapes.stretch, ease: "back.out(2.6)" },
      "launch"
    );
    tl.to(
      group,
      { y: -150, scaleY: 1.26, scaleX: 0.9, rotation: -6, duration: 0.46, ease: "back.out(2.4)" },
      "launch"
    );
    tl.to(
      face,
      { scaleY: 1.18, scaleX: 0.86, y: -20, duration: 0.46, ease: "back.out(2.3)" },
      "launch"
    );
    tl.to(
      eyes,
      { scaleY: 1.5, scaleX: 0.65, y: -24, duration: 0.46, ease: "back.out(2.3)" },
      "launch"
    );

    tl.addLabel("float");
    tl.to(
      body,
      { duration: 0.26, morphSVG: shapes.wobble, ease: "sine.inOut" },
      "float"
    );
    tl.to(
      group,
      { rotation: 8, y: -126, duration: 0.26, ease: "sine.inOut" },
      "float"
    );
    tl.to(
      face,
      { rotation: -4, duration: 0.26, ease: "sine.inOut" },
      "float"
    );

    tl.addLabel("drop");
    tl.to(group, { y: 12, rotation: 6, duration: 0.22, ease: "power2.in" }, "drop");
    tl.to(
      body,
      { duration: 0.22, morphSVG: shapes.puddle, ease: "power2.in" },
      "drop"
    );
    tl.to(
      face,
      { scaleX: 1.24, scaleY: 0.62, y: 8, duration: 0.22, ease: "power2.in" },
      "drop"
    );
    tl.to(
      eyes,
      { scaleY: 0.52, scaleX: 1.24, y: 8, duration: 0.22, ease: "power2.in" },
      "drop"
    );

    tl.addLabel("bounce");
    tl.to(group, { y: -44, rotation: -4, duration: 0.24, ease: "power2.out" }, "bounce");
    tl.to(
      body,
      { duration: 0.24, morphSVG: shapes.stretch, ease: "power2.out" },
      "bounce"
    );
    tl.to(
      eyes,
      { scaleY: 1.38, scaleX: 0.74, y: -12, duration: 0.24, ease: "power2.out" },
      "bounce"
    );

    tl.addLabel("chaos");
    tl.to(
      body,
      { duration: 0.28, morphSVG: shapes.squiggle, ease: "power2.inOut" },
      "chaos"
    );
    tl.to(
      group,
      { rotation: -12, x: -28, y: -6, duration: 0.28, ease: "power2.inOut" },
      "chaos"
    );
    tl.to(
      face,
      { rotation: -8, scaleX: 1.1, scaleY: 0.92, duration: 0.28, ease: "power2.inOut" },
      "chaos"
    );
    tl.to(
      eyes,
      { rotation: -10, x: -10, duration: 0.28, ease: "power2.inOut" },
      "chaos"
    );
    tl.to(
      body,
      { duration: 0.28, morphSVG: shapes.squiggle, ease: "sine.inOut", yoyo: true, repeat: 1 },
      "chaos+=0.28"
    );
    tl.to(
      group,
      { rotation: 10, x: 26, duration: 0.28, ease: "sine.inOut", yoyo: true, repeat: 1 },
      "chaos+=0.28"
    );
    tl.to(
      face,
      { rotation: 6, duration: 0.28, ease: "sine.inOut", yoyo: true, repeat: 1 },
      "chaos+=0.28"
    );
    tl.to(
      eyes,
      { rotation: 8, x: 10, duration: 0.28, ease: "sine.inOut", yoyo: true, repeat: 1 },
      "chaos+=0.28"
    );

    tl.addLabel("settle");
    tl.to(
      body,
      { duration: 0.82, morphSVG: shapes.neutral, ease: "elastic.out(1.08, 0.58)" },
      "settle"
    );
    tl.to(
      group,
      { y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration: 0.82, ease: "elastic.out(1, 0.6)" },
      "settle"
    );
    tl.to(
      face,
      { scaleX: 1, scaleY: 1, y: 0, rotation: 0, duration: 0.82, ease: "elastic.out(1, 0.6)" },
      "settle"
    );
    tl.to(
      eyes,
      { scaleX: 1, scaleY: 1, y: 0, rotation: 0, duration: 0.82, ease: "elastic.out(1, 0.6)" },
      "settle"
    );

    if (!hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      requestAnimationFrame(() => tl.play(0));
    }
  }, [status]);

  const handleReplay = () => {
    timelineRef.current?.restart();
  };

  return (
    <div className={containerClasses}>
      <div className={cardClasses}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="px-4 py-2 rounded-full bg-[#ffe148] text-[#2c3e1f] text-xs font-semibold uppercase">
            Kochi Animation Lab
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Play-Doh Morph Test (MorphSVG)
          </h1>
          <p className="max-w-xl text-sm sm:text-base text-[#4d5233] leading-relaxed">
            This sandbox route stress-tests Kochi&apos;s silhouette with MorphSVG. We lean into classic
            animation beats—anticipation, overshoot, squash, stretch, and gooey recovery—without touching
            the production hero.
          </p>
        </div>

        <div className="w-full flex flex-col items-center gap-6">
          <svg
            ref={svgRef}
            viewBox="0 0 1024 1024"
            className="w-full max-w-sm sm:max-w-md drop-shadow-2xl"
            role="img"
            aria-labelledby="kochi-playdoh-title"
          >
            <title id="kochi-playdoh-title">Kochi Play-Doh Morph Test</title>
            <g id="kochi" fill="none" stroke="none" strokeWidth="0">
              <path
                id="body"
                fill="#ffe148"
                stroke="#2c3e1f"
                strokeWidth="6"
                d="M817.1,479c.7-59.1-37-115.6-91.5-138.1-6.1-4.2-21.1-7.1-41.8-9.1v-75.3c15.5-6,26.5-21,26.5-38.6s-18.6-41.4-41.4-41.4-41.4,18.6-41.4,41.4,11,32.6,26.5,38.6v73.2c-89.1-4.4-232.7.9-283.8,0v-73.3c15.3-6.1,26.2-21,26.2-38.5s-18.6-41.4-41.4-41.4-41.4,18.6-41.4,41.4,11.2,32.8,26.8,38.7v73.1c-73.6,7.2-135.5,74.2-133.9,149.3v226.1c-.1,39.6,15.9,78.1,43.9,106,27.8,28,66.4,44,106,43.9h310.7c59.1.7,115.6-37,138.1-91.5,22-37.1,8.2-240.8,11.8-284.4Z"
              />
              <path
                id="face"
                fill="#2c3e1f"
                d="M362.1,395.9c-48.3-1-90.9,41.6-89.9,89.9v82.8c-1,48.3,41.6,90.9,89.9,89.9h299.6c48.3,1,90.9-41.6,89.9-89.9v-82.8c1-48.3-41.6-90.9-89.9-89.9h-299.6Z"
              />
              <path
                id="eyeR"
                fill="#ffe148"
                d="M608.7,479.6c-24.7,0-44.8,20.1-44.8,44.8s20.1,44.8,44.8,44.8,44.8-20.1,44.8-44.8-20.1-44.8-44.8-44.8h0Z"
              />
              <path
                id="eyeL"
                fill="#ffe148"
                d="M415.3,479.6c-24.7,0-44.8,20.1-44.8,44.8s20.1,44.8,44.8,44.8,44.8-20.1,44.8-44.8-20.1-44.8-44.8-44.8h0Z"
              />
            </g>
          </svg>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleReplay}
              className="px-5 py-2 rounded-full bg-[#2c3e1f] text-[#ffe148] text-sm font-semibold uppercase tracking-wide hover:bg-[#1b2615] transition-colors duration-150"
            >
              Replay Squishy Morph
            </button>
            <p className="text-xs sm:text-sm text-[#6a714a]">
              Animation runs locally with GSAP + MorphSVG. Restart anytime to replay the full anticipation → launch → splat → settle cycle.
            </p>
          </div>
        </div>

        {status === "loading" && (
          <p className="text-xs text-[#6a714a]">Loading GSAP &amp; MorphSVG…</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600">
            Couldn&apos;t load GSAP/MorphSVG. Check that the plugin is installed locally.
          </p>
        )}
      </div>
    </div>
  );
}
