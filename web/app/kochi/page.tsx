"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
    kochi: '"I\'ve been going hard and need a few days to recharge so I can keep delivering quality work." Frame it as investment, not weakness.'
  },
  {
    user: "Recommend a book for a long flight",
    kochi: "Tomorrow, and Tomorrow, and Tomorrow by Gabrielle Zevin. About friendship, games, and creativity. You won't want to land."
  }
];

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

function KochiMascot(): JSX.Element {
  const containerRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const antennaLRef = useRef<SVGPathElement | null>(null);
  const antennaRRef = useRef<SVGPathElement | null>(null);
  const eyeLRef = useRef<SVGPathElement | null>(null);
  const eyeRRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const group = groupRef.current;
    const antennaL = antennaLRef.current;
    const antennaR = antennaRRef.current;
    const eyeL = eyeLRef.current;
    const eyeR = eyeRRef.current;

    if (!container || !group || !antennaL || !antennaR || !eyeL || !eyeR) {
      return;
    }

    const squishAndBounce = () => {
      group.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.15, 0.7)", offset: 0.15 },
          { transform: "scale(1.25, 0.6)", offset: 0.3 },
          { transform: "scale(0.9, 1.15)", offset: 0.5 },
          { transform: "scale(1.05, 0.95)", offset: 0.65 },
          { transform: "scale(0.98, 1.02)", offset: 0.8 },
          { transform: "scale(1.01, 0.99)", offset: 0.9 },
          { transform: "scale(1, 1)", offset: 1 }
        ],
        {
          duration: 2000,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          iterations: 1
        }
      );
    };

    const spinJump = () => {
      group.animate(
        [
          { transform: "rotate(0deg) translateY(0px)" },
          { transform: "rotate(180deg) translateY(-60px)", offset: 0.4 },
          { transform: "rotate(360deg) translateY(-80px)", offset: 0.5 },
          { transform: "rotate(360deg) translateY(0px)", offset: 0.85 },
          { transform: "rotate(360deg) translateY(-15px)", offset: 0.92 },
          { transform: "rotate(360deg) translateY(0px)", offset: 1 }
        ],
        { duration: 1000, easing: "ease-out", iterations: 1 }
      );
    };

    const wiggle = () => {
      group.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-15deg)", offset: 0.15 },
          { transform: "rotate(12deg)", offset: 0.3 },
          { transform: "rotate(-10deg)", offset: 0.45 },
          { transform: "rotate(8deg)", offset: 0.6 },
          { transform: "rotate(-5deg)", offset: 0.75 },
          { transform: "rotate(3deg)", offset: 0.85 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        { duration: 800, easing: "ease-in-out", iterations: 1 }
      );
    };

    const pulse = () => {
      group.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.2)", offset: 0.2 },
          { transform: "scale(0.95)", offset: 0.4 },
          { transform: "scale(1.15)", offset: 0.6 },
          { transform: "scale(0.98)", offset: 0.8 },
          { transform: "scale(1)", offset: 1 }
        ],
        { duration: 900, easing: "ease-in-out", iterations: 1 }
      );
    };

    const antennaSway = () => {
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      const timing = { duration: 2500, easing: "ease-in-out", iterations: 1 };

      antennaL.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(8deg)", offset: 0.25 },
          { transform: "rotate(0deg)", offset: 0.5 },
          { transform: "rotate(-8deg)", offset: 0.75 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        timing
      );

      antennaR.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-8deg)", offset: 0.25 },
          { transform: "rotate(0deg)", offset: 0.5 },
          { transform: "rotate(8deg)", offset: 0.75 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        timing
      );
    };

    const eyePop = () => {
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const keyframes = [
        { transform: "scale(1)" },
        { transform: "scale(1.8)", offset: 0.2 },
        { transform: "scale(1.6)", offset: 0.35 },
        { transform: "scale(1.9)", offset: 0.5 },
        { transform: "scale(0.9)", offset: 0.7 },
        { transform: "scale(1.1)", offset: 0.85 },
        { transform: "scale(1)", offset: 1 }
      ];
      const timing = { duration: 1000, easing: "ease-out", iterations: 1 };
      eyeL.animate(keyframes, timing);
      eyeR.animate(keyframes, timing);
    };

    const bored = () => {
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      const timing = { duration: 2000, easing: "ease-in-out", iterations: 1 };

      group.animate(
        [
          { transform: "translateY(0px) scale(1, 1)" },
          { transform: "translateY(20px) scale(1.02, 0.95)", offset: 0.3 },
          { transform: "translateY(20px) scale(1.02, 0.95)", offset: 0.7 },
          { transform: "translateY(0px) scale(1, 1)", offset: 1 }
        ],
        timing
      );

      const eyeKeyframes = [
        { transform: "translateY(0px) scale(1, 1)" },
        { transform: "translateY(8px) scale(1.1, 0.7)", offset: 0.3 },
        { transform: "translateY(8px) scale(1.1, 0.7)", offset: 0.7 },
        { transform: "translateY(0px) scale(1, 1)", offset: 1 }
      ];

      eyeL.animate(eyeKeyframes, timing);
      eyeR.animate(eyeKeyframes, timing);

      const antennaKeyframes = [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-12deg)", offset: 0.3 },
        { transform: "rotate(-12deg)", offset: 0.7 },
        { transform: "rotate(0deg)", offset: 1 }
      ];

      antennaL.animate(antennaKeyframes, timing);
      antennaR.animate(antennaKeyframes, timing);
    };

    const playful = () => {
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const timing = { duration: 1400, easing: "ease-in-out", iterations: 1 };

      group.animate(
        [
          { transform: "translateY(0px) rotate(0deg)" },
          { transform: "translateY(-30px) rotate(-5deg)", offset: 0.15 },
          { transform: "translateY(0px) rotate(0deg)", offset: 0.3 },
          { transform: "translateY(-25px) rotate(5deg)", offset: 0.45 },
          { transform: "translateY(0px) rotate(0deg)", offset: 0.6 },
          { transform: "translateY(-20px) rotate(-3deg)", offset: 0.75 },
          { transform: "translateY(0px) rotate(0deg)", offset: 0.9 },
          { transform: "translateY(0px) rotate(0deg)", offset: 1 }
        ],
        timing
      );

      antennaL.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(15deg)", offset: 0.12 },
          { transform: "rotate(-10deg)", offset: 0.25 },
          { transform: "rotate(12deg)", offset: 0.37 },
          { transform: "rotate(-8deg)", offset: 0.5 },
          { transform: "rotate(10deg)", offset: 0.62 },
          { transform: "rotate(-6deg)", offset: 0.75 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        timing
      );

      antennaR.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-15deg)", offset: 0.12 },
          { transform: "rotate(10deg)", offset: 0.25 },
          { transform: "rotate(-12deg)", offset: 0.37 },
          { transform: "rotate(8deg)", offset: 0.5 },
          { transform: "rotate(-10deg)", offset: 0.62 },
          { transform: "rotate(6deg)", offset: 0.75 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        timing
      );

      const eyeKeyframes = [
        { transform: "scale(1)" },
        { transform: "scale(1.15)", offset: 0.15 },
        { transform: "scale(0.95)", offset: 0.3 },
        { transform: "scale(1.1)", offset: 0.45 },
        { transform: "scale(0.98)", offset: 0.6 },
        { transform: "scale(1.05)", offset: 0.75 },
        { transform: "scale(1)", offset: 1 }
      ];

      eyeL.animate(eyeKeyframes, timing);
      eyeR.animate(eyeKeyframes, timing);
    };

    const spongeSquish = () => {
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const timing = {
        duration: 1600,
        easing: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
        iterations: 1
      };

      group.animate(
        [
          { transform: "scale(1, 1) skewX(0deg)" },
          { transform: "scale(0.6, 1.3) skewX(0deg)", offset: 0.15 },
          { transform: "scale(0.5, 1.5) skewX(15deg)", offset: 0.25 },
          { transform: "scale(0.4, 1.6) skewX(-20deg)", offset: 0.35 },
          { transform: "scale(0.7, 1.2) skewX(10deg)", offset: 0.5 },
          { transform: "scale(1.3, 0.8) skewX(-5deg)", offset: 0.65 },
          { transform: "scale(0.95, 1.08) skewX(3deg)", offset: 0.78 },
          { transform: "scale(1.05, 0.97) skewX(-2deg)", offset: 0.88 },
          { transform: "scale(1, 1) skewX(0deg)", offset: 1 }
        ],
        timing
      );

      const eyeKeyframes = [
        { transform: "scale(1, 1)" },
        { transform: "scale(0.7, 1.4)", offset: 0.25 },
        { transform: "scale(0.5, 1.7)", offset: 0.35 },
        { transform: "scale(1.3, 0.8)", offset: 0.65 },
        { transform: "scale(1, 1)", offset: 1 }
      ];

      eyeL.animate(eyeKeyframes, timing);
      eyeR.animate(eyeKeyframes, timing);
    };

    const explode = () => {
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const timing = {
        duration: 2500,
        easing: "cubic-bezier(0.68, -0.55, 0.27, 1.55)",
        iterations: 1
      };

      group.animate(
        [
          { transform: "scale(1) rotate(0deg)", opacity: 1 },
          { transform: "scale(1.5) rotate(0deg)", opacity: 1, offset: 0.1 },
          { transform: "scale(3) rotate(720deg)", opacity: 0.3, offset: 0.35 },
          { transform: "scale(0.1) rotate(1080deg)", opacity: 0, offset: 0.5 },
          { transform: "scale(0.1) rotate(1440deg)", opacity: 0, offset: 0.65 },
          { transform: "scale(2) rotate(1800deg)", opacity: 0.5, offset: 0.8 },
          { transform: "scale(0.8) rotate(2160deg)", opacity: 1, offset: 0.92 },
          { transform: "scale(1) rotate(2160deg)", opacity: 1, offset: 1 }
        ],
        timing
      );

      const antennaExplode = (direction: 1 | -1) => [
        { transform: "rotate(0deg) translateX(0px) translateY(0px)", opacity: 1 },
        {
          transform: `rotate(${180 * direction}deg) translateX(${150 * direction}px) translateY(-200px)`,
          opacity: 0,
          offset: 0.35
        },
        {
          transform: `rotate(${180 * direction}deg) translateX(${150 * direction}px) translateY(-200px)`,
          opacity: 0,
          offset: 0.65
        },
        { transform: "rotate(0deg) translateX(0px) translateY(0px)", opacity: 1, offset: 1 }
      ];

      antennaL.animate(antennaExplode(-1), timing);
      antennaR.animate(antennaExplode(1), timing);

      const eyeExplode = (direction: 1 | -1) => [
        { transform: "scale(1) translateX(0px) translateY(0px)", opacity: 1 },
        {
          transform: `scale(3) translateX(${120 * direction}px) translateY(${direction === 1 ? -80 : 100}px) rotate(${360 * -direction}deg)`,
          opacity: 0,
          offset: 0.35
        },
        {
          transform: `scale(3) translateX(${120 * direction}px) translateY(${direction === 1 ? -80 : 100}px) rotate(${360 * -direction}deg)`,
          opacity: 0,
          offset: 0.65
        },
        {
          transform: `scale(1) translateX(0px) translateY(0px) rotate(${720 * -direction}deg)` ,
          opacity: 1,
          offset: 1
        }
      ];

      eyeL.animate(eyeExplode(-1), timing);
      eyeR.animate(eyeExplode(1), timing);
    };

    const electricBuzz = () => {
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const timing = { duration: 1500, easing: "linear", iterations: 1 };

      const buzzFrames = [
        { transform: "rotate(0deg)" },
        { transform: "rotate(4deg)", offset: 0.1 },
        { transform: "rotate(-3deg)", offset: 0.2 },
        { transform: "rotate(5deg)", offset: 0.3 },
        { transform: "rotate(-4deg)", offset: 0.4 },
        { transform: "rotate(3deg)", offset: 0.5 },
        { transform: "rotate(-5deg)", offset: 0.6 },
        { transform: "rotate(4deg)", offset: 0.7 },
        { transform: "rotate(-3deg)", offset: 0.8 },
        { transform: "rotate(2deg)", offset: 0.9 },
        { transform: "rotate(0deg)", offset: 1 }
      ];

      antennaL.animate(buzzFrames, timing);
      antennaR.animate(buzzFrames, timing);

      group.animate(
        [
          { transform: "translateX(0px)" },
          { transform: "translateX(3px)", offset: 0.1 },
          { transform: "translateX(-3px)", offset: 0.2 },
          { transform: "translateX(3px)", offset: 0.3 },
          { transform: "translateX(-3px)", offset: 0.4 },
          { transform: "translateX(3px)", offset: 0.5 },
          { transform: "translateX(-3px)", offset: 0.6 },
          { transform: "translateX(3px)", offset: 0.7 },
          { transform: "translateX(-3px)", offset: 0.8 },
          { transform: "translateX(2px)", offset: 0.9 },
          { transform: "translateX(0px)", offset: 1 }
        ],
        timing
      );

      const eyeFlicker = [
        { opacity: 1 },
        { opacity: 0.3, offset: 0.15 },
        { opacity: 1, offset: 0.2 },
        { opacity: 0.4, offset: 0.35 },
        { opacity: 1, offset: 0.4 },
        { opacity: 0.2, offset: 0.55 },
        { opacity: 1, offset: 0.6 },
        { opacity: 0.5, offset: 0.75 },
        { opacity: 1, offset: 0.8 },
        { opacity: 1, offset: 1 }
      ];

      eyeL.animate(eyeFlicker, timing);
      eyeR.animate(eyeFlicker, timing);
    };

    const thinking = () => {
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      const timing = { duration: 2200, easing: "ease-in-out", iterations: 1 };

      const eyeKeyframes = [
        { transform: "scale(1, 1) translateX(0px) translateY(0px)" },
        { transform: "scale(1, 0.4) translateX(0px) translateY(0px)", offset: 0.15 },
        { transform: "scale(1, 0.4) translateX(15px) translateY(-10px)", offset: 0.35 },
        { transform: "scale(1, 0.4) translateX(-12px) translateY(-8px)", offset: 0.55 },
        { transform: "scale(1, 0.4) translateX(-5px) translateY(5px)", offset: 0.7 },
        { transform: "scale(1, 0.4) translateX(0px) translateY(0px)", offset: 0.85 },
        { transform: "scale(1, 1) translateX(0px) translateY(0px)", offset: 1 }
      ];

      eyeL.animate(eyeKeyframes, timing);
      eyeR.animate(eyeKeyframes, timing);

      group.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(5deg)", offset: 0.3 },
          { transform: "rotate(5deg)", offset: 0.6 },
          { transform: "rotate(-3deg)", offset: 0.8 },
          { transform: "rotate(0deg)", offset: 1 }
        ],
        timing
      );

      const antennaKeyframes = [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-8deg)", offset: 0.25 },
        { transform: "rotate(-8deg)", offset: 0.75 },
        { transform: "rotate(0deg)", offset: 1 }
      ];

      antennaL.animate(antennaKeyframes, timing);
      antennaR.animate(antennaKeyframes, timing);
    };

    const ballRock = () => {
      antennaL.style.transformOrigin = "355px 340px";
      antennaR.style.transformOrigin = "668px 340px";
      eyeL.style.transformOrigin = "430px 517px";
      eyeR.style.transformOrigin = "625px 517px";
      const timing = { duration: 2500, easing: "ease-in-out", iterations: 1 };

      group.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.1, 0.85)", offset: 0.1 },
          { transform: "scale(1.15, 0.85)", offset: 0.2 },
          { transform: "scale(1.15, 0.85) rotate(25deg)", offset: 0.35 },
          { transform: "scale(1.15, 0.85) rotate(-25deg)", offset: 0.5 },
          { transform: "scale(1.15, 0.85) rotate(20deg)", offset: 0.62 },
          { transform: "scale(1.15, 0.85) rotate(-20deg)", offset: 0.74 },
          { transform: "scale(1.15, 0.85) rotate(12deg)", offset: 0.82 },
          { transform: "scale(1.15, 0.85) rotate(-12deg)", offset: 0.88 },
          { transform: "scale(1.15, 0.85) rotate(5deg)", offset: 0.93 },
          { transform: "scale(0.95, 1.05) rotate(0deg)", offset: 0.97 },
          { transform: "scale(1, 1) rotate(0deg)", offset: 1 }
        ],
        timing
      );

      const antennaRetract = [
        { transform: "scale(1, 1) rotate(0deg)", opacity: 1 },
        { transform: "scale(1, 0.3) rotate(0deg)", opacity: 0.3, offset: 0.15 },
        { transform: "scale(1, 0.1) rotate(0deg)", opacity: 0, offset: 0.2 },
        { transform: "scale(1, 0.1) rotate(0deg)", opacity: 0, offset: 0.88 },
        { transform: "scale(1, 0.5) rotate(0deg)", opacity: 0.5, offset: 0.94 },
        { transform: "scale(1, 1) rotate(0deg)", opacity: 1, offset: 1 }
      ];

      antennaL.animate(antennaRetract, timing);
      antennaR.animate(antennaRetract, timing);

      const eyeKeyframes = [
        { transform: "rotate(0deg)" },
        { transform: "rotate(0deg)", offset: 0.2 },
        { transform: "rotate(180deg)", offset: 0.4 },
        { transform: "rotate(360deg)", offset: 0.6 },
        { transform: "rotate(540deg)", offset: 0.8 },
        { transform: "rotate(720deg)", offset: 0.95 },
        { transform: "rotate(720deg)", offset: 1 }
      ];

      eyeL.animate(eyeKeyframes, timing);
      eyeR.animate(eyeKeyframes, timing);
    };

    const randomAnimations = [
      spinJump,
      wiggle,
      pulse,
      antennaSway,
      eyePop,
      bored,
      playful,
      spongeSquish,
      explode,
      electricBuzz,
      thinking,
      ballRock
    ];

    const handleClick = () => {
      randomFrom(randomAnimations)();
    };

    container.addEventListener("click", handleClick);
    const timeoutId = window.setTimeout(squishAndBounce, 500);
    const intervalId = window.setInterval(squishAndBounce, 8000);

    return () => {
      container.removeEventListener("click", handleClick);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <svg
      ref={containerRef}
      width="100%"
      height="100%"
      viewBox="0 0 1024 1024"
      className="w-[240px] h-[240px] md:w-[320px] md:h-[320px] cursor-pointer transition-transform duration-100 hover:scale-105"
    >
      <g ref={groupRef} style={{ transformOrigin: "512px 512px" }}>
        <path
          ref={antennaLRef}
          fill="#E7D8B2"
          d="M340.3,340.46l.07-85.28c-3.86-1.57-7.22-3.36-10.54-5.9-8.65-6.52-14.33-16.24-15.74-26.98-3.11-23.88,12.76-43.28,36.49-45.98,5.34-.55,11.32.08,16.46,1.6,10.58,3.05,19.49,10.23,24.72,19.92,5.09,9.28,6.15,20.23,2.96,30.32-4.25,13.68-12.21,20.82-24.35,27.24.3,24.83-.61,60.23-.75,85.07h-29.32Z"
        />
        <path
          ref={antennaRRef}
          fill="#E7D8B2"
          d="M653.82,340.46v-84.79c-3.31-1.74-6.16-3.07-9.19-5.32-13.89-10.31-20.03-27.29-15.34-44.1,2.91-10.52,9.98-19.41,19.57-24.62,9.85-5.44,21.48-6.68,32.26-3.43,10.58,3.21,19.14,9.94,24.26,19.78,5.03,9.73,5.99,21.07,2.68,31.51-4.28,13.19-12.96,20.02-24.78,26.05v84.93h-29.45Z"
        />
        <path
          fill="#E7D8B2"
          d="M683.45,329.82c18.98,2.8,33.24,6.06,50.76,14.62,35.89,17.46,63.28,48.56,76.07,86.36,4.06,11.82,6.61,24.12,7.58,36.58,1.18,15.89.58,37.02.57,53.36v89.61s0,70.4,0,70.4c.03,39.08,1.37,58.72-16.71,95.43-4.62,8.73-10.05,17-16.22,24.71-24.94,30.6-61.13,49.9-100.44,53.55-8.58.87-17.82.66-26.49.67h-148.13s-113.94.01-113.94.01c-19.64,0-52.79,1.09-70.56-2.09-24.48-4.58-47.42-15.21-66.75-30.91-30.17-24.68-49.28-60.35-53.15-99.13-1.4-14.18-.83-33.97-.82-48.65v-75.18s.01-80.8.01-80.8c-.01-20.88-1.07-48.11,3.04-67.98,5.1-24.54,16.11-47.48,32.08-66.8,24.97-30.39,61.04-49.55,100.2-53.24l30-1.37c31.21.58,63.94.04,95.33.04h188.11s29.45.8,29.45.8Z"
        />
        <path
          fill="#252520"
          d="M368.86,396.22c19.97-.76,43.57-.16,63.77-.16h119.92s68.48-.03,68.48-.03c16.43,0,36.81-.77,52.64,2.14,17.9,3.34,34.53,11.54,48.09,23.7,35.34,31.85,29.44,68.67,29.73,111.15.25,35.16,2.89,66.4-23.44,94.25-19.69,20.83-44.77,29.9-72.95,30.95-18.65.85-43.06.12-62.11.12h-121.37s-71.79.03-71.79.03c-15.98,0-32.89.85-48.66-1.67-43.24-6.92-77.21-41.86-78.65-86.3-.51-15.56,0-31.42-.22-46.72-.5-34.94-2.44-68.51,23.8-95.85,19.96-21.63,44.12-30.08,72.76-31.61Z"
        />
        <path
          ref={eyeLRef}
          fill="#E7D8B2"
          d="M407.97,480.09c24.63-4.05,47.83,12.75,51.68,37.41,3.84,24.66-13.15,47.73-37.85,51.36-24.4,3.59-47.13-13.16-50.93-37.53-3.8-24.37,12.76-47.24,37.1-51.24Z"
        />
        <path
          ref={eyeRRef}
          fill="#E7D8B2"
          d="M601.19,480.33c24.33-4.14,47.42,12.22,51.57,36.55,4.16,24.33-12.19,47.42-36.52,51.59-24.34,4.17-47.46-12.19-51.62-36.54-4.16-24.35,12.22-47.45,36.56-51.6Z"
        />
      </g>
    </svg>
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
      style={{ background: "#252520" }}
    >
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(255, 155, 113, 0.3), transparent)" }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(231, 216, 178, 0.2), transparent)" }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
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
                color: "#E7D8B2",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 800,
                fontSize: "64px",
                lineHeight: 1
              }}
            >
              Kochi.to
            </span>
            <span
              className="uppercase tracking-[0.1em]"
              style={{
                color: "rgba(231, 216, 178, 0.6)",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 600,
                fontSize: "12px",
                lineHeight: 1,
                letterSpacing: "0.1em"
              }}
            >
              DELIVERED DAILY. WEATHER PERMITTING.
            </span>
          </motion.div>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 py-0 relative">
          <div className="w-full mx-auto relative" style={{ zIndex: 1 }}>
            <div className="flex flex-col items-center gap-10">
              <div className="flex flex-col items-center gap-6">
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
                          background: "#FF9B71",
                          color: "#252520",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: "18px",
                          lineHeight: "1.5",
                          fontWeight: 400,
                          borderBottomRightRadius: "8px",
                          boxShadow: "0 8px 24px rgba(255, 155, 113, 0.3)"
                        }}
                      >
                        {conversations[currentIndex].user}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

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
                          background: "rgba(231, 216, 178, 0.1)",
                          color: "#E7D8B2",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: "18px",
                          lineHeight: "1.5",
                          fontWeight: 400,
                          borderBottomLeftRadius: "8px",
                          border: "1px solid rgba(231, 216, 178, 0.2)"
                        }}
                      >
                        {conversations[currentIndex].kochi}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="pb-16 flex flex-col items-center gap-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex justify-center"
          >
            <KochiMascot />
          </motion.div>

          <div className="flex justify-center gap-2">
            {conversations.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="transition-all duration-300"
                style={{
                  width: currentIndex === index ? "40px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background:
                    currentIndex === index
                      ? "#FF9B71"
                      : "rgba(231, 216, 178, 0.2)"
                }}
                aria-label={`Go to conversation ${index + 1}`}
              />
            ))}
          </div>

          <a
            href="sms:8663300015?body=Howdy,%20what%20can%20you%20do?"
            className="px-10 py-5 rounded-full transition-all duration-300 hover:scale-105"
            style={{
              background: "#FF9B71",
              boxShadow: "0 8px 32px rgba(255, 155, 113, 0.4)"
            }}
          >
            <span
              style={{
                color: "#252520",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 600,
                fontSize: "16px",
                letterSpacing: "0.02em"
              }}
            >
              Try it now
            </span>
          </a>

          <p
            style={{
              color: "rgba(231, 216, 178, 0.6)",
              fontFamily: "Poppins, sans-serif",
              fontSize: "13px"
            }}
          >
            +1-866-330-0015 (SMS/WhatsApp)
          </p>

          <p
            style={{
              color: "rgba(231, 216, 178, 0.4)",
              fontFamily: "Poppins, sans-serif",
              fontSize: "12px"
            }}
          >
            © 2025 Kochito Labs. All rights reserved.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
