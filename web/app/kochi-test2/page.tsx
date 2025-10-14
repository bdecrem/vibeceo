"use client";

import { useEffect, useRef, useState } from "react";

type Frame = {
  sx?: number;
  sy?: number;
  ty?: number;
  aL?: number;
  aR?: number;
  lids?: number;
};

export default function KochiRiggedTestPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rigRef = useRef<SVGGElement | null>(null);
  const faceRef = useRef<SVGPathElement | null>(null);
  const antLRef = useRef<SVGPathElement | null>(null);
  const antRRef = useRef<SVGPathElement | null>(null);
  const lidLRef = useRef<SVGRectElement | null>(null);
  const lidRRef = useRef<SVGRectElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const yBaseLRef = useRef(369.53);
  const yBaseRRef = useRef(370.47);
  const idleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const rig = svgRef.current.querySelector('#rig') as SVGGElement;
    const face = svgRef.current.querySelector('#face') as SVGPathElement;
    const antL = svgRef.current.querySelector('#antennaL') as SVGPathElement;
    const antR = svgRef.current.querySelector('#antennaR') as SVGPathElement;
    const lidL = svgRef.current.querySelector('#lidL') as SVGRectElement;
    const lidR = svgRef.current.querySelector('#lidR') as SVGRectElement;

    if (rig && face && antL && antR && lidL && lidR) {
      rigRef.current = rig;
      faceRef.current = face;
      antLRef.current = antL;
      antRRef.current = antR;
      lidLRef.current = lidL;
      lidRRef.current = lidR;

      yBaseLRef.current = parseFloat(lidL.getAttribute('y') || '369.53');
      yBaseRRef.current = parseFloat(lidR.getAttribute('y') || '370.47');

      setIsReady(true);
      startIdle();
    }

    return () => {
      if (idleTimerRef.current) {
        window.clearInterval(idleTimerRef.current);
      }
    };
  }, []);

  const T = (el: SVGElement | null, t: string) => {
    if (el) el.setAttribute('transform', t);
  };

  const moveLids = (y: number) => {
    if (lidLRef.current) lidLRef.current.setAttribute('y', String(yBaseLRef.current + y));
    if (lidRRef.current) lidRRef.current.setAttribute('y', String(yBaseRRef.current + y));
  };

  const playOnce = (frames: Frame[]) => {
    const fps = 12;
    const step = 1000 / fps;
    let i = 0;

    const timer = setInterval(() => {
      const f = frames[i++];
      if (!f) {
        clearInterval(timer);
        return;
      }

      // Rig transform
      T(rigRef.current, `translate(0 ${f.ty || 0}) scale(${f.sx || 1} ${f.sy || 1})`);

      // Face scales less to stay readable
      const fsx = 1 - (1 - (f.sx || 1)) * 0.6;
      const fsy = 1 - (1 - (f.sy || 1)) * 0.6;
      T(faceRef.current, `scale(${fsx} ${fsy})`);

      // Antennae rotation
      T(antLRef.current, `rotate(${f.aL || 0})`);
      T(antRRef.current, `rotate(${f.aR || 0})`);

      // Lids
      if (typeof f.lids === 'number') moveLids(f.lids);
    }, step);
  };

  const bounce = () => {
    playOnce([
      { sx: 1.05, sy: 0.96, ty: 0, aL: -3, aR: 3, lids: 0 },
      { sx: 1.40, sy: 0.70, ty: 4, aL: 8, aR: -8, lids: 26 },
      { sx: 0.90, sy: 1.12, ty: -2, aL: -6, aR: 6, lids: 0 },
      { sx: 1.08, sy: 0.93, ty: 1, aL: 4, aR: -4, lids: 0 },
      { sx: 0.98, sy: 1.02, ty: 0, aL: -2, aR: 2, lids: 0 },
      { sx: 1.00, sy: 1.00, ty: 0, aL: 0, aR: 0, lids: 0 },
    ]);
  };

  const blink = () => {
    playOnce([{ lids: 60 }, { lids: 0 }]);
  };

  const squint = (amt = 28) => {
    moveLids(amt);
  };

  const resetSquint = () => {
    squint(0);
  };

  const wiggle = () => {
    playOnce([
      { aL: -15, aR: 15 },
      { aL: 15, aR: -15 },
      { aL: -10, aR: 10 },
      { aL: 10, aR: -10 },
      { aL: 0, aR: 0 },
    ]);
  };

  const hop = () => {
    playOnce([
      { sx: 1.1, sy: 0.9, ty: 2, aL: -5, aR: 5 }, // anticipate
      { sx: 0.9, sy: 1.2, ty: -40, aL: 10, aR: -10 }, // jump
      { sx: 0.95, sy: 1.1, ty: -35, aL: 8, aR: -8 },
      { sx: 1.15, sy: 0.85, ty: 3, aL: -3, aR: 3 }, // land squash
      { sx: 0.98, sy: 1.02, ty: 0, aL: 0, aR: 0 },
      { sx: 1.00, sy: 1.00, ty: 0, aL: 0, aR: 0 },
    ]);
  };

  const startIdle = () => {
    const fps = 12;
    const step = 1000 / fps;
    let t = 0;

    idleTimerRef.current = window.setInterval(() => {
      if (!rigRef.current || !antLRef.current || !antRRef.current) return;

      t++;
      const s = 1 + 0.02 * Math.sin(t / 8);
      T(rigRef.current, `scale(${s} ${2 - s})`);
      T(antLRef.current, `rotate(${2 * Math.sin(t / 10)})`);
      T(antRRef.current, `rotate(${-2 * Math.sin(t / 10)})`);
    }, step);
  };

  return (
    <div className="min-h-screen bg-[#fffef7] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-[#2C3E1F] mb-2">
          Kochi Rigged Character Test
        </h1>
        <p className="text-gray-600 mb-8">
          12fps cel-style animation with rigged character controls
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Kochi Display */}
          <div className="bg-white rounded-lg shadow-lg p-8 flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 1024 1024"
              className="w-full max-w-[320px] h-auto"
            >
              <style>{`
                #rig {
                  transform-box: fill-box;
                  transform-origin: 50% 100%;
                }
                #antennaL, #antennaR {
                  transform-box: fill-box;
                  transform-origin: 50% 100%;
                }
                #face, #eyeL, #eyeR {
                  transform-box: fill-box;
                  transform-origin: 50% 50%;
                }
                .cls-1 { fill: #FFE148; }
                .cls-2 { fill: #2C3E1F; }
              `}</style>

              <defs>
                <clipPath id="eyeWinL">
                  <rect x="370.33" y="472.78" width="89.86" height="103.25" rx="3.37" ry="3.37"/>
                </clipPath>
                <clipPath id="eyeWinR">
                  <rect x="563.76" y="473.72" width="89.86" height="103.25" rx="3.37" ry="3.37"/>
                </clipPath>
              </defs>

              <g id="rig">
                {/* BODY */}
                <path id="body" className="cls-1" d="M683.45,329.82c18.98,2.8,33.24,6.06,50.76,14.62,35.89,17.46,63.28,48.56,76.07,86.36,4.06,11.82,6.61,24.12,7.58,36.58,1.18,15.89.58,37.02.57,53.36v160.01c.03,39.08,1.37,58.72-16.71,95.43-4.62,8.73-10.05,17-16.22,24.71-24.94,30.6-61.13,49.9-100.44,53.55-8.58.87-17.82.66-26.49.67h-262.07c-19.64.01-52.79,1.1-70.56-2.08-24.48-4.58-47.42-15.21-66.75-30.91-30.17-24.68-49.28-60.35-53.15-99.13-1.4-14.18-.83-33.97-.82-48.65v-155.98c0-20.88-1.06-48.11,3.05-67.98,5.1-24.54,16.11-47.48,32.08-66.8,24.97-30.39,61.04-49.55,100.2-53.24l30-1.37c31.21.58,63.94.04,95.33.04h188.11l29.45.8Z"/>

                {/* FACE */}
                <path id="face" className="cls-2" d="M368.86,396.22c19.97-.76,43.57-.16,63.77-.16h119.92l68.48-.03c16.43,0,36.81-.77,52.64,2.14,17.9,3.34,34.53,11.54,48.09,23.7,35.34,31.85,29.44,68.67,29.73,111.15.25,35.16,2.89,66.4-23.44,94.25-19.69,20.83-44.77,29.9-72.95,30.95-18.65.85-43.06.12-62.11.12h-121.37l-71.79.03c-15.98,0-32.89.85-48.66-1.67-43.24-6.92-77.21-41.86-78.65-86.3-.51-15.56,0-31.42-.22-46.72-.5-34.94-2.44-68.51,23.8-95.85,19.96-21.63,44.12-30.08,72.76-31.61Z"/>

                {/* LEFT EYE */}
                <g id="eyeL" clipPath="url(#eyeWinL)">
                  <path className="cls-1" d="M407.97,480.09c24.63-4.05,47.83,12.75,51.68,37.41,3.84,24.66-13.15,47.73-37.85,51.36-24.4,3.59-47.13-13.16-50.93-37.53-3.8-24.37,12.76-47.24,37.1-51.24Z"/>
                  <rect id="lidL" className="cls-2" x="370.33" y="369.53" width="89.86" height="103.25" rx="3.37" ry="3.37"/>
                </g>

                {/* RIGHT EYE */}
                <g id="eyeR" clipPath="url(#eyeWinR)">
                  <path className="cls-1" d="M601.19,480.33c24.33-4.14,47.42,12.22,51.57,36.55,4.16,24.33-12.19,47.42-36.52,51.59-24.34,4.17-47.46-12.19-51.62-36.54-4.16-24.35,12.22-47.45,36.56-51.6Z"/>
                  <rect id="lidR" className="cls-2" x="563.76" y="370.47" width="89.86" height="103.25" rx="3.37" ry="3.37"/>
                </g>

                {/* ANTENNAE */}
                <path id="antennaL" className="cls-1" d="M340.3,340.46l.07-85.28c-3.86-1.57-7.22-3.36-10.54-5.9-8.65-6.52-14.33-16.24-15.74-26.98-3.11-23.88,12.76-43.28,36.49-45.98,5.34-.55,11.32.08,16.46,1.6,10.58,3.05,19.49,10.23,24.72,19.92,5.09,9.28,6.15,20.23,2.96,30.32-4.25,13.68-12.21,20.82-24.35,27.24.3,24.83-.61,60.23-.75,85.07h-29.32Z"/>
                <path id="antennaR" className="cls-1" d="M653.82,340.46v-84.79c-3.31-1.74-6.16-3.07-9.19-5.32-13.89-10.31-20.03-27.29-15.34-44.1,2.91-10.52,9.98-19.41,19.57-24.62,9.85-5.44,21.48-6.68,32.26-3.43,10.58,3.21,19.14,9.94,24.26,19.78,5.03,9.73,5.99,21.07,2.68,31.51-4.28,13.19-12.96,20.02-24.78,26.05v84.93h-29.46Z"/>
              </g>
            </svg>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">Cel Animation Controls</h2>
              <div className="space-y-2">
                <button
                  onClick={bounce}
                  disabled={!isReady}
                  className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎾 Bounce (squash + stretch)
                </button>
                <button
                  onClick={blink}
                  disabled={!isReady}
                  className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  👁️ Blink
                </button>
                <button
                  onClick={() => squint()}
                  disabled={!isReady}
                  className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  😑 Squint
                </button>
                <button
                  onClick={resetSquint}
                  disabled={!isReady}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Eyes
                </button>
                <button
                  onClick={wiggle}
                  disabled={!isReady}
                  className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📡 Wiggle Antennae
                </button>
                <button
                  onClick={hop}
                  disabled={!isReady}
                  className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🦘 Hop
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">💡 Rigged Animation Features:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 12fps cel-style stepped animation</li>
                <li>• Clip-path based eye lids for blink/squint</li>
                <li>• Transform-origin pivots for natural motion</li>
                <li>• Idle breathing loop runs continuously</li>
                <li>• No external libraries - pure setAttribute</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
