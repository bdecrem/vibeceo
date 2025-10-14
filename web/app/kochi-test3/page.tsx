"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function KochiGSAPTestPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rigRef = useRef<SVGGElement | null>(null);
  const faceRef = useRef<SVGPathElement | null>(null);
  const antLRef = useRef<SVGPathElement | null>(null);
  const antRRef = useRef<SVGPathElement | null>(null);
  const lidLRef = useRef<SVGRectElement | null>(null);
  const lidRRef = useRef<SVGRectElement | null>(null);
  const [gsapReady, setGsapReady] = useState(false);
  const yBaseLRef = useRef(369.53);
  const yBaseRRef = useRef(370.47);
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

      // Set transform origins with GSAP
      gsap.set(rig, { transformOrigin: "50% 100%" });
      gsap.set([antL, antR], { transformOrigin: "50% 100%" });
      gsap.set([face], { transformOrigin: "50% 50%" });
    }
  }, [gsapReady]);

  const bounce = () => {
    if (!gsapReady || !rigRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    tl.to(rigRef.current, { scaleX: 1.05, scaleY: 0.96, y: 0, duration: 0.2, ease: 'power2.in' })
      .to([antLRef.current, antRRef.current], { rotation: -3, duration: 0.2, ease: 'power2.in' }, 0)
      .to(rigRef.current, { scaleX: 1.40, scaleY: 0.70, y: 4, duration: 0.2, ease: 'power2.in' })
      .to([antLRef.current, antRRef.current], { rotation: 8, duration: 0.2 }, '<')
      .to(lidLRef.current, { y: yBaseLRef.current + 26, duration: 0.2 }, '<')
      .to(lidRRef.current, { y: yBaseRRef.current + 26, duration: 0.2 }, '<')
      .to(rigRef.current, { scaleX: 0.90, scaleY: 1.12, y: -2, duration: 0.25, ease: 'power2.out' })
      .to([antLRef.current, antRRef.current], { rotation: -6, duration: 0.25 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.25 }, '<')
      .to(rigRef.current, { scaleX: 1.08, scaleY: 0.93, y: 1, duration: 0.2 })
      .to([antLRef.current, antRRef.current], { rotation: 4, duration: 0.2 }, '<')
      .to(rigRef.current, { scaleX: 0.98, scaleY: 1.02, y: 0, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: -2, duration: 0.15 }, '<')
      .to(rigRef.current, { scaleX: 1, scaleY: 1, y: 0, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.15 }, '<');

    activeTimelineRef.current = tl;
  };

  const blink = () => {
    if (!gsapReady || !lidLRef.current || !lidRRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    tl.to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 60, duration: 0.1 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.1 });

    activeTimelineRef.current = tl;
  };

  const squint = () => {
    if (!gsapReady || !lidLRef.current || !lidRRef.current) return;
    const gsap = (window as any).gsap;

    gsap.to(lidLRef.current, { y: yBaseLRef.current + 28, duration: 0.2 });
    gsap.to(lidRRef.current, { y: yBaseRRef.current + 28, duration: 0.2 });
  };

  const resetSquint = () => {
    if (!gsapReady || !lidLRef.current || !lidRRef.current) return;
    const gsap = (window as any).gsap;

    gsap.to(lidLRef.current, { y: yBaseLRef.current, duration: 0.2 });
    gsap.to(lidRRef.current, { y: yBaseRRef.current, duration: 0.2 });
  };

  const wiggle = () => {
    if (!gsapReady || !antLRef.current || !antRRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    tl.to([antLRef.current, antRRef.current], { rotation: -15, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: 15, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: -10, duration: 0.12 })
      .to([antLRef.current, antRRef.current], { rotation: 10, duration: 0.12 })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.1 });

    activeTimelineRef.current = tl;
  };

  const hop = () => {
    if (!gsapReady || !rigRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    tl.to(rigRef.current, { scaleX: 1.1, scaleY: 0.9, y: 2, duration: 0.2, ease: 'power2.in' })
      .to([antLRef.current, antRRef.current], { rotation: -5, duration: 0.2 }, '<')
      .to(rigRef.current, { scaleX: 0.9, scaleY: 1.2, y: -40, duration: 0.25, ease: 'power2.out' })
      .to([antLRef.current, antRRef.current], { rotation: 10, duration: 0.25 }, '<')
      .to(rigRef.current, { scaleX: 0.95, scaleY: 1.1, y: -35, duration: 0.1 })
      .to([antLRef.current, antRRef.current], { rotation: 8, duration: 0.1 }, '<')
      .to(rigRef.current, { scaleX: 1.15, scaleY: 0.85, y: 3, duration: 0.2, ease: 'power2.in' })
      .to([antLRef.current, antRRef.current], { rotation: -3, duration: 0.2 }, '<')
      .to(rigRef.current, { scaleX: 0.98, scaleY: 1.02, y: 0, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.15 }, '<')
      .to(rigRef.current, { scaleX: 1, scaleY: 1, y: 0, duration: 0.1 });

    activeTimelineRef.current = tl;
  };

  const ballMorph = () => {
    if (!gsapReady || !rigRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    tl.to(rigRef.current, { scale: 0.9, duration: 0.2, ease: 'power2.in' })
      .to([antLRef.current, antRRef.current], { rotation: -5, duration: 0.2 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 10, duration: 0.2 }, '<')
      .to(rigRef.current, { scale: 0.75, duration: 0.2 })
      .to([antLRef.current, antRRef.current], { rotation: -8, duration: 0.2 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 20, duration: 0.2 }, '<')
      .to(rigRef.current, { scale: 0.65, duration: 0.2 })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.2 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 30, duration: 0.2 }, '<')
      .to(rigRef.current, { scale: 0.6, duration: 0.2 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 35, duration: 0.2 }, '<')
      .to(rigRef.current, { scale: 0.65, duration: 0.15 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 30, duration: 0.15 }, '<')
      .to(rigRef.current, { scale: 1.15, duration: 0.25, ease: 'back.out(2)' })
      .to([antLRef.current, antRRef.current], { rotation: 10, duration: 0.25 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.25 }, '<')
      .to(rigRef.current, { scale: 0.92, duration: 0.2 })
      .to([antLRef.current, antRRef.current], { rotation: -3, duration: 0.2 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 5, duration: 0.2 }, '<')
      .to(rigRef.current, { scale: 1.05, duration: 0.15 })
      .to([antLRef.current, antRRef.current], { rotation: 2, duration: 0.15 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.15 }, '<')
      .to(rigRef.current, { scale: 0.98, duration: 0.12 })
      .to([antLRef.current, antRRef.current], { rotation: -1, duration: 0.12 }, '<')
      .to(rigRef.current, { scale: 1, duration: 0.12 })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.12 }, '<');

    activeTimelineRef.current = tl;
  };

  const napTime = () => {
    if (!gsapReady || !rigRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    // 1. Big yawn
    tl.to(rigRef.current, { scaleX: 0.95, scaleY: 1.08, duration: 0.4, ease: 'power1.in' })
      .to([antLRef.current, antRRef.current], { rotation: -8, duration: 0.4 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 45, duration: 0.3, ease: 'power2.in' }, '<')
      .to(rigRef.current, { scaleX: 1.05, scaleY: 0.95, duration: 0.2, ease: 'power1.out' })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.25, ease: 'power1.out' })

    // 2. Sleepy eyes start to droop
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 15, duration: 0.6, ease: 'power1.inOut' }, '+=0.2')
      .to([antLRef.current, antRRef.current], { rotation: -12, duration: 0.6, ease: 'power1.inOut' }, '<')

    // 3. Curl up into a cozy ball
      .to(rigRef.current, { scaleX: 0.92, scaleY: 0.92, y: 8, duration: 0.8, ease: 'sine.inOut' })
      .to([antLRef.current, antRRef.current], { rotation: -18, duration: 0.8, ease: 'sine.inOut' }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 28, duration: 0.8, ease: 'sine.inOut' }, '<')

    // 4. Eyes slowly close all the way
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 50, duration: 1.2, ease: 'sine.in' })
      .to([antLRef.current, antRRef.current], { rotation: -22, duration: 1.2, ease: 'sine.inOut' }, '<')

    // 5. Settle into sleep position
      .to(rigRef.current, { scaleX: 0.88, scaleY: 0.88, y: 12, duration: 0.6, ease: 'sine.out' })

    // 6. Gentle breathing loop (3 cycles)
      .to(rigRef.current, { scaleX: 0.9, scaleY: 0.86, duration: 1.2, ease: 'sine.inOut' })
      .to(rigRef.current, { scaleX: 0.88, scaleY: 0.88, duration: 1.2, ease: 'sine.inOut' })
      .to(rigRef.current, { scaleX: 0.9, scaleY: 0.86, duration: 1.2, ease: 'sine.inOut' })
      .to(rigRef.current, { scaleX: 0.88, scaleY: 0.88, duration: 1.2, ease: 'sine.inOut' })
      .to(rigRef.current, { scaleX: 0.9, scaleY: 0.86, duration: 1.2, ease: 'sine.inOut' })
      .to(rigRef.current, { scaleX: 0.88, scaleY: 0.88, duration: 1.2, ease: 'sine.inOut' })

    // 7. Wake up! Eyes flutter open
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 35, duration: 0.15, ease: 'power1.out' }, '+=0.3')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 45, duration: 0.12 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 20, duration: 0.15 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 30, duration: 0.12 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.3, ease: 'power1.out' })

    // 8. Stretch and return to normal
      .to(rigRef.current, { scaleX: 0.85, scaleY: 1.15, y: -5, duration: 0.4, ease: 'power2.out' })
      .to([antLRef.current, antRRef.current], { rotation: 10, duration: 0.4, ease: 'power2.out' }, '<')
      .to(rigRef.current, { scaleX: 1.08, scaleY: 0.92, y: 2, duration: 0.3, ease: 'power1.inOut' })
      .to([antLRef.current, antRRef.current], { rotation: -5, duration: 0.3 }, '<')
      .to(rigRef.current, { scaleX: 1, scaleY: 1, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' }, '<');

    activeTimelineRef.current = tl;
  };

  const megaSneeze = () => {
    if (!gsapReady || !rigRef.current) return;
    const gsap = (window as any).gsap;

    activeTimelineRef.current?.kill();
    const tl = gsap.timeline();

    // 1. Pre-tickle - something is bothering his antenna!
    tl.to(antLRef.current, { rotation: -5, duration: 0.15 })
      .to(antLRef.current, { rotation: 5, duration: 0.12 })
      .to(antLRef.current, { rotation: -4, duration: 0.1 })
      .to(antLRef.current, { rotation: 3, duration: 0.08 })
      .to(antLRef.current, { rotation: 0, duration: 0.1 })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 12, duration: 0.15 }, '<')

    // 2. First build-up - deep inhale, eyes go WIDE
      .to(rigRef.current, { scaleX: 1.15, scaleY: 1.08, y: -3, duration: 0.5, ease: 'power2.in' }, '+=0.2')
      .to([antLRef.current, antRRef.current], { rotation: -25, duration: 0.5, ease: 'power2.in' }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current - 15, duration: 0.5, ease: 'power2.in' }, '<')

    // 3. FAKE OUT - almost... almost... nope!
      .to(rigRef.current, { scaleX: 1.08, scaleY: 1.04, y: -1, duration: 0.3, ease: 'power1.out' })
      .to([antLRef.current, antRRef.current], { rotation: -15, duration: 0.3 }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 5, duration: 0.3 }, '<')

    // 4. Second build-up - EVEN BIGGER, eyes MASSIVE
      .to(rigRef.current, { scaleX: 1.25, scaleY: 1.15, y: -5, duration: 0.6, ease: 'power2.in' }, '+=0.15')
      .to([antLRef.current, antRRef.current], { rotation: -35, duration: 0.6, ease: 'power2.in' }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current - 25, duration: 0.6, ease: 'power2.in' }, '<')

    // Hold the tension...
      .to(rigRef.current, { scaleX: 1.28, scaleY: 1.18, duration: 0.2 })

    // 5. THE SNEEZE!!! - Ultra-fast squash forward
      .to(rigRef.current, { scaleX: 0.7, scaleY: 1.25, y: 5, duration: 0.08, ease: 'power4.in' })
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 55, duration: 0.08, ease: 'power4.in' }, '<')
      .to([antLRef.current, antRRef.current], { rotation: 20, duration: 0.08 }, '<')

    // 6. RECOIL - shoots backward with rotation!
      .to(rigRef.current, {
        scaleX: 0.85,
        scaleY: 1.15,
        y: -8,
        x: -60,
        rotation: -180,
        duration: 0.7,
        ease: 'power2.out'
      })
      .to([antLRef.current, antRRef.current], { rotation: 45, duration: 0.3, ease: 'power2.out' }, '<')
      .to([antLRef.current, antRRef.current], { rotation: -30, duration: 0.2 }, '-=0.3')
      .to([antLRef.current, antRRef.current], { rotation: 25, duration: 0.2 })

    // 7. Crash landing - bounces
      .to(rigRef.current, {
        scaleX: 1.2,
        scaleY: 0.75,
        y: 8,
        x: -70,
        rotation: -180,
        duration: 0.25,
        ease: 'power2.in'
      })
      .to([antLRef.current, antRRef.current], { rotation: -15, duration: 0.25 }, '<')
      .to(rigRef.current, {
        scaleX: 0.95,
        scaleY: 1.05,
        y: 3,
        rotation: -170,
        duration: 0.2,
        ease: 'power1.out'
      })
      .to([antLRef.current, antRRef.current], { rotation: 8, duration: 0.2 }, '<')

    // 8. Dizzy spin - eyes squinted, wobbling
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 25, duration: 0.3 })
      .to(rigRef.current, {
        rotation: -90,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: 0.6,
        ease: 'sine.inOut'
      })
      .to([antLRef.current, antRRef.current], { rotation: -3, duration: 0.6, ease: 'sine.inOut' }, '<')
      .to(rigRef.current, { rotation: 0, duration: 0.6, ease: 'sine.inOut' })
      .to([antLRef.current, antRRef.current], { rotation: 2, duration: 0.6 }, '<')

    // 9. Recovery - shake head, snap back to position
      .to(rigRef.current, {
        scaleX: 0.92,
        scaleY: 1.08,
        rotation: -8,
        duration: 0.2,
        ease: 'power2.in'
      })
      .to(rigRef.current, {
        scaleX: 1.08,
        scaleY: 0.92,
        rotation: 8,
        duration: 0.2
      })
      .to(rigRef.current, {
        scaleX: 1,
        scaleY: 1,
        x: 0,
        y: 0,
        rotation: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)'
      })
      .to([antLRef.current, antRRef.current], { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, '<')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.3, ease: 'power1.out' }, '<')

    // Satisfied blink
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current + 50, duration: 0.12 }, '+=0.2')
      .to([lidLRef.current, lidRRef.current], { y: yBaseLRef.current, duration: 0.15 });

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
            Kochi GSAP Rigged Test
          </h1>
          <p className="text-gray-600 mb-8">
            Same rigged character using GSAP for smooth tweening
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
                <h2 className="text-xl font-bold text-[#2C3E1F] mb-4">GSAP Animation Controls</h2>
                <div className="space-y-2">
                  <button
                    onClick={bounce}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🎾 Bounce
                  </button>
                  <button
                    onClick={blink}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    👁️ Blink
                  </button>
                  <button
                    onClick={() => squint()}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    😑 Squint
                  </button>
                  <button
                    onClick={resetSquint}
                    disabled={!gsapReady}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Eyes
                  </button>
                  <button
                    onClick={wiggle}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📡 Wiggle Antennae
                  </button>
                  <button
                    onClick={hop}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🦘 Hop
                  </button>
                  <button
                    onClick={ballMorph}
                    disabled={!gsapReady}
                    className="w-full bg-[#FFE148] hover:bg-[#ffd700] text-[#2C3E1F] font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ⚪ Ball Morph
                  </button>
                  <button
                    onClick={napTime}
                    disabled={!gsapReady}
                    className="w-full bg-[#C4B5FD] hover:bg-[#a78bfa] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    😴 Nap Time (adorable!)
                  </button>
                  <button
                    onClick={megaSneeze}
                    disabled={!gsapReady}
                    className="w-full bg-[#FF6B6B] hover:bg-[#ee5a52] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🤧 MEGA SNEEZE (hilarious!)
                  </button>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">🚀 GSAP Features:</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Smooth tweening with easing functions</li>
                  <li>• Timeline-based sequencing</li>
                  <li>• Parallel animations with position parameters</li>
                  <li>• Same rigged structure as kochi-test2</li>
                  <li>• Clip-path eye lids + transform-origin pivots</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
