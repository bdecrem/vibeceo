"use client";

import { useState, useEffect } from "react";
import type { SceneProps } from "../types";
import bgImage from "./bg.png";
import orbImage from "../orb-cropped.png";

export default function SnowFantasyScene({ className }: SceneProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    const newSparkles = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 10 + Math.random() * 50,
      delay: Math.random() * 3,
    }));
    setSparkles(newSparkles);
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className || ''}`}>
      {/* Background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bgImage.src}
        alt="Fantasy sky scene"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center center' }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(100,120,180,0.2) 100%)'
        }}
      />

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-12px); }
        }
        @keyframes blink-snow {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }
        .snow-scene #eye-right ellipse, .snow-scene #eye-left ellipse {
          animation: blink-snow 4s ease-in-out infinite;
          transform-origin: center center;
        }
        .snow-scene #eye-left ellipse {
          animation-delay: 0.05s;
        }
        @keyframes sway-snow {
          0%, 100% { transform: skewX(-2deg); }
          50% { transform: skewX(2deg); }
        }
        .snow-scene #antenna-right, .snow-scene #antenna-left {
          animation: sway-snow 2.5s ease-in-out infinite;
          transform-origin: center bottom;
          transform-box: fill-box;
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        @keyframes dome-glow {
          0%, 100% {
            box-shadow: 0 0 40px rgba(180, 220, 255, 0.3),
                        inset 0 -20px 40px rgba(180, 220, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 60px rgba(180, 220, 255, 0.5),
                        inset 0 -20px 60px rgba(180, 220, 255, 0.15);
          }
        }
      `}</style>

      {/* Floating Orb Assembly - 4 layer stacking */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'clamp(140px, 22vw, 240px)',
          aspectRatio: '1 / 1',
          animation: 'float 6s ease-in-out infinite',
        }}
      >
        {/* Container - fixed aspect ratio so orb layers align */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>

          {/* LAYER 1: ORB BACK - base only (behind Kochi) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={orbImage.src}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              clipPath: 'inset(50% 0 0 0)', // show bottom 50% (base only)
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* LAYER 2: KOCHI - middle layer */}
          <div
            style={{
              position: 'absolute',
              top: '-35%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '116%',
              zIndex: 2,
            }}
          >
            <svg
              viewBox="0 0 1024 1536"
              className="w-full h-auto snow-scene"
              style={{
                filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 35px rgba(255, 255, 255, 0.3))',
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

          {/* LAYER 3: ORB FRONT - dome only (in front of Kochi) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={orbImage.src}
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              clipPath: 'inset(0 0 45% 0)', // show top 55% (dome)
              zIndex: 3,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 100%)',
              pointerEvents: 'none',
            }}
          />

        </div>
      </div>
    </div>
  );
}
