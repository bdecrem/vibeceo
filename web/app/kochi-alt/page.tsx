"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Script from "next/script";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Poppins } from "next/font/google";

type Stage = "initial" | "prompt" | "cta";

const GREETING_TEXT = "Hey, I'm Kochi. I send daily SMS blasts on AI, science & finance.\nTry AI Daily: your snapshot of today's most discussed AI papers.";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const randomFrom = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

interface KochiAnimationProps {
  onClick?: () => void;
}

interface KochiAnimationHandle {
  playRandomAnimation: () => void;
  playDisco: () => void;
  playMorph: () => void;
}

const KochiAnimation = forwardRef<KochiAnimationHandle, KochiAnimationProps>(
  ({ onClick }, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const morphSvgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gsapReady, setGsapReady] = useState(false);
  const [morphPluginReady, setMorphPluginReady] = useState(false);
  const [activeSVG, setActiveSVG] = useState<'normal' | 'morph'>('normal');
  const animationsRef = useRef<Array<() => any>>([]);
  const activeTimelineRef = useRef<any>(null);
  const discoIntervalRef = useRef<number | null>(null);
  const discoTimeoutsRef = useRef<number[]>([]);
  const eyesRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });
  const antennasRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });
  const introAnimationPlayedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gsap && !gsapReady) {
      setGsapReady(true);
    }
  }, [gsapReady]);

  // Load MorphSVGPlugin
  useEffect(() => {
    if (!gsapReady || morphPluginReady) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/gsap@3/dist/MorphSVGPlugin.min.js';
    script.onload = () => {
      const gsap = (window as any).gsap;
      const MorphSVGPlugin = (window as any).MorphSVGPlugin;
      if (gsap && MorphSVGPlugin) {
        gsap.registerPlugin(MorphSVGPlugin);
        setMorphPluginReady(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [gsapReady, morphPluginReady]);

  useEffect(() => {
    if (!gsapReady || !svgRef.current) return;
    const gsap = (window as any).gsap;
    if (!gsap) return;

    const root = svgRef.current;
    const antennaL = root.querySelector<SVGPathElement>("#antennaL");
    const antennaR = root.querySelector<SVGPathElement>("#antennaR");
    const eyeL = root.querySelector<SVGPathElement>("#eyeL");
    const eyeR = root.querySelector<SVGPathElement>("#eyeR");
    const group = root.querySelector<SVGGElement>("#kochi");

    if (!antennaL || !antennaR || !eyeL || !eyeR || !group) return;

    groupRef.current = group;
    eyesRef.current = { left: eyeL, right: eyeR };
    antennasRef.current = { left: antennaL, right: antennaR };
    gsap.set(group, { transformOrigin: "50% 50%" });

    const setHinge = (element: SVGGraphicsElement, offset = 10) => {
      const bb = element.getBBox();
      const x = bb.x + bb.width / 2;
      const y = bb.y + bb.height - offset;
      gsap.set(element, { svgOrigin: `${x} ${y}` });
    };

    setHinge(antennaL, 10);
    setHinge(antennaR, 10);
    gsap.set([eyeL, eyeR], { transformOrigin: "50% 50%" });

    const animations: Array<() => any> = [
      () =>
        gsap
          .timeline()
          .to(group, { y: -60, duration: 0.35, ease: "power2.out" })
          .to(group, { y: 0, duration: 0.6, ease: "bounce.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { rotation: -12, duration: 0.2, ease: "power2.inOut" })
          .to(group, { rotation: 10, duration: 0.25, ease: "power2.inOut" })
          .to(group, { rotation: -6, duration: 0.25, ease: "power2.inOut" })
          .to(group, { rotation: 0, duration: 0.25, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { scaleX: 1.25, scaleY: 0.7, duration: 0.25, ease: "power1.in" })
          .to(group, { scaleX: 0.85, scaleY: 1.25, duration: 0.3, ease: "power2.out" })
          .to(group, { scaleX: 1.05, scaleY: 0.95, duration: 0.25 })
          .to(group, { scaleX: 1, scaleY: 1, duration: 0.3, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { rotation: 360, duration: 0.9, ease: "power2.out" })
          .to(group, { rotation: 0, duration: 0.1 }),
      () =>
        gsap
          .timeline()
          .to(group, { y: -30, duration: 0.2 })
          .to(group, { y: 0, duration: 0.2 })
          .to(group, { y: -20, duration: 0.18 })
          .to(group, { y: 0, duration: 0.22, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to([eyeL, eyeR], { scale: 1.35, duration: 0.18, ease: "power1.out" })
          .to([eyeL, eyeR], { scale: 1, duration: 0.25, ease: "power1.inOut" }),
      () =>
        gsap
          .timeline()
          .to([eyeL, eyeR], { x: 12, duration: 0.22, ease: "power1.inOut" })
          .to([eyeL, eyeR], { x: -12, duration: 0.22, ease: "power1.inOut" })
          .to([eyeL, eyeR], { x: 0, duration: 0.2, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { x: -35, duration: 0.25, ease: "power2.out" })
          .to(group, { x: 35, duration: 0.35, ease: "power2.inOut" })
          .to(group, { x: 0, duration: 0.3, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { rotation: -8, y: -20, duration: 0.3, ease: "power2.out" })
          .to(group, { rotation: 8, duration: 0.3, ease: "power2.inOut" })
          .to(group, { rotation: 0, y: 0, duration: 0.4, ease: "power2.out" }),
      () =>
        gsap
          .timeline()
          .to([antennaL, antennaR], { rotation: 25, duration: 0.25, ease: "power1.inOut" })
          .to([antennaL, antennaR], { rotation: -20, duration: 0.35, ease: "power1.inOut" })
          .to([antennaL, antennaR], { rotation: 0, duration: 0.4, ease: "power1.out" }),
      () =>
        gsap
          .timeline()
          .to(group, { scale: 1.25, duration: 0.22, ease: "back.out(2.1)" })
          .to(group, { scale: 1, duration: 0.3, ease: "power1.inOut" }),
      () =>
        gsap
          .timeline()
          .to(group, { rotation: 20, y: -40, duration: 0.4, ease: "power2.out" })
          .to(group, { rotation: -18, duration: 0.3, ease: "power2.inOut" })
          .to(group, { rotation: 0, y: 0, duration: 0.35, ease: "power2.out" })
    ];

    animationsRef.current = animations;

    return () => {
      activeTimelineRef.current?.kill();
      activeTimelineRef.current = null;
      animationsRef.current = [];
    };
  }, [gsapReady]);

  // One-time intro animation
  useEffect(() => {
    if (!gsapReady || introAnimationPlayedRef.current || !groupRef.current) return;

    const gsap = (window as any).gsap;
    if (!gsap) return;

    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);

    const timer = setTimeout(() => {
      introAnimationPlayedRef.current = true;

      const tl = gsap.timeline();

      // PART 1: SPONGE SQUISH
      tl.to(group, { scaleX: 0.6, scaleY: 1.3, skewX: 0, duration: 0.24, ease: 'power2.in' })
        .to(group, { scaleX: 0.5, scaleY: 1.5, skewX: 15, duration: 0.16, ease: 'power2.in' })
        .to(group, { scaleX: 0.4, scaleY: 1.6, skewX: -20, duration: 0.16, ease: 'power2.in' })
        .to(group, { scaleX: 0.7, scaleY: 1.2, skewX: 10, duration: 0.24, ease: 'power2.out' })
        .to(group, { scaleX: 1.3, scaleY: 0.8, skewX: -5, duration: 0.24, ease: 'elastic.out(1, 0.5)' })
        .to(group, { scaleX: 0.95, scaleY: 1.08, skewX: 3, duration: 0.208, ease: 'power2.inOut' })
        .to(group, { scaleX: 1.05, scaleY: 0.97, skewX: -2, duration: 0.16, ease: 'power2.inOut' })
        .to(group, { scaleX: 1, scaleY: 1, skewX: 0, duration: 0.192, ease: 'power2.out' });

      if (eyes.length) {
        tl.to(eyes, { scaleX: 0.7, scaleY: 1.4, duration: 0.4, ease: 'power2.in' }, 0)
          .to(eyes, { scaleX: 0.5, scaleY: 1.7, duration: 0.16, ease: 'power2.in' })
          .to(eyes, { scaleX: 1.3, scaleY: 0.8, duration: 0.48, ease: 'elastic.out(1, 0.5)' })
          .to(eyes, { scaleX: 1, scaleY: 1, duration: 0.56, ease: 'power2.out' });
      }

      tl.to({}, { duration: 2 });

      // PART 2: EXTREME BALLOON CHAOS
      tl.to(group, {
        scaleY: 0.5,
        scaleX: 1.4,
        y: 15,
        duration: 0.35,
        ease: "power2.in"
      });

      if (antennas.length) {
        tl.to(antennas, {
          rotation: -35,
          duration: 0.35,
          ease: "power2.in"
        }, 0);
      }

      if (eyes.length) {
        tl.to(eyes, {
          scaleY: 0.4,
          scaleX: 1.3,
          duration: 0.35,
          ease: "power2.in"
        }, 0);
      }

      tl.to(group, {
        scale: 1.7,
        y: -20,
        duration: 0.5,
        ease: "back.out(3)"
      });

      if (antennas.length) {
        tl.to(antennas, {
          rotation: 15,
          duration: 0.5,
          ease: "back.out(4)"
        }, "-=0.5");
      }

      if (eyes.length) {
        tl.to(eyes, {
          scale: 1.6,
          duration: 0.5,
          ease: "back.out(3)"
        }, "-=0.5");
      }

      tl.to(group, {
        scale: 1.75,
        duration: 0.1
      });

      for (let i = 0; i < 4; i++) {
        tl.to(group, {
          rotation: i % 2 === 0 ? 3 : -3,
          duration: 0.08
        });
      }

      tl.to(group, {
        scaleX: 0.4,
        scaleY: 1.6,
        rotation: -45,
        x: -30,
        y: -10,
        duration: 0.15,
        ease: "power4.in"
      });

      if (eyes.length) {
        tl.to(eyes, {
          scaleX: 0.5,
          scaleY: 1.8,
          rotation: 20,
          duration: 0.15
        }, "-=0.15");
      }

      tl.to(group, {
        scaleX: 1.5,
        scaleY: 0.5,
        rotation: 60,
        x: 25,
        y: 10,
        duration: 0.18,
        ease: "power2.out"
      });

      if (eyes.length) {
        tl.to(eyes, {
          scaleX: 1.6,
          scaleY: 0.4,
          rotation: -30,
          duration: 0.18
        }, "-=0.18");
      }

      tl.to(group, {
        scaleX: 0.7,
        scaleY: 1.3,
        rotation: -180,
        x: -15,
        y: 20,
        duration: 0.2,
        ease: "power1.inOut"
      });

      if (eyes.length) {
        tl.to(eyes, {
          scaleX: 0.8,
          scaleY: 1.2,
          rotation: 45,
          duration: 0.2
        }, "-=0.2");
      }

      if (antennas.length) {
        tl.to(antennas, {
          rotation: -60,
          duration: 0.3,
          ease: "power2.inOut"
        }, "-=0.4");
      }

      tl.to(group, {
        scale: 1,
        rotation: 360,
        x: 0,
        y: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.3)"
      });

      if (eyes.length) {
        tl.to(eyes, {
          scale: 1,
          rotation: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.3)"
        }, "-=0.8");
      }

      if (antennas.length) {
        tl.to(antennas, {
          rotation: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.5)"
        }, "-=0.8");
      }

      tl.to(group, {
        rotation: 365,
        duration: 0.3,
        ease: "power1.out"
      });

      tl.to(group, {
        rotation: 360,
        duration: 0.2,
        ease: "power1.inOut"
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [gsapReady]);

  const playRandomAnimation = () => {
    if (!gsapReady || animationsRef.current.length === 0) return;
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!gsap || !group) return;

    activeTimelineRef.current?.kill();
    const animationFactory = randomFrom(animationsRef.current);
    activeTimelineRef.current = animationFactory();

    activeTimelineRef.current.eventCallback("onComplete", () => {
      gsap.to(group, {
        duration: 0.2,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      });
      const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
      const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
      if (eyes.length) {
        gsap.to(eyes, { duration: 0.2, x: 0, y: 0, scale: 1 });
      }
      if (antennas.length) {
        gsap.to(antennas, { duration: 0.2, rotation: 0 });
      }
    });
  };

  // DISCO ANIMATION - EXACT code from disco.html with color changes!
  const playDisco = () => {
    if (!svgRef.current || !groupRef.current) return;

    // Kill any active GSAP animation
    activeTimelineRef.current?.kill();
    activeTimelineRef.current = null;

    // Clear any existing disco timers
    if (discoIntervalRef.current) {
      window.clearInterval(discoIntervalRef.current);
      discoIntervalRef.current = null;
    }
    discoTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    discoTimeoutsRef.current = [];

    const kochi = groupRef.current;
    const svg = svgRef.current;
    const body = svg.querySelector<SVGPathElement>("#body");
    const face = svg.querySelector<SVGPathElement>("#face");
    const antennaL = svg.querySelector<SVGPathElement>("#antennaL");
    const antennaR = svg.querySelector<SVGPathElement>("#antennaR");

    if (!body || !face || !antennaL || !antennaR) return;

    // Allow Kochi to render outside SVG bounds during disco!
    svg.style.overflow = 'visible';

    // Store original STYLE fills (inline styles override CSS classes)
    const originalBodyFill = body.style.fill || '#ffe148';
    const originalFaceFill = face.style.fill || '#2c3e1f';
    const originalAntennaFill = antennaL.style.fill || '#ffe148';

    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    let count = 0;

    // Create disco balls (exact code from disco.html)
    for (let i = 0; i < 30; i++) {
      const timeoutId = window.setTimeout(() => {
        const ball = document.createElement('div');
        ball.style.position = 'absolute';
        ball.style.width = '10px';
        ball.style.height = '10px';
        ball.style.background = 'white';
        ball.style.borderRadius = '50%';
        ball.style.left = Math.random() * 100 + '%';
        ball.style.top = Math.random() * 100 + '%';
        ball.style.opacity = '1';
        ball.style.pointerEvents = 'none';
        ball.style.zIndex = '1000';

        if (containerRef.current) {
          containerRef.current.appendChild(ball);
        }

        const fadeTimeout = window.setTimeout(() => {
          ball.style.transition = 'opacity 0.5s';
          ball.style.opacity = '0';
          const removeTimeout = window.setTimeout(() => ball.remove(), 500);
          discoTimeoutsRef.current.push(removeTimeout);
        }, 2000);

        discoTimeoutsRef.current.push(fadeTimeout);
      }, i * 100);

      discoTimeoutsRef.current.push(timeoutId);
    }

    // Disco animation loop - USE INLINE STYLES to override CSS classes!
    discoIntervalRef.current = window.setInterval(() => {
      // Set inline styles (these override CSS classes)
      body.style.fill = colors[count % colors.length];
      face.style.fill = colors[(count + 1) % colors.length];
      antennaL.style.fill = colors[(count + 2) % colors.length];
      antennaR.style.fill = colors[(count + 3) % colors.length];

      const rotation = Math.sin(count * 0.3) * 30;
      const scale = 1 + Math.sin(count * 0.5) * 0.2;
      kochi.style.transform = `rotate(${rotation}deg) scale(${scale})`;

      count++;
      if (count > 40) {
        if (discoIntervalRef.current) {
          window.clearInterval(discoIntervalRef.current);
          discoIntervalRef.current = null;
        }

        // Reset to original colors and transform
        body.style.fill = originalBodyFill;
        face.style.fill = originalFaceFill;
        antennaL.style.fill = originalAntennaFill;
        antennaR.style.fill = originalAntennaFill;
        kochi.style.transform = '';

        // Reset overflow back to default
        svg.style.overflow = '';
      }
    }, 100);
  };

  // MORPH ANIMATION - Exact code from kochi-morph-demo.html
  const playMorph = () => {
    if (!morphPluginReady || !morphSvgRef.current) return;

    const gsap = (window as any).gsap;
    const MorphSVGPlugin = (window as any).MorphSVGPlugin;
    if (!gsap || !MorphSVGPlugin) return;

    // Kill any active animations
    activeTimelineRef.current?.kill();
    activeTimelineRef.current = null;
    if (discoIntervalRef.current) {
      window.clearInterval(discoIntervalRef.current);
      discoIntervalRef.current = null;
    }

    // Switch to morph SVG
    setActiveSVG('morph');

    // Wait for DOM update, then run morph animation
    setTimeout(() => {
      const morphSvg = morphSvgRef.current;
      if (!morphSvg) return;

      const kochiGroup = morphSvg.querySelector("#kochi");
      const eyeL = morphSvg.querySelector("#eyeL");
      const eyeR = morphSvg.querySelector("#eyeR");
      const bodyShape = morphSvg.querySelector("#bodyShape");
      const face = morphSvg.querySelector("#face");

      if (!kochiGroup || !eyeL || !eyeR || !bodyShape || !face) return;

      // Set transform origins
      gsap.set(kochiGroup, { transformOrigin: "50% 50%" });
      gsap.set([eyeL, eyeR], { transformOrigin: "50% 50%" });

      // Create morph timeline
      const tl = gsap.timeline({
        onComplete: () => {
          // Switch back to normal SVG after animation
          setTimeout(() => setActiveSVG('normal'), 100);
        }
      });

      tl
        // WIGGLE - "Waking up and shaking it off"
        .to(kochiGroup, {
          rotation: -3,
          duration: 0.15,
          ease: "power2.inOut"
        }, 0)
        .to(kochiGroup, {
          rotation: 4,
          duration: 0.15,
          ease: "power2.inOut"
        }, 0.15)
        .to(kochiGroup, {
          rotation: -4,
          duration: 0.15,
          ease: "power2.inOut"
        }, 0.3)
        .to(kochiGroup, {
          rotation: 3,
          duration: 0.15,
          ease: "power2.inOut"
        }, 0.45)
        .to(kochiGroup, {
          rotation: -2,
          duration: 0.15,
          ease: "power2.inOut"
        }, 0.6)
        .to(kochiGroup, {
          rotation: 0,
          duration: 0.2,
          ease: "back.out(2)"
        }, 0.75)

        // Eye blink during wiggle
        .to([eyeL, eyeR], {
          scaleY: 0.1,
          duration: 0.08,
          ease: "power2.in",
          repeat: 1,
          yoyo: true
        }, 0.3)

        // Small bounce/settle after wiggle
        .to(kochiGroup, {
          y: -10,
          duration: 0.2,
          ease: "power2.out"
        }, 0.75)
        .to(kochiGroup, {
          y: 0,
          duration: 0.3,
          ease: "bounce.out"
        }, 0.95)

        // MAIN MORPH - Squished → Normal
        .to(bodyShape, {
          morphSVG: "#targetBodyNormal",
          duration: 3.5,
          ease: "elastic.out(1, 0.3)"
        }, 1.3)

        // Morph face too
        .to(face, {
          morphSVG: "#targetFaceNormal",
          duration: 3.5,
          ease: "elastic.out(1, 0.3)"
        }, 1.3)

        // Squash down before stretching up
        .to(kochiGroup, {
          scaleY: 0.85,
          scaleX: 1.15,
          duration: 0.4,
          ease: "power2.in"
        }, 1.3)

        // Big stretch with overshoot
        .to(kochiGroup, {
          scaleY: 1.15,
          scaleX: 0.9,
          duration: 1.2,
          ease: "power2.out"
        }, 1.7)

        // Settle back to normal
        .to(kochiGroup, {
          scaleY: 1,
          scaleX: 1,
          duration: 2.3,
          ease: "elastic.out(1, 0.4)"
        }, 2.9)

        // Eyes react during morph - squash and stretch
        .to([eyeL, eyeR], {
          scaleY: 0.7,
          scaleX: 1.3,
          duration: 0.5,
          ease: "power2.out"
        }, 1.7)
        .to([eyeL, eyeR], {
          scaleY: 1.2,
          scaleX: 0.85,
          duration: 0.8,
          ease: "power2.inOut"
        }, 2.2)
        .to([eyeL, eyeR], {
          scaleY: 1,
          scaleX: 1,
          duration: 1.2,
          ease: "elastic.out(1, 0.4)"
        }, 3.0)

        // Final blink at the end
        .to([eyeL, eyeR], {
          scaleY: 0.1,
          duration: 0.08,
          ease: "power2.in",
          repeat: 1,
          yoyo: true
        }, 4.5);

      activeTimelineRef.current = tl;
    }, 50);
  };

  useImperativeHandle(ref, () => ({
    playRandomAnimation,
    playDisco,
    playMorph
  }));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (discoIntervalRef.current) {
        window.clearInterval(discoIntervalRef.current);
      }
      discoTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />

      {/* NORMAL SVG - for GSAP animations and disco */}
      <svg
        ref={svgRef}
        viewBox="0 0 1024 1024"
        className="max-w-[200px] sm:max-w-[280px] w-full h-auto cursor-pointer transition-transform duration-100"
        onClick={onClick}
        style={{ display: activeSVG === 'normal' ? 'block' : 'none' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <defs>
          <style>{`
            .cls-1{fill:#ffe148}
            .cls-2{fill:#2c3e1f}
          `}</style>
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

      {/* MORPH SVG - squished blob version for morph animation */}
      <svg
        ref={morphSvgRef}
        viewBox="0 0 1024 1024"
        className="max-w-[200px] sm:max-w-[280px] w-full h-auto cursor-pointer transition-transform duration-100"
        onClick={onClick}
        style={{ display: activeSVG === 'morph' ? 'block' : 'none' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <defs>
          <style>{`
            .st0 { fill: #ffe148; }
            .st1 { fill: #2c3e1f; }
          `}</style>
        </defs>
        <g id="kochi">
          {/* Squished blob body */}
          <path id="bodyShape" className="st0" d="M940.1,616.9c11.5-32.7,19.6-65.5,24.3-98.3,2.7-17.9,5.4-41.4,3.9-58.6-1.2-13.5-5.3-26.3-12.2-37.6-21.7-36.8-69.4-53.6-124.2-50.4-26.8,1.3-47.7,5.6-75,11.6,0,0,0,0,0,0,0,0-.2,0-.2,0-4.7-18.2-10.6-36.3-17.9-54.3,13.7-11.2,22.8-22.2,23.2-35.6.3-10.5-5.8-18.9-16-22.5-10.4-3.6-23.4-1.8-37,3.8-13.9,5.7-26.7,14.7-36.4,24.2-9.5,9.3-15.4,18.6-16.2,26.6-1.4,12.6,9.8,20.2,30.4,20.4,4.5,0,8.5-.5,13.3-1,6.1,16.3,11,32.8,14.9,49.4-88.1,22.8-175.5,33.5-262.4,32.1-43.5-.7-88.8-4.3-131.8-11.4-.4,0-.8-.1-1.1-.2,2.8-13.5,7.8-29.8,11.2-41.9,16.8,0,28.1-2,35.6-8.2,5.6-4.6,6-10.6,1.7-17-4.5-6.6-13.3-13.3-24.8-19.3-5.6-2.9-12.3-5.8-18.7-7.9-28-9.7-53.9-7.3-57.4,10-1.5,7.6,3.1,16.6,12.7,24.2,3.7,3,7.6,5.4,12.2,7.8-5.5,15.1-9.8,30.3-13.1,45.7-54-8.6-107.2-10.9-145.8,4.8-24.6,9.8-41.9,26.3-48.8,47-5.8,16.8-2.2,41.6,1.1,60.3,4,24.2,10.3,48.5,18.9,72.9,8,22.6,17.9,45.3,29.8,68.1,6.9,13.3,16.7,31.5,26.5,43.8,26.8,34,72.8,55.4,116.5,59.4,28.2,2.7,54.2-.7,77.2-7.1,16.6-5.2,43.8-16.2,60.4-20,31.9-8,63.8-10.3,95.8-6.9,41.5,4.4,83,18.5,124.5,42.1,7.3,4.1,14.9,9.1,22.7,13.1,34.7,18.7,80.1,28.5,129.5,14.8,12.2-3.5,24.3-8.3,35.9-14.4,47.4-26.9,61.1-50.5,83.4-92.8,13.2-25.6,24.4-51.3,33.4-77Z"/>
          {/* Squished blob face */}
          <path id="face" className="st1" d="M345.7,447.9c23.7,4.9,50.6,9.9,74.2,12.2,46.4,4.8,92.8,4,139.3-2.3,26.5-3.6,53-9,79.5-16.2,19.2-5,41.9-13.5,63.2-18,24.1-5,53.2-6,82.7,0,78.5,16.5,96,63.6,79.7,108.9-11.4,38-48.5,75.1-119,95.4-52.6,14.9-88.1,13.1-112.5,6-16.7-4.7-36.3-11-52.5-14.4-34.1-7.3-68.2-10.6-102.2-9.7-20.2.5-40.3,2.5-60.4,5.8-13.6,2.2-26.6,6-42.9,7.6-21.8,2.1-53.6-.6-87.3-10.2-33.2-9.4-68.3-25.7-85.9-45.9-12.5-14-19.8-28.4-24-42.1-10.5-30.9,2-63.6,56.3-77.2,41.8-10.8,78.1-6.6,111.8,0h0Z"/>
          {/* Eyes */}
          <path id="eyeL" className="st0" d="M408,480.1c24.6-4,47.8,12.8,51.7,37.4,3.8,24.7-13.1,47.7-37.9,51.4-24.4,3.6-47.1-13.2-50.9-37.5-3.8-24.4,12.8-47.2,37.1-51.2h0Z"/>
          <path id="eyeR" className="st0" d="M601.2,480.3c24.3-4.1,47.4,12.2,51.6,36.6,4.2,24.3-12.2,47.4-36.5,51.6-24.3,4.2-47.5-12.2-51.6-36.5-4.2-24.4,12.2-47.5,36.6-51.6h0Z"/>
        </g>
      </svg>

      {/* Hidden target shapes for morph */}
      <svg style={{ display: 'none' }}>
        <path id="targetBodyNormal" d="M818.4,610.3v-89.6c0-16.3.6-37.5-.6-53.4-1-12.5-3.5-24.8-7.6-36.6-12.8-37.8-40.2-68.9-76.1-86.4-17.5-8.6-31.8-11.8-50.8-14.6h0s-.2,0-.2,0v-74.3c11.8-6,20.5-12.9,24.8-26,3.3-10.4,2.4-21.8-2.7-31.5-5.1-9.8-13.7-16.6-24.3-19.8-10.8-3.2-22.4-2-32.3,3.4-9.6,5.2-16.7,14.1-19.6,24.6-4.7,16.8,1.5,33.8,15.3,44.1,3,2.2,5.9,3.6,9.2,5.3v73.3h-187.9c-31.4,0-64.1.5-95.3,0h-.8c.3-23.4.9-52.4.6-73.6,12.1-6.4,20.1-13.6,24.3-27.2,3.2-10.1,2.1-21-3-30.3-5.2-9.7-14.1-16.9-24.7-19.9-5.1-1.5-11.1-2.2-16.5-1.6-23.7,2.7-39.6,22.1-36.5,46,1.4,10.7,7.1,20.5,15.7,27,3.3,2.5,6.7,4.3,10.5,5.9v75.2c-39.1,3.7-75.1,22.9-100,53.2-16,19.3-27,42.3-32.1,66.8-4.1,19.9-3,47.1-3,68v80.8s0,75.2,0,75.2c0,14.7-.6,34.5.8,48.7,3.9,38.8,23,74.5,53.1,99.1,19.3,15.7,42.3,26.3,66.8,30.9,17.8,3.2,50.9,2.1,70.6,2.1h113.9s148.1,0,148.1,0c8.7,0,17.9.2,26.5-.7,39.3-3.6,75.5-23,100.4-53.5,6.2-7.7,11.6-16,16.2-24.7,18.1-36.7,16.7-56.3,16.7-95.4v-70.4Z"/>
        <path id="targetFaceNormal" d="M368.9,396.2c20-.8,43.6-.2,63.8-.2h188.4c16.4,0,36.8-.8,52.6,2.1,17.9,3.3,34.5,11.5,48.1,23.7,35.3,31.9,29.4,68.7,29.7,111.1.2,35.2,2.9,66.4-23.4,94.2-19.7,20.8-44.8,29.9-73,31-18.7.8-43.1.1-62.1.1h-193.2c-16,0-32.9.9-48.7-1.6-43.2-6.9-77.2-41.9-78.6-86.3-.5-15.6,0-31.4-.2-46.7-.5-34.9-2.4-68.5,23.8-95.9,20-21.6,44.1-30.1,72.8-31.6h0Z"/>
      </svg>
    </div>
  );
});
KochiAnimation.displayName = "KochiAnimation";

export default function KochiDiscoTestPage() {
  const [stage, setStage] = useState<Stage>("initial");
  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const mascotRef = useRef<KochiAnimationHandle | null>(null);
  const [greetingDisplayed, setGreetingDisplayed] = useState("");
  const greetingIntervalRef = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText("18663300015");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (stage === "initial") {
        setStage("prompt");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [stage]);

  const handleMascotClick = () => {
    if (stage === "initial" || stage === "prompt") {
      setStage("cta");
      setAnimationsEnabled(true);
      setTimeout(() => {
        // 75% GSAP, 10% disco, 15% morph
        const rand = Math.random();
        if (rand < 0.10) {
          mascotRef.current?.playDisco();
        } else if (rand < 0.25) { // 10% + 15% = 25%
          mascotRef.current?.playMorph();
        } else {
          mascotRef.current?.playRandomAnimation();
        }
      }, 60);
    } else if (animationsEnabled) {
      // 75% GSAP, 10% disco, 15% morph
      const rand = Math.random();
      if (rand < 0.10) {
        mascotRef.current?.playDisco();
      } else if (rand < 0.25) { // 10% + 15% = 25%
        mascotRef.current?.playMorph();
      } else {
        mascotRef.current?.playRandomAnimation();
      }
    }
  };

  useEffect(() => {
    if (greetingIntervalRef.current) {
      window.clearInterval(greetingIntervalRef.current);
      greetingIntervalRef.current = null;
    }

    if (stage !== "cta") {
      setGreetingDisplayed("");
      return;
    }

    const greeting = GREETING_TEXT;
    setGreetingDisplayed("");
    let index = 0;
    greetingIntervalRef.current = window.setInterval(() => {
      index += 1;
      setGreetingDisplayed(greeting.slice(0, index));
      if (index >= greeting.length && greetingIntervalRef.current) {
        window.clearInterval(greetingIntervalRef.current);
        greetingIntervalRef.current = null;
      }
    }, 35);

    return () => {
      if (greetingIntervalRef.current) {
        window.clearInterval(greetingIntervalRef.current);
        greetingIntervalRef.current = null;
      }
    };
  }, [stage]);

  return (
    <div
      className="min-h-screen bg-[#fffef7] text-center flex flex-col items-center justify-center px-5 py-4 sm:py-6 overflow-x-hidden"
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        maxWidth: "100vw",
        minHeight: "100dvh"
      }}
    >
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        body {
          overflow-x: hidden;
          max-width: 100vw;
        }
      `}</style>

      <main className="w-full max-w-[480px] px-4 sm:px-0 flex-1 flex flex-col items-center justify-center gap-5 sm:gap-6 md:gap-7 pt-6 pb-6 sm:pt-8 sm:pb-4">
        <div className="flex flex-col items-center gap-1 sm:gap-2 mb-2 sm:mb-0">
          <h1
            className={`${poppins.className} text-[32px] sm:text-[40px] md:text-[44px] leading-[0.95] font-[800]`}
            style={{
              color: "#2C3E1F",
              margin: "0"
            }}
          >
            Kochi.to
          </h1>

          <p
            className="text-[12px] sm:text-[13px]"
            style={{
              color: "#8a8a8a",
              fontStyle: "italic"
            }}
          >
            AI blasts delivered daily. Weather permitting.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-4">
          <div className="flex justify-center">
            <KochiAnimation ref={mascotRef} onClick={handleMascotClick} />
          </div>

          <div className="w-full flex flex-col items-center gap-3 sm:gap-4">
          <div className="h-8 sm:h-10 flex justify-center items-center">
            <AnimatePresence mode="wait">
              {stage === "prompt" && (
                <motion.button
                  key="prompt-text"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 420, damping: 14 }}
                  onClick={handleMascotClick}
                  className={`${poppins.className} text-[#8a8a8a] hover:text-[#2C3E1F] transition-colors duration-200 text-[12px] sm:text-[15px] font-medium`}
                >
                  Tap Kochi to get started
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {stage === "cta" && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                className="w-full flex flex-col items-center gap-3 sm:gap-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="inline-block"
                >
                  <div
                    className={`${poppins.className} text-[12px] leading-[1.45] sm:text-[15px] sm:leading-snug`}
                    style={{
                      background: "#FFF9E6",
                      color: "#2C3E1F",
                      padding: "12px 18px",
                      borderRadius: "20px",
                      border: "1px solid #2C3E1F",
                      display: "inline-block",
                      maxWidth: "90%",
                      textAlign: "left",
                      fontWeight: 500,
                      whiteSpace: "pre-wrap"
                    }}
                  >
                    <span>{greetingDisplayed || "\u00a0"}</span>
                    {greetingDisplayed.length < GREETING_TEXT.length && (
                      <span className="inline-block w-1 h-4 sm:h-5 bg-[#2C3E1F] ml-1 animate-pulse align-middle" />
                    )}
                  </div>
                </motion.div>

                <div className="flex flex-col items-center gap-2 sm:gap-4">
                  <a
                    href="sms:8663300015?body=AI%20DAILY"
                    className={`${poppins.className} rounded-full border border-[#2C3E1F] px-5 py-3 sm:px-7 sm:py-4 text-[15px] sm:text-[17px] font-bold transition-all duration-200 shadow-[0_8px_24px_rgba(255,225,72,0.32)]`}
                    style={{
                      background: "#FFE148",
                      color: "#2C3E1F"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 12px 32px rgba(255, 225, 72, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 24px rgba(255, 225, 72, 0.4)";
                    }}
                  >
                    Try it now →
                  </a>
                  <button
                    onClick={handleCopyPhone}
                    className={`${poppins.className} text-[11px] sm:text-[13px] cursor-pointer hover:text-[#2C3E1F] transition-colors duration-200 relative`}
                    style={{
                      color: "#8a8a8a"
                    }}
                  >
                    +1-866-330-0015 (SMS/WhatsApp)
                    {copied && (
                      <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-[#2C3E1F] text-white text-xs px-3 py-1 rounded-full whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>
                  <div className={`${poppins.className} flex justify-center mt-2`}>
                    <span className="text-[11px] sm:text-[12px] text-[#8a8a8a]">
                      <Link
                        href="/about"
                        className="underline decoration-1 underline-offset-2 hover:text-[#2C3E1F] transition-colors duration-200"
                      >
                        About us
                      </Link>
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
