'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// --- Constants ---
const GAME_ID = 'tapper';
const GAME_NAME = 'TAPPER';
const GAME_DURATION = 4; // seconds

// Minimal dark theme matching Pixelpit aesthetic
const COLORS = {
  bg: '#09090b',
  surface: '#18181b',
  primary: '#22d3ee',   // cyan
  secondary: '#a855f7', // purple
  text: '#f8fafc',
  muted: '#71717a',
  error: '#ef4444',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

export default function TapperGame() {
  // --- State ---
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'leaderboard'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.io/pixelpit/arcade/${GAME_ID}`;

  // --- Group code detection on mount ---
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      window.PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  // --- Game timer ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setScore(scoreRef.current);
          // Track play for analytics
          fetch('/api/pixelpit/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game: GAME_ID }),
          }).catch(() => {});
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState]);

  // --- Start game ---
  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
  }, []);

  // --- Tap handler ---
  const handleTap = useCallback(() => {
    if (gameState !== 'playing') return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
  }, [gameState]);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          font-family: ui-monospace, monospace;
          color: ${COLORS.text};
          overflow: hidden;
          user-select: none;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>

        {/* --- START SCREEN --- */}
        {gameState === 'start' && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.primary,
              letterSpacing: 6,
              marginBottom: 16,
            }}>
              {GAME_NAME}
            </h1>
            <p style={{
              fontSize: 14,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 40,
            }}>
              tap as fast as you can for {GAME_DURATION} seconds
            </p>
            <button
              data-testid="start-btn"
              onClick={startGame}
              style={{
                background: COLORS.primary,
                color: COLORS.bg,
                border: 'none',
                padding: '16px 50px',
                fontSize: 18,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 8,
                letterSpacing: 2,
              }}
            >
              start
            </button>
            <div style={{
              marginTop: 40,
              fontSize: 12,
              letterSpacing: 3,
            }}>
              <span style={{ color: COLORS.primary }}>pixel</span>
              <span style={{ color: COLORS.secondary }}>pit</span>
              <span style={{ color: COLORS.text, opacity: 0.6 }}> arcade</span>
            </div>
          </div>
        )}

        {/* --- PLAYING SCREEN --- */}
        {gameState === 'playing' && (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            width: '100%',
          }}>
            {/* Timer */}
            <div data-testid="timer" style={{
              fontSize: 64,
              fontWeight: 200,
              color: timeLeft <= 3 ? COLORS.error : COLORS.muted,
              transition: 'color 0.3s',
            }}>
              {timeLeft}
            </div>

            {/* Score */}
            <div data-testid="score" style={{
              fontSize: 96,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1,
            }}>
              {score}
            </div>

            {/* Tap button */}
            <button
              data-testid="tap-btn"
              onClick={handleTap}
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: COLORS.primary,
                color: COLORS.bg,
                border: 'none',
                fontSize: 24,
                fontFamily: 'ui-monospace, monospace',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 2,
                marginTop: 20,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              TAP
            </button>
          </div>
        )}

        {/* --- GAME OVER SCREEN --- */}
        {gameState === 'gameover' && (
          <div style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 400,
            width: '100%',
          }}>
            <div style={{
              fontSize: 20,
              color: COLORS.muted,
              letterSpacing: 4,
              marginBottom: 12,
            }}>
              time&apos;s up
            </div>

            <div data-testid="final-score" style={{
              fontSize: 80,
              fontWeight: 200,
              color: COLORS.primary,
              marginBottom: 8,
              lineHeight: 1,
            }}>
              {score}
            </div>

            <div style={{
              fontSize: 12,
              color: COLORS.muted,
              letterSpacing: 2,
              marginBottom: 30,
            }}>
              taps in {GAME_DURATION} seconds
            </div>

            {/* Progression display */}
            {progression && (
              <div style={{
                background: COLORS.surface,
                borderRadius: 12,
                padding: '16px 24px',
                marginBottom: 20,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>
                  +{progression.xpEarned} XP
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>
                  Level {progression.level}{progression.streak > 1 ? ` • ${progression.multiplier}x streak` : ''}
                </div>
              </div>
            )}

            {/* Score submission */}
            <ScoreFlow
              score={score}
              gameId={GAME_ID}
              colors={SCORE_FLOW_COLORS}
              maxScore={35}
              onRankReceived={(rank, entryId) => {
                setSubmittedEntryId(entryId ?? null);
              }}
              onProgression={(prog) => setProgression(prog)}
            />

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'center',
              marginTop: 20,
              width: '100%',
            }}>
              <button
                data-testid="play-again-btn"
                onClick={startGame}
                style={{
                  background: COLORS.primary,
                  color: COLORS.bg,
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 40px',
                  fontSize: 15,
                  fontFamily: 'ui-monospace, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                play again
              </button>
              <button
                data-testid="leaderboard-btn"
                onClick={() => setGameState('leaderboard')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                leaderboard
              </button>
              {user ? (
                <button
                  data-testid="share-groups-btn"
                  onClick={() => setShowShareModal(true)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${COLORS.surface}`,
                    borderRadius: 6,
                    color: COLORS.muted,
                    padding: '12px 30px',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, monospace',
                    cursor: 'pointer',
                    letterSpacing: 2,
                  }}
                >
                  share / groups
                </button>
              ) : (
                <ShareButtonContainer
                  id="share-btn-container"
                  url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${score}` : ''}
                  text={`I tapped ${score} times in ${GAME_DURATION} seconds on TAPPER! Can you beat me?`}
                  style="minimal"
                  socialLoaded={socialLoaded}
                />
              )}
            </div>
          </div>
        )}

        {/* --- LEADERBOARD SCREEN --- */}
        {gameState === 'leaderboard' && (
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('gameover')}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        )}

        {/* --- SHARE MODAL --- */}
        {showShareModal && user && (
          <ShareModal
            gameUrl={GAME_URL}
            score={score}
            colors={LEADERBOARD_COLORS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </>
  );
}
