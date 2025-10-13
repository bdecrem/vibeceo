"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Script from "next/script";
import { AnimatePresence, motion } from "framer-motion";

type Stage = "initial" | "prompt" | "input" | "thinking" | "response";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const GREETING_TEXT = "Hey — I'm Kochi. I send short daily blasts on AI, science, and finance. Wanna ask me one thing?";

const randomFrom = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

interface KochiAnimationProps {
  onClick?: () => void;
}

interface KochiAnimationHandle {
  playRandomAnimation: () => void;
}

const KochiAnimation = forwardRef<KochiAnimationHandle, KochiAnimationProps>(
  ({ onClick }, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const groupRef = useRef<SVGGElement | null>(null);
  const [gsapReady, setGsapReady] = useState(false);
  const animationsRef = useRef<Array<() => any>>([]);
  const activeTimelineRef = useRef<any>(null);
  const eyesRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });
  const antennasRef = useRef<{ left: SVGPathElement | null; right: SVGPathElement | null }>({
    left: null,
    right: null
  });

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

  useImperativeHandle(ref, () => ({
    playRandomAnimation
  }));

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 1024 1024"
        className="max-w-[280px] w-full h-auto cursor-pointer transition-transform duration-100"
        onClick={onClick}
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
    </>
  );
});
KochiAnimation.displayName = "KochiAnimation";

export default function KochiLandingPage() {
  const [stage, setStage] = useState<Stage>("initial");
  const [userInput, setUserInput] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [kochiResponse, setKochiResponse] = useState("");
  const [animationsEnabled, setAnimationsEnabled] = useState(false);
  const mascotRef = useRef<KochiAnimationHandle | null>(null);
  const [displayedResponse, setDisplayedResponse] = useState("");
  const typingIntervalRef = useRef<number | null>(null);
  const [greetingDisplayed, setGreetingDisplayed] = useState("");
  const greetingIntervalRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversation, setShowConversation] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (stage === "initial") {
        setStage("prompt");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [stage]);

  const handleMascotClick = () => {
    if (stage === "response" && showConversation) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setShowConversation(false);
      return;
    }

    if (stage === "initial" || stage === "prompt") {
      setStage("input");
      setAnimationsEnabled(true);
      setTimeout(() => mascotRef.current?.playRandomAnimation(), 60);
    } else if (animationsEnabled) {
      mascotRef.current?.playRandomAnimation();
    }
  };

  const handleUserSubmit = async () => {
    const trimmed = userInput.trim();
    if (!trimmed || isLoading) return;

    setStage("thinking");
    setKochiResponse("");
    setDisplayedResponse("");
    setIsLoading(true);
    setLastUserMessage(trimmed);
    setUserInput("");

    const updatedHistory: ChatMessage[] = [...history, { role: "user", content: trimmed }];
    setHistory(updatedHistory);

    try {
      const response = await fetch("/api/kochi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedHistory })
      });

      if (!response.ok) {
        throw new Error("Non-200 response");
      }

      const data = (await response.json()) as { message?: string };
      const assistantMessage = data.message?.trim() || "i'm having trouble replying right now. mind trying once more?";

      setHistory([...updatedHistory, { role: "assistant", content: assistantMessage }]);
      setKochiResponse(assistantMessage);
      setStage("response");
    } catch (error) {
      console.error("[Kochi] Failed to generate response", error);
      const fallback = "i hit a bit of static trying to answer that. want to try again?";
      setKochiResponse(fallback);
      setHistory(updatedHistory);
      setStage("response");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    if (stage !== "response" || !kochiResponse) {
      setDisplayedResponse("");
      return;
    }

    setDisplayedResponse("");
    let index = 0;
    const content = kochiResponse;
    typingIntervalRef.current = window.setInterval(() => {
      index += 1;
      setDisplayedResponse(content.slice(0, index));
      if (index >= content.length && typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }, 35);

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [stage, kochiResponse]);

  const isTyping = stage === "response" && displayedResponse.length < kochiResponse.length;

  useEffect(() => {
    if (greetingIntervalRef.current) {
      window.clearInterval(greetingIntervalRef.current);
      greetingIntervalRef.current = null;
    }

    if (stage !== "input") {
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

  useEffect(() => {
    if (stage === "response" && animationsEnabled) {
      const timer = window.setTimeout(() => mascotRef.current?.playRandomAnimation(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [stage, animationsEnabled]);

  useEffect(() => {
    if (stage !== "response" && !showConversation) {
      setShowConversation(true);
    }
  }, [stage, showConversation]);

  useEffect(() => {
    if (stage === "response" && showConversation) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setShowConversation(false);
        hideTimerRef.current = null;
      }, 40000);
      return () => {
        if (hideTimerRef.current) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      };
    }

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [stage, showConversation]);

  return (
    <div
      className="min-h-screen bg-[#fffef7] text-center flex items-center justify-center px-5 py-6"
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
        * {
          box-sizing: border-box;
        }
      `}</style>

      <div className="w-full max-w-[520px] px-4 sm:px-0">
        <h1
          className="text-[38px] sm:text-[60px] md:text-[72px] leading-[0.9] font-[800]"
          style={{
            fontFamily: "Poppins, sans-serif",
            color: "#2C3E1F",
            margin: "0 0 8px 0"
          }}
        >
          Kochi.to
        </h1>

        <p
          className="text-[13px] sm:text-[14px]"
          style={{
            color: "#8a8a8a",
            marginBottom: "48px",
            fontStyle: "italic"
          }}
        >
          AI blasts delivered daily. Weather permitting.
        </p>

        <div className="flex justify-center mb-6">
          <KochiAnimation ref={mascotRef} onClick={handleMascotClick} />
        </div>

        <div className="h-10 mb-6 flex justify-center items-center">
          <AnimatePresence mode="wait">
            {stage === "prompt" && (
              <motion.button
                key="prompt-text"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 420, damping: 14 }}
                onClick={handleMascotClick}
                className="text-[#8a8a8a] hover:text-[#2C3E1F] transition-colors duration-200 text-[15px] sm:text-base font-medium"
              >
                Tap Kochi to get started
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {showConversation && stage === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="inline-block mb-5"
              >
                <div
                  className="text-[15px] sm:text-[16px]"
                  style={{
                    background: "#FFF9E6",
                    color: "#2C3E1F",
                    padding: "16px 24px",
                    borderRadius: "24px",
                    border: "2px solid #2C3E1F",
                    display: "inline-block",
                    maxWidth: "80%",
                    textAlign: "left",
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: 500
                  }}
                >
                  <span>{greetingDisplayed || "\u00a0"}</span>
                  {greetingDisplayed.length < GREETING_TEXT.length && (
                    <span className="inline-block w-1 h-5 bg-[#2C3E1F] ml-1 animate-pulse align-middle" />
                  )}
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 sm:gap-3 w-full px-2 sm:px-0">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUserSubmit();
                    }
                  }}
                  placeholder="Try: “what were the best AI papers yesterday?”"
                  className="rounded-full border-2 border-[#e8e8e8] px-5 py-3 text-[15px] sm:text-base outline-none w-full sm:min-w-[360px]"
                  autoFocus
                />
                <button
                  onClick={handleUserSubmit}
                  disabled={!userInput.trim() || isLoading}
                  className="rounded-full border-2 border-[#2C3E1F] px-6 py-3 text-[15px] sm:text-base font-semibold transition-all duration-200 sm:w-auto w-full"
                  style={{
                    background: userInput.trim() && !isLoading ? "#FFE148" : "#e8e8e8",
                    color: userInput.trim() && !isLoading ? "#2C3E1F" : "#999",
                    cursor: userInput.trim() && !isLoading ? "pointer" : "not-allowed"
                  }}
                >
                  {isLoading ? "Sending…" : "Send"}
                </button>
              </div>
            </motion.div>
          )}

          {showConversation && stage === "thinking" && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <div
                className="text-[15px] sm:text-[16px]"
                style={{
                  background: "#ffffff",
                  color: "#2C3E1F",
                  padding: "16px 24px",
                  borderRadius: "24px",
                  border: "2px solid #e8e8e8",
                  display: "inline-block",
                  marginBottom: "16px",
                  maxWidth: "80%",
                  textAlign: "left"
                }}
              >
                {lastUserMessage || userInput}
              </div>
              <div
                style={{
                  color: "#8a8a8a",
                  fontSize: "14px",
                  fontStyle: "italic"
                }}
              >
                Kochi is thinking...
              </div>
            </motion.div>
          )}

          {stage === "response" && (
            <motion.div
              key="response"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className={showConversation ? "mb-10" : "mb-6"}
            >
              <div className="flex flex-col items-center gap-4">
                {showConversation && (
                  <>
                    <div
                      className="text-[15px] sm:text-[16px]"
                      style={{
                        background: "#ffffff",
                        color: "#2C3E1F",
                        padding: "16px 24px",
                        borderRadius: "24px",
                        border: "2px solid #e8e8e8",
                        display: "inline-block",
                        marginBottom: "16px",
                        maxWidth: "80%",
                        textAlign: "left"
                      }}
                    >
                      {lastUserMessage || userInput}
                    </div>

                    <div style={{ height: "12px" }} />

                    <div
                      className="text-[15px] sm:text-[16px]"
                      style={{
                        background: "#FFF9E6",
                        color: "#2C3E1F",
                        padding: "16px 24px",
                        borderRadius: "24px",
                        border: "2px solid #2C3E1F",
                        display: "inline-block",
                        marginBottom: "24px",
                        maxWidth: "80%",
                        textAlign: "left",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 500
                      }}
                    >
                      <span>{displayedResponse || "\u00a0"}</span>
                      {isTyping && (
                        <span className="inline-block w-1 h-5 bg-[#2C3E1F] ml-1 animate-pulse align-middle" />
                      )}
                    </div>

                    <p
                      style={{
                        color: "#2C3E1F",
                        fontSize: "16px",
                        marginBottom: "0",
                        fontWeight: 600
                      }}
                    >
                      Want to keep chatting?
                    </p>
                  </>
                )}
                <a
                  href="sms:8663300015?body=Hey%20Kochi!"
                  className="rounded-full border-2 border-[#2C3E1F] px-8 py-4 text-lg font-bold transition-all duration-200 shadow-[0_8px_24px_rgba(255,225,72,0.4)]"
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
                  Text me →
                </a>
                <p
                  style={{
                    color: "#8a8a8a",
                    fontSize: "14px"
                  }}
                >
                  +1-866-330-0015
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
