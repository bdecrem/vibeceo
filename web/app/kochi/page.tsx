"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";

interface Message {
  user: string;
  kochi: string;
}

const conversations: Message[] = [
  {
    user: "What should I cook tonight?",
    kochi: "How about pan-seared salmon with lemon butter? Takes 20 minutes and you probably have everything."
  },
  {
    user: "Need a gift idea for my mom",
    kochi: "A rare herb starter kit! Lemon verbena, chocolate mint, pineapple sage. She'll love growing something unexpected."
  },
  {
    user: "I can't focus today",
    kochi: "Try this: 25 minutes of work, 5 minute walk outside. No phone. Your brain needs to reset, not push harder."
  },
  {
    user: "What's a good birthday restaurant in Brooklyn?",
    kochi: "Lilia in Williamsburg. Book 2-3 weeks ahead. Get the mafaldini and sheep's milk ricotta. Trust me."
  },
  {
    user: "How do I tell my boss I need a break?",
    kochi: "\"I've been going hard and need a few days to recharge so I can keep delivering quality work.\" Frame it as investment, not weakness."
  },
  {
    user: "Recommend a book for a long flight",
    kochi: "Tomorrow, and Tomorrow, and Tomorrow by Gabrielle Zevin. About friendship, games, and creativity. You won't want to land."
  }
];

function KochiAnimation() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [gsapReady, setGsapReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gsap && !gsapReady) {
      setGsapReady(true);
    }
  }, [gsapReady]);

  useEffect(() => {
    if (!gsapReady || !svgRef.current) return;
    const gsap = (window as any).gsap;
    if (!gsap) return;

    const root = svgRef.current;
    const antennaL = root.querySelector<SVGPathElement>("#antennaL");
    const antennaR = root.querySelector<SVGPathElement>("#antennaR");
    const eyeL = root.querySelector<SVGPathElement>("#eyeL");
    const eyeR = root.querySelector<SVGPathElement>("#eyeR");

    if (!antennaL || !antennaR || !eyeL || !eyeR) return;

    const setAntennaHinge = (element: SVGGraphicsElement, offsetUp = 10) => {
      const bb = element.getBBox();
      const x = bb.x + bb.width / 2;
      const y = bb.y + bb.height - offsetUp;
      gsap.set(element, { svgOrigin: `${x} ${y}` });
    };

    setAntennaHinge(antennaL, 10);
    setAntennaHinge(antennaR, 10);
    gsap.set([eyeL, eyeR], { transformOrigin: "50% 50%" });

    const timelines: any[] = [];

    const antennaSwayL = gsap.to(antennaL, {
      rotation: 10,
      duration: 0.7,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      paused: true
    });

    const antennaSwayR = gsap.to(antennaR, {
      rotation: -10,
      duration: 0.7,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      paused: true,
      delay: 0.2
    });

    const startAntennaSway = () => {
      antennaSwayL.restart(true);
      antennaSwayR.restart(true);
    };

    const stopAntennaSway = () => {
      antennaSwayL.pause();
      antennaSwayR.pause();
      gsap.to([antennaL, antennaR], { rotation: 0, duration: 0.3, ease: "power2.out" });
    };

    const rollKeyframes = [
      { x: 6, y: -4, ease: "power1.inOut" },
      { x: 0, y: -8, ease: "power1.inOut" },
      { x: -6, y: -4, ease: "power1.inOut" },
      { x: -8, y: 0, ease: "power1.inOut" },
      { x: -6, y: 4, ease: "power1.inOut" },
      { x: 0, y: 8, ease: "power1.inOut" },
      { x: 6, y: 4, ease: "power1.inOut" },
      { x: 8, y: 0, ease: "power1.inOut" },
      { x: 0, y: 0, ease: "power1.out" }
    ];

    const eyeRollPhase = gsap.timeline({ paused: true });
    eyeRollPhase.to(eyeL, { duration: 1, ease: "none", keyframes: rollKeyframes, repeat: 4 }, 0);
    eyeRollPhase.to(eyeR, { duration: 1, ease: "none", keyframes: rollKeyframes, repeat: 4 }, 0);

    const master = gsap.timeline({ repeat: -1 });
    master.add(gsap.timeline({ onStart: startAntennaSway }).to({}, { duration: 5 }).add(stopAntennaSway));
    master.add(
      gsap
        .timeline({
          onStart: () => {
            gsap.set([eyeL, eyeR], { x: 0, y: 0 });
            eyeRollPhase.restart();
          }
        })
        .to({}, { duration: eyeRollPhase.duration() })
    );

    timelines.push(antennaSwayL, antennaSwayR, eyeRollPhase, master);

    return () => {
      timelines.forEach((anim) => {
        if (anim && typeof anim.kill === "function") {
          anim.kill();
        }
      });
    };
  }, [gsapReady]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />
      <svg
        ref={svgRef}
        className="w-[240px] h-[240px] md:w-[320px] md:h-[320px]"
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{".cls-1{fill:#e7d8b2}.cls-2{fill:#252520}"}</style>
        </defs>
        <g id="kochi">
          <path
            id="antennaL"
            className="cls-1"
            d="M340.3,340.46l.07-85.28c-3.86-1.57-7.22-3.36-10.54-5.9-8.65-6.52-14.33-16.24-15.74-26.98-3.11-23.88,12.76-43.28,36.49-45.98,5.34-.55,11.32.08,16.46,1.6,10.58,3.05,19.49,10.23,24.72,19.92,5.09,9.28,6.15,20.23,2.96,30.32-4.25,13.68-12.21,20.82-24.35,27.24.3,24.83-.61,60.23-.75,85.07h-29.32Z"
          />
          <path
            id="antennaR"
            className="cls-1"
            d="M653.82,340.46v-84.79c-3.31-1.74-6.16-3.07-9.19-5.32-13.89-10.31-20.03-27.29-15.34-44.1,2.91-10.52,9.98-19.41,19.57-24.62,9.85-5.44,21.48-6.68,32.26-3.43,10.58,3.21,19.14,9.94,24.26,19.78,5.03,9.73,5.99,21.07,2.68,31.51-4.28,13.19-12.96,20.02-24.78,26.05v84.93h-29.45Z"
          />
          <path
            id="body"
            className="cls-1"
            d="M683.45,329.82c18.98,2.8,33.24,6.06,50.76,14.62,35.89,17.46,63.28,48.56,76.07,86.36,4.06,11.82,6.61,24.12,7.58,36.58,1.18,15.89.58,37.02.57,53.36v89.61s0,70.4,0,70.4c.03,39.08,1.37,58.72-16.71,95.43-4.62,8.73-10.05,17-16.22,24.71-24.94,30.6-61.13,49.9-100.44,53.55-8.58.87-17.82.66-26.49.67h-148.13s-113.94.01-113.94.01c-19.64,0-52.79,1.09-70.56-2.09-24.48-4.58-47.42-15.21-66.75-30.91-30.17-24.68-49.28-60.35-53.15-99.13-1.4-14.18-.83-33.97-.82-48.65v-75.18s.01-80.8.01-80.8c-.01-20.88-1.07-48.11,3.04-67.98,5.1-24.54,16.11-47.48,32.08-66.8,24.97-30.39,61.04-49.55,100.2-53.24l30-1.37c31.21.58,63.94.04,95.33.04h188.11s29.45.8,29.45.8Z"
          />
          <path
            id="face"
            className="cls-2"
            d="M368.86,396.22c19.97-.76,43.57-.16,63.77-.16h119.92s68.48-.03,68.48-.03c16.43,0,36.81-.77,52.64,2.14,17.9,3.34,34.53,11.54,48.09,23.7,35.34,31.85,29.44,68.67,29.73,111.15.25,35.16,2.89,66.4-23.44,94.25-19.69,20.83-44.77,29.9-72.95,30.95-18.65.85-43.06.12-62.11.12h-121.37s-71.79.03-71.79.03c-15.98,0-32.89.85-48.66-1.67-43.24-6.92-77.21-41.86-78.65-86.3-.51-15.56,0-31.42-.22-46.72-.5-34.94-2.44-68.51,23.8-95.85,19.96-21.63,44.12-30.08,72.76-31.61Z"
          />
          <path
            id="eyeL"
            className="cls-1"
            d="M407.97,480.09c24.63-4.05,47.83,12.75,51.68,37.41,3.84,24.66-13.15,47.73-37.85,51.36-24.4,3.59-47.13-13.16-50.93-37.53-3.8-24.37,12.76-47.24,37.1-51.24Z"
          />
          <path
            id="eyeR"
            className="cls-1"
            d="M601.19,480.33c24.33-4.14,47.42,12.22,51.57,36.55,4.16,24.33-12.19,47.42-36.52,51.59-24.34,4.17-47.46-12.19-51.62-36.54-4.16-24.35,12.22-47.45,36.56-51.6Z"
          />
        </g>
      </svg>
    </>
  );
}

export default function KochiLandingPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % conversations.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: '#252520' }}
    >
      {/* Ambient background effects */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(255, 155, 113, 0.3), transparent)' }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(231, 216, 178, 0.2), transparent)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex flex-col items-center pt-16 pb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-3"
          >
            <span
              className="tracking-[0.05em]"
              style={{
                color: '#E7D8B2',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 800,
                fontSize: '64px',
                lineHeight: 1
              }}
            >
              Kochi.to
            </span>
            <span
              className="uppercase tracking-[0.1em]"
              style={{
                color: 'rgba(231, 216, 178, 0.6)',
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                lineHeight: 1,
                letterSpacing: '0.1em'
              }}
            >
              DELIVERED DAILY. WEATHER PERMITTING.
            </span>
          </motion.div>
        </header>

        {/* Main conversation area */}
        <div className="flex-1 flex items-center justify-center px-6 py-0 relative">
          <div className="w-full mx-auto relative" style={{ zIndex: 1 }}>
            <div className="flex flex-col items-center gap-10">
              <div className="flex flex-col items-center gap-6">
                {/* User question appears at top */}
                <div className="w-full flex justify-end">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`user-${currentIndex}`}
                      initial={{ opacity: 0, y: -30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="max-w-[85%] md:max-w-lg"
                    >
                      <div
                        className="px-6 py-4 md:px-8 md:py-5 rounded-3xl"
                        style={{
                          background: '#FF9B71',
                          color: '#252520',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '18px',
                          lineHeight: '1.5',
                          fontWeight: 400,
                          borderBottomRightRadius: '8px',
                          boxShadow: '0 8px 24px rgba(255, 155, 113, 0.3)',
                        }}
                      >
                        {conversations[currentIndex].user}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Kochi's response appears in the middle */}
                <div className="w-full flex justify-start">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`kochi-${currentIndex}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 30 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
                      className="max-w-[85%] md:max-w-lg"
                    >
                      <div
                        className="px-6 py-4 md:px-8 md:py-5 rounded-3xl"
                        style={{
                          background: 'rgba(231, 216, 178, 0.1)',
                          color: '#E7D8B2',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '18px',
                          lineHeight: '1.5',
                          fontWeight: 400,
                          borderBottomLeftRadius: '8px',
                          border: '1px solid rgba(231, 216, 178, 0.2)',
                        }}
                      >
                        {conversations[currentIndex].kochi}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="flex justify-center"
              >
                <KochiAnimation />
              </motion.div>

              {/* Pagination dots */}
              <div className="flex justify-center gap-2">
                {conversations.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className="transition-all duration-300"
                    style={{
                      width: currentIndex === index ? '40px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      background: currentIndex === index
                        ? '#FF9B71'
                        : 'rgba(231, 216, 178, 0.2)',
                    }}
                    aria-label={`Go to conversation ${index + 1}`}
                  />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center gap-3 pt-4"
              >
                <button
                  className="px-10 py-5 rounded-full transition-all duration-300 hover:scale-105"
                  style={{
                    background: '#FF9B71',
                    boxShadow: '0 8px 32px rgba(255, 155, 113, 0.4)',
                  }}
                >
                  <span
                    style={{
                      color: '#252520',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      letterSpacing: '0.02em'
                    }}
                  >
                    Get Early Access
                  </span>
                </button>
                <p
                  style={{
                    color: 'rgba(231, 216, 178, 0.5)',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '14px',
                  }}
                >
                  Launching soon. Weather permitting.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
