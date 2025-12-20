"use client";

import { useState, useEffect } from "react";
import { Poppins } from "next/font/google";
import Image from "next/image";
import bgImage from "./bg.png";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function KochiLanding2() {
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    const scheduleHide = () => {
      // Random delay between 8-15 seconds
      const delay = 8000 + Math.random() * 7000;
      return setTimeout(() => {
        setIsHiding(true);
        // Come back up after 1.5 seconds
        setTimeout(() => {
          setIsHiding(false);
          // Schedule next hide
          scheduleHide();
        }, 1500);
      }, delay);
    };

    const timeoutId = scheduleHide();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className={`${poppins.className} relative h-screen w-full overflow-hidden`}>
      {/* Layer 1: Background Scene - Full bleed
           object-cover + center: on portrait phones, scales to fill height,
           crops equally left/right, vertical position stays consistent */}
      <Image
        src={bgImage}
        alt="Forest scene"
        fill
        priority
        unoptimized
        className="object-cover"
        style={{ objectPosition: 'center 55%' }}
        sizes="100vw"
      />

      {/* Optional: subtle vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)'
        }}
      />

      {/* Layer 2: Ambient light pool on counter (behind Kochi) - hidden on mobile */}
      <div
        className="absolute z-10 pointer-events-none hidden sm:block"
        style={{
          left: '50%',
          bottom: '38%',
          transform: 'translateX(-50%)',
          width: 'clamp(180px, 24vw, 280px)',
          height: 'clamp(60px, 8vw, 100px)',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 40%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
        }}
      />

      {/* Layer 3: Desk mask - clips Kochi to appear behind desk */}
      <div
        className="absolute inset-0 z-20"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 100% 64.4%, 0 60.4%)',
        }}
      >
        {/* Kochi SVG character - can move freely within mask */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: isHiding ? '80%' : '61%',
            transform: 'translateX(-50%) translateY(-50%) perspective(1000px) rotateX(5deg)',
            width: 'clamp(288px, 52vw, 634px)',
            transition: 'top 0.6s ease-in-out',
          }}
        >
        <style>{`
          @keyframes blink {
            0%, 96%, 100% { transform: scaleY(1); }
            98% { transform: scaleY(0.1); }
          }
          #eye-right ellipse, #eye-left ellipse {
            animation: blink 4s ease-in-out infinite;
            transform-origin: center center;
          }
          #eye-left ellipse {
            animation-delay: 0.05s;
          }
          @keyframes sway {
            0%, 100% { transform: skewX(-2deg); }
            50% { transform: skewX(2deg); }
          }
          #antenna-right, #antenna-left {
            animation: sway 2.5s ease-in-out infinite;
            transform-origin: center bottom;
            transform-box: fill-box;
          }
          @keyframes itchy {
            0%, 90%, 100% { transform: rotate(0deg); }
            92% { transform: rotate(-2deg); }
            94% { transform: rotate(2deg); }
            96% { transform: rotate(-1.5deg); }
            98% { transform: rotate(1deg); }
          }
          .kochi-container {
            animation: itchy 5s ease-in-out infinite;
            transform-origin: center bottom;
          }
        `}</style>
        <svg
          viewBox="0 0 1024 1536"
          className="w-full h-auto kochi-container"
          style={{
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.4)) drop-shadow(0 0 120px rgba(255, 255, 255, 0.25))',
          }}
        >
          <g id="antenna-right">
            <g>
              <path fill="#FFFFFF" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M423.542,528.429c0,0.59-0.04,1.19-0.13,1.79l-12.7,84.31c-0.99,6.53-7.08,11.03-13.62,10.05c-1.51-0.23-2.91-0.73-4.16-1.45c-4.16-2.38-6.64-7.14-5.89-12.17l12.7-84.3c0.99-6.54,7.08-11.04,13.62-10.05c1.47,0.22,2.85,0.7,4.07,1.39C421.142,520.089,423.542,524.059,423.542,528.429z"/>
              <path fill="#BED1F3" d="M423.542,528.429c0,0.59-0.04,1.19-0.13,1.79l-0.22,1.47l-1.26,8.39l-11.22,74.45c-0.99,6.53-7.08,11.03-13.62,10.05c-1.51-0.23-2.91-0.73-4.16-1.45l-0.18-2.74c6.53,0.99,12.63-3.51,13.61-10.05l10.41-69.08l1.1-7.28l1.2-7.94c0.44-2.9-0.21-5.72-1.64-8.04C421.142,520.089,423.542,524.059,423.542,528.429z"/>
              <path fill="none" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M423.542,528.429c0,0.59-0.04,1.19-0.13,1.79l-12.7,84.31c-0.99,6.53-7.08,11.03-13.62,10.05c-1.51-0.23-2.91-0.73-4.16-1.45c-4.16-2.38-6.64-7.14-5.89-12.17l12.7-84.3c0.99-6.54,7.08-11.04,13.62-10.05c1.47,0.22,2.85,0.7,4.07,1.39C421.142,520.089,423.542,524.059,423.542,528.429z"/>
            </g>
            <g>
              <path fill="#FFFFFF" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M442.062,512.289c0,16.15-13.1,29.25-29.25,29.25c-11.85,0-22.05-7.04-26.64-17.17c-1.68-3.68-2.61-7.77-2.61-12.08c0-16.16,13.09-29.25,29.25-29.25c9.24,0,17.49,4.29,22.84,10.98C439.662,499.029,442.062,505.379,442.062,512.289z"/>
              <path fill="#BED1F3" d="M442.062,512.289c0,12.97-8.44,23.96-20.13,27.79c-1.66,0.55-3.38,0.95-5.16,1.18l0.103-0.684c0.571-3.777,2.929-7,6.266-8.858c0.017-0.009,0.034-0.019,0.05-0.028c8.99-4.99,15.07-14.58,15.07-25.58c0-4.31-0.93-8.41-2.61-12.09C439.662,499.029,442.062,505.379,442.062,512.289z"/>
              <path fill="none" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M442.062,512.289c0,16.15-13.1,29.25-29.25,29.25c-11.85,0-22.05-7.04-26.64-17.17c-1.68-3.68-2.61-7.77-2.61-12.08c0-16.16,13.09-29.25,29.25-29.25c9.24,0,17.49,4.29,22.84,10.98C439.662,499.029,442.062,505.379,442.062,512.289z"/>
            </g>
          </g>
          <g id="antenna-left">
            <g>
              <path fill="#FFFFFF" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M652.738,538.369c-0.026,0.589-0.093,1.187-0.21,1.782l-16.443,83.661c-1.28,6.479-7.564,10.704-14.054,9.433c-1.498-0.297-2.875-0.859-4.091-1.634c-4.05-2.563-6.315-7.429-5.342-12.42l16.442-83.651c1.28-6.489,7.565-10.714,14.054-9.433c1.459,0.285,2.816,0.826,4.004,1.57C650.712,529.93,652.933,534.003,652.738,538.369z"/>
              <path fill="#BED1F3" d="M652.738,538.369c-0.026,0.589-0.093,1.187-0.21,1.782l-0.285,1.459l-1.633,8.326l-14.525,73.876c-1.28,6.479-7.564,10.704-14.054,9.433c-1.498-0.297-2.875-0.859-4.091-1.634l-0.058-2.745c6.479,1.28,12.774-2.944,14.044-9.434l13.477-68.548l1.423-7.224l1.552-7.879c0.569-2.878,0.045-5.724-1.28-8.105C650.712,529.93,652.933,534.003,652.738,538.369z"/>
              <path fill="none" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M652.738,538.369c-0.026,0.589-0.093,1.187-0.21,1.782l-16.443,83.661c-1.28,6.479-7.564,10.704-14.054,9.433c-1.498-0.297-2.875-0.859-4.091-1.634c-4.05-2.563-6.315-7.429-5.342-12.42l16.442-83.651c1.28-6.489,7.565-10.714,14.054-9.433c1.459,0.285,2.816,0.826,4.004,1.57C650.712,529.93,652.933,534.003,652.738,538.369z"/>
            </g>
            <g>
              <path fill="#FFFFFF" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M671.959,523.07c-0.719,16.134-14.39,28.637-30.524,27.918c-11.838-0.528-21.715-8.015-25.849-18.34c-1.514-3.751-2.261-7.879-2.069-12.184c0.72-16.144,14.38-28.638,30.524-27.918c9.231,0.412,17.282,5.065,22.328,11.986C670.152,509.716,672.267,516.167,671.959,523.07z"/>
              <path fill="#BED1F3" d="M671.959,523.07c-0.578,12.957-9.499,23.56-21.348,26.866c-1.683,0.475-3.419,0.799-5.207,0.949l0.134-0.678c0.738-3.748,3.237-6.862,6.655-8.57c0.017-0.009,0.034-0.017,0.052-0.026c9.203-4.585,15.704-13.894,16.194-24.883c0.192-4.306-0.554-8.443-2.069-12.194C670.152,509.716,672.267,516.167,671.959,523.07z"/>
              <path fill="none" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M671.959,523.07c-0.719,16.134-14.39,28.637-30.524,27.918c-11.838-0.528-21.715-8.015-25.849-18.34c-1.514-3.751-2.261-7.879-2.069-12.184c0.72-16.144,14.38-28.638,30.524-27.918c9.231,0.412,17.282,5.065,22.328,11.986C670.152,509.716,672.267,516.167,671.959,523.07z"/>
            </g>
          </g>
          <g id="body">
            <g>
              <path fill="#FFFFFF" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M744.19,808.89c-4.81,64.42-27.65,107.15-121.44,114.49c-91.13,7.12-176.84-0.74-223.97-7.04c-93.28-12.46-129.66-59.72-126.73-137.21c0.19-5.05,0.56-11.21,1.05-17.84c1.2-16.14,3.14-35.02,5.02-47.17c11.54-74.53,55.13-126.28,140.07-127.68c51.37-0.85,148.36,3.37,199.31,9.94c62.92,8.1,112.38,48.47,124.83,113.34c1.96,10.13,3,20.86,3.05,32.16C745.45,759.21,745.94,785.46,744.19,808.89z"/>
              <path fill="#BED1F3" d="M744.19,808.89c-4.81,64.42-27.65,107.15-121.44,114.49c-91.13,7.12-176.84-0.74-223.97-7.04c-93.28-12.46-129.66-59.72-126.73-137.21c0.19-5.05,0.56-11.21,1.05-17.84c1.19,62.53,35.54,100.81,116.78,111.44c43.33,5.67,122.12,12.78,205.86,6.59c86.19-6.37,107.11-44.28,111.43-101.49c1.57-20.81,1.09-44.12,0.99-59.52c-0.26-39.52-14.65-71.25-38.14-93.55c0.99,0.35,50.61,18.54,72.31,84.96c1.96,10.13,3,20.86,3.05,32.16C745.45,759.21,745.94,785.46,744.19,808.89z"/>
              <path fill="none" stroke="#5E7397" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" d="M744.19,808.89c-4.81,64.42-27.65,107.15-121.44,114.49c-91.13,7.12-176.84-0.74-223.97-7.04c-93.28-12.46-129.66-59.72-126.73-137.21c0.19-5.05,0.56-11.21,1.05-17.84c1.2-16.14,3.14-35.02,5.02-47.17c11.54-74.53,55.13-126.28,140.07-127.68c51.37-0.85,148.36,3.37,199.31,9.94c62.92,8.1,112.38,48.47,124.83,113.34c1.96,10.13,3,20.86,3.05,32.16C745.45,759.21,745.94,785.46,744.19,808.89z"/>
            </g>
          </g>
          <g id="face">
            <path d="M581.5,785.75c-52.675-3.49-152.6-11.205-203.489-14.625c-33.488-2.251-61.824-27.375-57.103-68.276c0.887-7.685,4.003-21.036,5.662-28.591c8.812-40.125,42.928-57.873,76.43-55.843c52.006,3.152,135.556,8.063,182.019,11.387c43.659,3.123,73.356,28.916,68.882,72.28c-0.794,7.695-2.522,24.129-3.964,31.729C643.75,766.438,614.99,787.969,581.5,785.75z"/>
          </g>
          <g id="eye-right">
            <ellipse fill="#FFFFFF" cx="412.844" cy="691.203" rx="32.344" ry="31.078"/>
          </g>
          <g id="eye-left">
            <ellipse fill="#FFFFFF" cx="549.719" cy="700.016" rx="32.344" ry="31.078"/>
          </g>
        </svg>
        </div>
      </div>

      {/* Layer 4: Text + CTA Overlay */}
      <div className="relative z-20 flex flex-col items-center h-full px-6 pt-[10vh] sm:pt-[12vh]">
        {/* Logo / Wordmark */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-center"
          style={{
            color: '#ffffff',
            textShadow: '0 2px 20px rgba(0,0,0,0.6), 0 4px 40px rgba(0,0,0,0.4)'
          }}
        >
          Kochi.to
        </h1>

        {/* One-line description */}
        <p
          className="mt-2 sm:mt-3 text-lg sm:text-xl md:text-2xl font-normal text-center"
          style={{
            color: 'rgba(255,255,255,0.9)',
            textShadow: '0 2px 12px rgba(0,0,0,0.6)'
          }}
        >
          AI delivered daily.
        </p>

        {/* Single CTA - positioned lower */}
        <div className="mt-auto mb-[12vh] sm:mb-[10vh]">
          <a
            href="sms:+18663300015?body=AI%20DAILY"
            className="inline-block px-8 py-4 text-lg sm:text-xl font-semibold rounded-full transition-all duration-200"
            style={{
              backgroundColor: '#FFE148',
              color: '#2C3E1F',
              boxShadow: '0 4px 24px rgba(255, 225, 72, 0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 225, 72, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(255, 225, 72, 0.5)';
            }}
          >
            Try it &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
