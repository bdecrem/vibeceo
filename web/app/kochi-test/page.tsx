"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function KochiTestPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const eyesRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });
  const antennasRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });
  const [gsapReady, setGsapReady] = useState(false);
  const activeTimelineRef = useRef<any>(null);

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
  }, [gsapReady]);

  const resetPose = () => {
    if (!gsapReady || !groupRef.current) return;
    const gsap = (window as any).gsap;

    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);

    gsap.set(group, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, scale: 1 });
    if (eyes.length) {
      gsap.set(eyes, { x: 0, y: 0, scale: 1, rotation: 0, scaleX: 1, scaleY: 1 });
    }
    if (antennas.length) {
      gsap.set(antennas, { rotation: 0 });
    }
  };

  const playAnimation = (animationFn: () => void) => {
    if (!gsapReady) return;
    activeTimelineRef.current?.kill();
    resetPose();
    animationFn();
  };

  // TEST ANIMATIONS - Add your experiments here!

  const testAnimation1 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    // Simple bounce
    const tl = gsap.timeline();
    tl.to(group, { y: -80, duration: 0.4, ease: "power2.out" })
      .to(group, { y: 0, duration: 0.6, ease: "bounce.out" });
    activeTimelineRef.current = tl;
  };

  const testAnimation2 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    // Spin jump
    const tl = gsap.timeline();
    tl.to(group, { rotation: 360, y: -60, duration: 0.8, ease: "power2.out" })
      .to(group, { y: 0, duration: 0.4, ease: "bounce.out" }, "-=0.2");
    activeTimelineRef.current = tl;
  };

  const testAnimation3 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    if (!group) return;

    // Squash and stretch
    const tl = gsap.timeline();
    tl.to(group, { scaleX: 1.4, scaleY: 0.6, duration: 0.3, ease: "power2.in" })
      .to(group, { scaleX: 0.8, scaleY: 1.3, duration: 0.3, ease: "power2.out" })
      .to(group, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" });

    if (eyes.length) {
      tl.to(eyes, { scaleY: 0.5, duration: 0.3, ease: "power2.in" }, 0)
        .to(eyes, { scaleY: 1.4, duration: 0.3, ease: "power2.out" })
        .to(eyes, { scaleY: 1, duration: 0.4, ease: "elastic.out(1, 0.3)" }, "-=0.4");
    }
    activeTimelineRef.current = tl;
  };

  const testAnimation4 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    // Shake with fear
    const tl = gsap.timeline();

    // Eyes go wide
    if (eyes.length) {
      tl.to(eyes, { scale: 1.5, duration: 0.1 }, 0);
    }

    // Rapid shake
    for (let i = 0; i < 8; i++) {
      tl.to(group, {
        x: i % 2 === 0 ? -5 : 5,
        rotation: i % 2 === 0 ? -3 : 3,
        duration: 0.05
      });
    }

    // Antennas droop
    if (antennas.length) {
      tl.to(antennas, { rotation: -15, duration: 0.3 }, 0.2);
    }

    // Settle back
    tl.to(group, { x: 0, rotation: 0, duration: 0.3, ease: "power2.out" })
      .to(eyes, { scale: 1, duration: 0.3 }, "-=0.3")
      .to(antennas, { rotation: 0, duration: 0.3 }, "-=0.3");

    activeTimelineRef.current = tl;
  };

  const testAnimation5 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    // Wild spin
    const tl = gsap.timeline();
    tl.to(group, {
      rotation: 720,
      scale: 1.5,
      duration: 1,
      ease: "power2.inOut"
    })
    .to(group, {
      rotation: 720,
      scale: 1,
      duration: 0.5,
      ease: "elastic.out(1, 0.3)"
    });

    activeTimelineRef.current = tl;
  };

  // FROM HTML FILE - 13 more animations

  const squishAndBounce = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { scaleX: 1.15, scaleY: 0.7, duration: 0.3, ease: 'power2.in' })
      .to(group, { scaleX: 1.25, scaleY: 0.6, duration: 0.3, ease: 'power2.in' })
      .to(group, { scaleX: 0.9, scaleY: 1.15, duration: 0.4, ease: 'power2.out' })
      .to(group, { scaleX: 1.05, scaleY: 0.95, duration: 0.3, ease: 'power2.inOut' })
      .to(group, { scaleX: 0.98, scaleY: 1.02, duration: 0.3, ease: 'power2.inOut' })
      .to(group, { scaleX: 1.01, scaleY: 0.99, duration: 0.2, ease: 'power2.inOut' })
      .to(group, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'power2.out' });
    activeTimelineRef.current = tl;
  };

  const spinJump = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { rotation: 180, y: -60, duration: 0.4, ease: 'power2.out' })
      .to(group, { rotation: 360, y: -80, duration: 0.1, ease: 'none' })
      .to(group, { rotation: 360, y: 0, duration: 0.35, ease: 'power2.in' })
      .to(group, { rotation: 360, y: -15, duration: 0.08, ease: 'power2.out' })
      .to(group, { rotation: 360, y: 0, duration: 0.07, ease: 'bounce.out' })
      .set(group, { rotation: 0 });
    activeTimelineRef.current = tl;
  };

  const wiggle = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { rotation: -15, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { rotation: 12, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { rotation: -10, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { rotation: 8, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { rotation: -5, duration: 0.12, ease: 'power2.inOut' })
      .to(group, { rotation: 3, duration: 0.08, ease: 'power2.inOut' })
      .to(group, { rotation: 0, duration: 0.12, ease: 'power2.out' });
    activeTimelineRef.current = tl;
  };

  const pulse = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { scale: 1.2, duration: 0.18, ease: 'power2.out' })
      .to(group, { scale: 0.95, duration: 0.18, ease: 'power2.inOut' })
      .to(group, { scale: 1.15, duration: 0.18, ease: 'power2.inOut' })
      .to(group, { scale: 0.98, duration: 0.18, ease: 'power2.inOut' })
      .to(group, { scale: 1, duration: 0.18, ease: 'power2.out' });
    activeTimelineRef.current = tl;
  };

  const antennaSway = () => {
    const gsap = (window as any).gsap;
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (antennas.length !== 2) return;

    const [antennaL, antennaR] = antennas;
    const tl = gsap.timeline();

    tl.to(antennaL, { rotation: 8, duration: 0.625, ease: 'sine.inOut' }, 0)
      .to(antennaL, { rotation: 0, duration: 0.625, ease: 'sine.inOut' })
      .to(antennaL, { rotation: -8, duration: 0.625, ease: 'sine.inOut' })
      .to(antennaL, { rotation: 0, duration: 0.625, ease: 'sine.inOut' });

    tl.to(antennaR, { rotation: -8, duration: 0.625, ease: 'sine.inOut' }, 0)
      .to(antennaR, { rotation: 0, duration: 0.625, ease: 'sine.inOut' }, 0.625)
      .to(antennaR, { rotation: 8, duration: 0.625, ease: 'sine.inOut' }, 1.25)
      .to(antennaR, { rotation: 0, duration: 0.625, ease: 'sine.inOut' }, 1.875);

    activeTimelineRef.current = tl;
  };

  const eyePop = () => {
    const gsap = (window as any).gsap;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    if (!eyes.length) return;

    const tl = gsap.timeline();
    tl.to(eyes, { scale: 1.8, duration: 0.2, ease: 'power2.out' })
      .to(eyes, { scale: 1.6, duration: 0.15, ease: 'power2.inOut' })
      .to(eyes, { scale: 1.9, duration: 0.15, ease: 'power2.out' })
      .to(eyes, { scale: 0.9, duration: 0.2, ease: 'power2.in' })
      .to(eyes, { scale: 1.1, duration: 0.15, ease: 'power2.out' })
      .to(eyes, { scale: 1, duration: 0.15, ease: 'power2.inOut' });
    activeTimelineRef.current = tl;
  };

  const bored = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { y: 20, scaleX: 1.02, scaleY: 0.95, duration: 0.6, ease: 'power2.out' })
      .to(group, { duration: 0.8 })
      .to(group, { y: 0, scaleX: 1, scaleY: 1, duration: 0.6, ease: 'power2.inOut' });

    if (eyes.length) {
      tl.to(eyes, { y: 8, scaleX: 1.1, scaleY: 0.7, duration: 0.6, ease: 'power2.out' }, 0)
        .to(eyes, { duration: 0.8 }, 0.6)
        .to(eyes, { y: 0, scaleX: 1, scaleY: 1, duration: 0.6, ease: 'power2.inOut' }, 1.4);
    }

    if (antennas.length) {
      tl.to(antennas, { rotation: -12, duration: 0.6, ease: 'power2.out' }, 0)
        .to(antennas, { duration: 0.8 }, 0.6)
        .to(antennas, { rotation: 0, duration: 0.6, ease: 'power2.inOut' }, 1.4);
    }

    activeTimelineRef.current = tl;
  };

  const playful = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { y: -30, rotation: -5, duration: 0.21, ease: 'power2.out' })
      .to(group, { y: 0, rotation: 0, duration: 0.21, ease: 'power2.in' })
      .to(group, { y: -25, rotation: 5, duration: 0.21, ease: 'power2.out' })
      .to(group, { y: 0, rotation: 0, duration: 0.21, ease: 'power2.in' })
      .to(group, { y: -20, rotation: -3, duration: 0.21, ease: 'power2.out' })
      .to(group, { y: 0, rotation: 0, duration: 0.35, ease: 'bounce.out' });

    if (antennas.length === 2) {
      const [antennaL, antennaR] = antennas;
      tl.to(antennaL, { rotation: 15, duration: 0.168 }, 0)
        .to(antennaL, { rotation: -10, duration: 0.168 })
        .to(antennaL, { rotation: 12, duration: 0.168 })
        .to(antennaL, { rotation: -8, duration: 0.168 })
        .to(antennaL, { rotation: 10, duration: 0.168 })
        .to(antennaL, { rotation: -6, duration: 0.168 })
        .to(antennaL, { rotation: 0, duration: 0.392 });

      tl.to(antennaR, { rotation: -15, duration: 0.168 }, 0)
        .to(antennaR, { rotation: 10, duration: 0.168 }, 0.168)
        .to(antennaR, { rotation: -12, duration: 0.168 }, 0.336)
        .to(antennaR, { rotation: 8, duration: 0.168 }, 0.504)
        .to(antennaR, { rotation: -10, duration: 0.168 }, 0.672)
        .to(antennaR, { rotation: 6, duration: 0.168 }, 0.84)
        .to(antennaR, { rotation: 0, duration: 0.392 }, 1.008);
    }

    if (eyes.length) {
      tl.to(eyes, { scale: 1.15, duration: 0.21, ease: 'power2.out' }, 0)
        .to(eyes, { scale: 0.95, duration: 0.21, ease: 'power2.inOut' })
        .to(eyes, { scale: 1.1, duration: 0.21, ease: 'power2.out' })
        .to(eyes, { scale: 0.98, duration: 0.21, ease: 'power2.inOut' })
        .to(eyes, { scale: 1.05, duration: 0.21, ease: 'power2.out' })
        .to(eyes, { scale: 1, duration: 0.35, ease: 'power2.inOut' });
    }

    activeTimelineRef.current = tl;
  };

  const spongeSquish = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
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

    activeTimelineRef.current = tl;
  };

  const explode = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { scale: 1.5, rotation: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
      .to(group, { scale: 3, rotation: 720, opacity: 0.3, duration: 0.625, ease: 'power2.in' })
      .to(group, { scale: 0.1, rotation: 1080, opacity: 0, duration: 0.375, ease: 'power2.in' })
      .to(group, { scale: 0.1, rotation: 1440, opacity: 0, duration: 0.375 })
      .to(group, { scale: 2, rotation: 1800, opacity: 0.5, duration: 0.375, ease: 'power2.out' })
      .to(group, { scale: 0.8, rotation: 2160, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' })
      .to(group, { scale: 1, rotation: 2160, opacity: 1, duration: 0.2, ease: 'power2.out' })
      .set(group, { rotation: 0 });

    if (antennas.length === 2) {
      const [antennaL, antennaR] = antennas;
      tl.to(antennaL, { rotation: -180, x: -150, y: -200, opacity: 0, duration: 0.875, ease: 'power2.in' }, 0)
        .to(antennaL, { duration: 0.75 })
        .to(antennaL, { rotation: 0, x: 0, y: 0, opacity: 1, duration: 0.875, ease: 'back.out(1.7)' });

      tl.to(antennaR, { rotation: 180, x: 150, y: -200, opacity: 0, duration: 0.875, ease: 'power2.in' }, 0)
        .to(antennaR, { duration: 0.75 }, 0.875)
        .to(antennaR, { rotation: 0, x: 0, y: 0, opacity: 1, duration: 0.875, ease: 'back.out(1.7)' }, 1.625);
    }

    if (eyes.length === 2) {
      const [eyeL, eyeR] = eyes;
      tl.to(eyeL, { scale: 3, x: -120, y: 100, rotation: 360, opacity: 0, duration: 0.875, ease: 'power2.in' }, 0)
        .to(eyeL, { duration: 0.75 }, 0.875)
        .to(eyeL, { scale: 1, x: 0, y: 0, rotation: 720, opacity: 1, duration: 0.875, ease: 'back.out(1.7)' }, 1.625)
        .set(eyeL, { rotation: 0 });

      tl.to(eyeR, { scale: 3, x: 120, y: -80, rotation: -360, opacity: 0, duration: 0.875, ease: 'power2.in' }, 0)
        .to(eyeR, { duration: 0.75 }, 0.875)
        .to(eyeR, { scale: 1, x: 0, y: 0, rotation: -720, opacity: 1, duration: 0.875, ease: 'back.out(1.7)' }, 1.625)
        .set(eyeR, { rotation: 0 });
    }

    activeTimelineRef.current = tl;
  };

  const electricBuzz = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
    const buzzPattern = [0, 4, -3, 5, -4, 3, -5, 4, -3, 2, 0];

    if (antennas.length) {
      buzzPattern.forEach((angle, i) => {
        tl.to(antennas, { rotation: angle, duration: 0.15, ease: 'none' }, i * 0.15);
      });
    }

    tl.to(group, { x: 3, duration: 0.15, ease: 'none' }, 0);
    for (let i = 1; i < 10; i++) {
      tl.to(group, { x: i % 2 === 0 ? 3 : -3, duration: 0.15, ease: 'none' }, i * 0.15);
    }
    tl.to(group, { x: 0, duration: 0.15, ease: 'none' });

    if (eyes.length) {
      const flickerPattern = [1, 0.3, 1, 0.4, 1, 0.2, 1, 0.5, 1, 1];
      flickerPattern.forEach((opacity, i) => {
        tl.to(eyes, { opacity: opacity, duration: 0.15, ease: 'none' }, i * 0.15);
      });
    }

    activeTimelineRef.current = tl;
  };

  const thinking = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();

    if (eyes.length) {
      tl.to(eyes, { scaleY: 0.4, duration: 0.33, ease: 'power2.out' })
        .to(eyes, { x: 15, y: -10, duration: 0.44, ease: 'power2.inOut' })
        .to(eyes, { x: -12, y: -8, duration: 0.44, ease: 'power2.inOut' })
        .to(eyes, { x: -5, y: 5, duration: 0.33, ease: 'power2.inOut' })
        .to(eyes, { x: 0, y: 0, duration: 0.33, ease: 'power2.inOut' })
        .to(eyes, { scaleY: 1, duration: 0.33, ease: 'power2.out' });
    }

    tl.to(group, { rotation: 5, duration: 0.66, ease: 'power2.out' }, 0)
      .to(group, { duration: 0.66 })
      .to(group, { rotation: -3, duration: 0.44, ease: 'power2.inOut' })
      .to(group, { rotation: 0, duration: 0.44, ease: 'power2.out' });

    if (antennas.length) {
      tl.to(antennas, { rotation: -8, duration: 0.55, ease: 'power2.out' }, 0)
        .to(antennas, { duration: 1.1 })
        .to(antennas, { rotation: 0, duration: 0.55, ease: 'power2.out' });
    }

    activeTimelineRef.current = tl;
  };

  const ballRock = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();
    tl.to(group, { scaleX: 1.1, scaleY: 0.85, duration: 0.25, ease: 'power2.out' })
      .to(group, { scaleX: 1.15, scaleY: 0.85, duration: 0.25, ease: 'power2.in' })
      .to(group, { rotation: 25, duration: 0.375, ease: 'power2.inOut' })
      .to(group, { rotation: -25, duration: 0.375, ease: 'power2.inOut' })
      .to(group, { rotation: 20, duration: 0.3, ease: 'power2.inOut' })
      .to(group, { rotation: -20, duration: 0.3, ease: 'power2.inOut' })
      .to(group, { rotation: 12, duration: 0.2, ease: 'power2.inOut' })
      .to(group, { rotation: -12, duration: 0.15, ease: 'power2.inOut' })
      .to(group, { rotation: 5, duration: 0.125, ease: 'power2.inOut' })
      .to(group, { scaleX: 0.95, scaleY: 1.05, rotation: 0, duration: 0.075, ease: 'back.out(2)' })
      .to(group, { scaleX: 1, scaleY: 1, duration: 0.075, ease: 'power2.out' });

    if (antennas.length) {
      tl.to(antennas, { scaleY: 0.3, opacity: 0.3, duration: 0.375, ease: 'power2.in' }, 0)
        .to(antennas, { scaleY: 0.1, opacity: 0, duration: 0.125, ease: 'power2.in' })
        .to(antennas, { duration: 1.7 })
        .to(antennas, { scaleY: 0.5, opacity: 0.5, duration: 0.15, ease: 'power2.out' })
        .to(antennas, { scaleY: 1, opacity: 1, duration: 0.15, ease: 'back.out(2)' });
    }

    if (eyes.length) {
      tl.to(eyes, { rotation: 720, duration: 1.875, ease: 'power2.inOut' }, 0.5)
        .set(eyes, { rotation: 0 });
    }

    activeTimelineRef.current = tl;
  };

  const funkySquishSpring = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();

    // Get squished into increasingly bizarre shapes
    tl.to(group, {
      scaleX: 0.7,
      scaleY: 1.4,
      skewX: 10,
      rotation: -15,
      duration: 0.3,
      ease: 'power2.in'
    })
    .to(group, {
      scaleX: 0.4,
      scaleY: 1.8,
      skewX: 25,
      skewY: -15,
      rotation: -25,
      duration: 0.25,
      ease: 'power2.in'
    })
    .to(group, {
      scaleX: 0.3,
      scaleY: 2.1,
      skewX: -30,
      skewY: 20,
      rotation: 15,
      duration: 0.2,
      ease: 'power2.in'
    })
    // Hold the funky shape for a beat
    .to(group, { duration: 0.15 })
    // SPRING BACK with massive overshoot and bounce
    .to(group, {
      scaleX: 1.4,
      scaleY: 0.6,
      skewX: 15,
      skewY: -10,
      rotation: -10,
      duration: 0.25,
      ease: 'back.out(3)'
    })
    .to(group, {
      scaleX: 0.85,
      scaleY: 1.2,
      skewX: -8,
      skewY: 5,
      rotation: 8,
      duration: 0.2,
      ease: 'power2.inOut'
    })
    .to(group, {
      scaleX: 1.1,
      scaleY: 0.9,
      skewX: 4,
      skewY: -3,
      rotation: -4,
      duration: 0.15,
      ease: 'power2.inOut'
    })
    .to(group, {
      scaleX: 0.98,
      scaleY: 1.03,
      skewX: -2,
      skewY: 1,
      rotation: 2,
      duration: 0.12,
      ease: 'power2.inOut'
    })
    .to(group, {
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      rotation: 0,
      duration: 0.15,
      ease: 'elastic.out(1, 0.3)'
    });

    // Eyes get completely warped during squish
    if (eyes.length) {
      tl.to(eyes, {
        scaleX: 0.6,
        scaleY: 1.6,
        rotation: -20,
        duration: 0.3,
        ease: 'power2.in'
      }, 0)
      .to(eyes, {
        scaleX: 0.4,
        scaleY: 2,
        rotation: 30,
        duration: 0.25,
        ease: 'power2.in'
      })
      .to(eyes, {
        scaleX: 0.3,
        scaleY: 2.3,
        rotation: -40,
        duration: 0.2,
        ease: 'power2.in'
      })
      .to(eyes, { duration: 0.15 })
      // Eyes spring back with the body
      .to(eyes, {
        scaleX: 1.3,
        scaleY: 0.7,
        rotation: 15,
        duration: 0.25,
        ease: 'back.out(3)'
      })
      .to(eyes, {
        scaleX: 0.9,
        scaleY: 1.1,
        rotation: -8,
        duration: 0.2,
        ease: 'power2.inOut'
      })
      .to(eyes, {
        scaleX: 1.05,
        scaleY: 0.95,
        rotation: 3,
        duration: 0.15,
        ease: 'power2.inOut'
      })
      .to(eyes, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: 0.27,
        ease: 'elastic.out(1, 0.3)'
      });
    }

    // Antennas go crazy
    if (antennas.length === 2) {
      const [antennaL, antennaR] = antennas;

      tl.to(antennaL, {
        rotation: -45,
        scaleY: 1.3,
        duration: 0.55,
        ease: 'power2.in'
      }, 0)
      .to(antennaL, { duration: 0.15 })
      .to(antennaL, {
        rotation: 20,
        scaleY: 0.8,
        duration: 0.25,
        ease: 'back.out(3)'
      })
      .to(antennaL, {
        rotation: -10,
        scaleY: 1.1,
        duration: 0.2,
        ease: 'power2.inOut'
      })
      .to(antennaL, {
        rotation: 0,
        scaleY: 1,
        duration: 0.27,
        ease: 'elastic.out(1, 0.3)'
      });

      tl.to(antennaR, {
        rotation: 45,
        scaleY: 1.3,
        duration: 0.55,
        ease: 'power2.in'
      }, 0)
      .to(antennaR, { duration: 0.15 }, 0.55)
      .to(antennaR, {
        rotation: -20,
        scaleY: 0.8,
        duration: 0.25,
        ease: 'back.out(3)'
      }, 0.7)
      .to(antennaR, {
        rotation: 10,
        scaleY: 1.1,
        duration: 0.2,
        ease: 'power2.inOut'
      }, 0.95)
      .to(antennaR, {
        rotation: 0,
        scaleY: 1,
        duration: 0.27,
        ease: 'elastic.out(1, 0.3)'
      }, 1.15);
    }

    activeTimelineRef.current = tl;
  };

  const funkySquishSpringV2 = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();

    // Sponge gets grabbed and squeezed - asymmetric pressure from one side
    tl.to(group, {
      scaleX: 0.55,
      scaleY: 1.35,
      x: -25,
      y: 15,
      rotation: -12,
      duration: 0.35,
      ease: 'power3.in'
    })
    // Maximum squeeze - completely deformed, rounded bulge on one side
    .to(group, {
      scaleX: 0.4,
      scaleY: 1.6,
      x: -35,
      y: 20,
      rotation: -18,
      duration: 0.25,
      ease: 'power4.in'
    })
    // Release and SPRING! Big elastic bounce back
    .to(group, {
      scaleX: 1.3,
      scaleY: 0.75,
      x: 15,
      y: -10,
      rotation: 8,
      duration: 0.35,
      ease: 'back.out(4)'
    })
    // Wobble back the other way
    .to(group, {
      scaleX: 0.88,
      scaleY: 1.12,
      x: -5,
      y: 5,
      rotation: -3,
      duration: 0.25,
      ease: 'sine.inOut'
    })
    // Smaller wobble
    .to(group, {
      scaleX: 1.08,
      scaleY: 0.94,
      x: 3,
      y: -2,
      rotation: 1,
      duration: 0.18,
      ease: 'sine.inOut'
    })
    // Settle back to normal
    .to(group, {
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.2,
      ease: 'sine.out'
    });

    // Eyes bulge out on the side being squeezed
    if (eyes.length) {
      tl.to(eyes, {
        scaleX: 0.7,
        scaleY: 1.5,
        x: -8,
        y: 5,
        duration: 0.35,
        ease: 'power3.in'
      }, 0)
      .to(eyes, {
        scaleX: 0.5,
        scaleY: 1.8,
        x: -12,
        y: 8,
        duration: 0.25,
        ease: 'power4.in'
      })
      // Pop back with overshoot
      .to(eyes, {
        scaleX: 1.25,
        scaleY: 0.8,
        x: 5,
        y: -3,
        duration: 0.35,
        ease: 'back.out(4)'
      })
      .to(eyes, {
        scaleX: 0.92,
        scaleY: 1.08,
        x: -2,
        y: 2,
        duration: 0.25,
        ease: 'sine.inOut'
      })
      .to(eyes, {
        scaleX: 1.05,
        scaleY: 0.97,
        x: 1,
        y: -1,
        duration: 0.18,
        ease: 'sine.inOut'
      })
      .to(eyes, {
        scaleX: 1,
        scaleY: 1,
        x: 0,
        y: 0,
        duration: 0.2,
        ease: 'sine.out'
      });
    }

    // Antennas bend with the squeeze
    if (antennas.length === 2) {
      const [antennaL, antennaR] = antennas;

      tl.to(antennaL, {
        rotation: -25,
        duration: 0.6,
        ease: 'power3.in'
      }, 0)
      .to(antennaL, {
        rotation: 15,
        duration: 0.35,
        ease: 'back.out(4)'
      })
      .to(antennaL, {
        rotation: -6,
        duration: 0.25,
        ease: 'sine.inOut'
      })
      .to(antennaL, {
        rotation: 3,
        duration: 0.18,
        ease: 'sine.inOut'
      })
      .to(antennaL, {
        rotation: 0,
        duration: 0.2,
        ease: 'sine.out'
      });

      tl.to(antennaR, {
        rotation: -20,
        duration: 0.6,
        ease: 'power3.in'
      }, 0)
      .to(antennaR, {
        rotation: 12,
        duration: 0.35,
        ease: 'back.out(4)'
      }, 0.6)
      .to(antennaR, {
        rotation: -5,
        duration: 0.25,
        ease: 'sine.inOut'
      })
      .to(antennaR, {
        rotation: 2,
        duration: 0.18,
        ease: 'sine.inOut'
      })
      .to(antennaR, {
        rotation: 0,
        duration: 0.2,
        ease: 'sine.out'
      });
    }

    activeTimelineRef.current = tl;
  };

  const spongeSqueeze = () => {
    const gsap = (window as any).gsap;
    const group = groupRef.current;
    const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
    const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);
    if (!group) return;

    const tl = gsap.timeline();

    // Initial compression - start to squeeze
    tl.to(group, {
      scaleX: 0.75,
      scaleY: 1.2,
      skewX: -8,
      rotation: -5,
      x: -10,
      y: 5,
      duration: 0.2,
      ease: 'power2.in'
    })
    // HEAVY SQUEEZE - completely asymmetric and wrong looking
    .to(group, {
      scaleX: 0.45,
      scaleY: 1.65,
      skewX: 25,
      skewY: -12,
      rotation: -22,
      x: -28,
      y: 18,
      duration: 0.25,
      ease: 'power3.in'
    })
    // Maximum deformation - hold for a beat to emphasize the wrongness
    .to(group, {
      scaleX: 0.38,
      scaleY: 1.75,
      skewX: 30,
      skewY: -18,
      rotation: -28,
      x: -35,
      y: 25,
      duration: 0.15,
      ease: 'power4.in'
    })
    // Hold the awful shape
    .to(group, { duration: 0.12 })
    // RELEASE! Spring box action - explosive recovery
    .to(group, {
      scaleX: 1.25,
      scaleY: 0.7,
      skewX: -15,
      skewY: 8,
      rotation: 12,
      x: 20,
      y: -12,
      duration: 0.18,
      ease: 'back.out(5)'
    })
    // Overshoot the other way
    .to(group, {
      scaleX: 0.82,
      scaleY: 1.18,
      skewX: 10,
      skewY: -5,
      rotation: -8,
      x: -8,
      y: 8,
      duration: 0.2,
      ease: 'power2.out'
    })
    // Another bounce
    .to(group, {
      scaleX: 1.12,
      scaleY: 0.88,
      skewX: -6,
      skewY: 3,
      rotation: 5,
      x: 5,
      y: -5,
      duration: 0.18,
      ease: 'power2.inOut'
    })
    // Smaller wobble
    .to(group, {
      scaleX: 0.95,
      scaleY: 1.05,
      skewX: 3,
      skewY: -2,
      rotation: -2,
      x: -2,
      y: 2,
      duration: 0.15,
      ease: 'power2.inOut'
    })
    // Final settle
    .to(group, {
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      rotation: 0,
      x: 0,
      y: 0,
      duration: 0.2,
      ease: 'elastic.out(1, 0.5)'
    });

    // Eyes get completely distorted during squeeze
    if (eyes.length) {
      tl.to(eyes, {
        scaleX: 0.6,
        scaleY: 1.5,
        rotation: -15,
        x: -10,
        y: 8,
        duration: 0.2,
        ease: 'power2.in'
      }, 0)
      .to(eyes, {
        scaleX: 0.4,
        scaleY: 1.9,
        rotation: 35,
        x: -15,
        y: 12,
        duration: 0.25,
        ease: 'power3.in'
      })
      .to(eyes, {
        scaleX: 0.32,
        scaleY: 2.1,
        rotation: 45,
        x: -18,
        y: 15,
        duration: 0.15,
        ease: 'power4.in'
      })
      .to(eyes, { duration: 0.12 })
      // Eyes spring back
      .to(eyes, {
        scaleX: 1.3,
        scaleY: 0.7,
        rotation: -20,
        x: 8,
        y: -6,
        duration: 0.18,
        ease: 'back.out(5)'
      })
      .to(eyes, {
        scaleX: 0.85,
        scaleY: 1.15,
        rotation: 10,
        x: -3,
        y: 4,
        duration: 0.2,
        ease: 'power2.out'
      })
      .to(eyes, {
        scaleX: 1.1,
        scaleY: 0.9,
        rotation: -5,
        x: 2,
        y: -2,
        duration: 0.18,
        ease: 'power2.inOut'
      })
      .to(eyes, {
        scaleX: 0.98,
        scaleY: 1.02,
        rotation: 2,
        x: -1,
        y: 1,
        duration: 0.15,
        ease: 'power2.inOut'
      })
      .to(eyes, {
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        x: 0,
        y: 0,
        duration: 0.2,
        ease: 'elastic.out(1, 0.5)'
      });
    }

    // Antennas get bent dramatically
    if (antennas.length === 2) {
      const [antennaL, antennaR] = antennas;

      // Left antenna bends way over
      tl.to(antennaL, {
        rotation: -35,
        scaleY: 1.2,
        duration: 0.45,
        ease: 'power3.in'
      }, 0)
      .to(antennaL, {
        rotation: -42,
        scaleY: 1.3,
        duration: 0.15,
        ease: 'power4.in'
      })
      .to(antennaL, { duration: 0.12 })
      .to(antennaL, {
        rotation: 18,
        scaleY: 0.85,
        duration: 0.18,
        ease: 'back.out(5)'
      })
      .to(antennaL, {
        rotation: -8,
        scaleY: 1.08,
        duration: 0.2,
        ease: 'power2.out'
      })
      .to(antennaL, {
        rotation: 4,
        scaleY: 0.96,
        duration: 0.18,
        ease: 'power2.inOut'
      })
      .to(antennaL, {
        rotation: 0,
        scaleY: 1,
        duration: 0.35,
        ease: 'elastic.out(1, 0.5)'
      });

      // Right antenna bends differently
      tl.to(antennaR, {
        rotation: 28,
        scaleY: 1.25,
        duration: 0.45,
        ease: 'power3.in'
      }, 0)
      .to(antennaR, {
        rotation: 38,
        scaleY: 1.35,
        duration: 0.15,
        ease: 'power4.in'
      }, 0.45)
      .to(antennaR, { duration: 0.12 }, 0.6)
      .to(antennaR, {
        rotation: -15,
        scaleY: 0.88,
        duration: 0.18,
        ease: 'back.out(5)'
      }, 0.72)
      .to(antennaR, {
        rotation: 6,
        scaleY: 1.06,
        duration: 0.2,
        ease: 'power2.out'
      }, 0.9)
      .to(antennaR, {
        rotation: -3,
        scaleY: 0.98,
        duration: 0.18,
        ease: 'power2.inOut'
      }, 1.1)
      .to(antennaR, {
        rotation: 0,
        scaleY: 1,
        duration: 0.35,
        ease: 'elastic.out(1, 0.5)'
      }, 1.28);
    }

    activeTimelineRef.current = tl;
  };

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />

      <div className="min-h-screen bg-[#fffef7] p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-[#2C3E1F] mb-2">
            Kochi Animation Test Lab
          </h1>
          <p className="text-gray-600 mb-8">
            Test GSAP animations without affecting the homepage. Click buttons to see animations!
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Kochi Display */}
            <div className="bg-white rounded-lg shadow-lg p-8 flex items-center justify-center">
              <svg
                ref={svgRef}
                viewBox="0 0 1024 1024"
                className="w-full max-w-[320px] h-auto"
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
            </div>

            {/* Control Panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">Quick Tests</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => playAnimation(testAnimation1)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test 1: Simple Bounce
                  </button>
                  <button
                    onClick={() => playAnimation(testAnimation2)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test 2: Spin Jump
                  </button>
                  <button
                    onClick={() => playAnimation(testAnimation3)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test 3: Squash & Stretch
                  </button>
                  <button
                    onClick={() => playAnimation(testAnimation4)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test 4: Shake with Fear
                  </button>
                  <button
                    onClick={() => playAnimation(testAnimation5)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Test 5: Wild Spin
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">HTML File Animations</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => playAnimation(squishAndBounce)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Squish and Bounce
                  </button>
                  <button
                    onClick={() => playAnimation(spinJump)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Spin Jump
                  </button>
                  <button
                    onClick={() => playAnimation(wiggle)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Wiggle
                  </button>
                  <button
                    onClick={() => playAnimation(pulse)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Pulse
                  </button>
                  <button
                    onClick={() => playAnimation(antennaSway)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Antenna Sway
                  </button>
                  <button
                    onClick={() => playAnimation(eyePop)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Eye Pop
                  </button>
                  <button
                    onClick={() => playAnimation(bored)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Bored
                  </button>
                  <button
                    onClick={() => playAnimation(playful)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Playful
                  </button>
                  <button
                    onClick={() => playAnimation(spongeSquish)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sponge Squish
                  </button>
                  <button
                    onClick={() => playAnimation(explode)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Explode
                  </button>
                  <button
                    onClick={() => playAnimation(electricBuzz)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Electric Buzz
                  </button>
                  <button
                    onClick={() => playAnimation(thinking)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Thinking
                  </button>
                  <button
                    onClick={() => playAnimation(ballRock)}
                    disabled={!gsapReady}
                    className="w-full bg-[#98D8C8] hover:bg-[#7cc4b1] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ball Rock
                  </button>
                  <button
                    onClick={() => playAnimation(funkySquishSpring)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FF9B71] hover:bg-[#ff8a5c] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🌟 Funky Squish Spring
                  </button>
                  <button
                    onClick={() => playAnimation(funkySquishSpringV2)}
                    disabled={!gsapReady}
                    className="w-full bg-[#FF9B71] hover:bg-[#ff8a5c] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ Funky Squish Spring v2
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">🧪 Experimental</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => playAnimation(spongeSqueeze)}
                    disabled={!gsapReady}
                    className="w-full bg-[#A78BFA] hover:bg-[#9c7ef5] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🧽 Sponge Squeeze (Spring Box)
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">Controls</h2>
                <button
                  onClick={resetPose}
                  disabled={!gsapReady}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Pose
                </button>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">💡 How to Use:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Edit animations in <code className="bg-blue-100 px-1 rounded">testAnimation1-5</code> functions</li>
                  <li>• Add new test buttons as needed</li>
                  <li>• Access refs: <code className="bg-blue-100 px-1 rounded">groupRef</code>, <code className="bg-blue-100 px-1 rounded">eyesRef</code>, <code className="bg-blue-100 px-1 rounded">antennasRef</code></li>
                  <li>• Use <code className="bg-blue-100 px-1 rounded">resetPose()</code> to return to neutral</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-100 rounded-lg p-6">
            <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">Code Reference</h2>
            <pre className="text-xs bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
{`// Example animation structure:
const testAnimation = () => {
  const gsap = (window as any).gsap;
  const group = groupRef.current;
  const eyes = [eyesRef.current.left, eyesRef.current.right].filter(Boolean);
  const antennas = [antennasRef.current.left, antennasRef.current.right].filter(Boolean);

  const tl = gsap.timeline();
  tl.to(group, { y: -100, duration: 0.5, ease: "power2.out" })
    .to(group, { y: 0, duration: 0.6, ease: "bounce.out" });

  activeTimelineRef.current = tl;
};`}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
