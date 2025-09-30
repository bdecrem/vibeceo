"use client";

import { useEffect, useState } from "react";

const RAW_SMS_SCREENS = [
  {
    id: "screen-1",
    messages: [
      { id: "ai-daily-user", variant: "user" as const, text: "AI Daily" },
      {
        id: "ai-daily-response",
        variant: "response" as const,
        text: "🎙️ AI Daily 9/28 — Here's what's new today: VCRL boosts large language models, plus 2 more papers!\nHear it here: https://b52s.me/l/khQf or text LINKS.",
        holdAfter: 600
      },
      { id: "nvidia-request", variant: "user" as const, text: "$ nvidia" }
    ],
    holdAfter: 1400
  },
  {
    id: "screen-2",
    messages: [
      {
        id: "nvidia-response",
        variant: "response" as const,
        text: "Hey! NVIDIA (NVDA) is at $181.85 right now 📈\nIt's up $3.42 (+1.92%) this week, which is pretty solid.\nStrong demand in AI is driving interest.",
        holdAfter: 1200
      }
    ],
    holdAfter: 2000
  }
];

const SMS_SCREENS = RAW_SMS_SCREENS.map((screen) => {
  let cumulativeDelay = 0;

  const messages = screen.messages.map((message) => {
    const typingDuration = message.text.length * 20;
    const startDelay = cumulativeDelay;
    cumulativeDelay += typingDuration + (message.holdAfter ?? 400);

    return {
      ...message,
      delay: startDelay,
      typingDuration
    };
  });

  return {
    ...screen,
    messages,
    totalDuration: cumulativeDelay + (screen.holdAfter ?? 1600)
  };
});

type SMSVariant = "user" | "response";

type ScreenMessage = {
  id: string;
  variant: SMSVariant;
  text: string;
  holdAfter?: number;
  delay: number;
  typingDuration: number;
};

type ScreenDefinition = {
  id: string;
  messages: ScreenMessage[];
  totalDuration: number;
};

function ScreenMessageBubble({
  screenId,
  message
}: {
  screenId: string;
  message: ScreenMessage;
}) {
  const [isVisible, setIsVisible] = useState(message.delay === 0);

  useEffect(() => {
    setIsVisible(message.delay === 0);

    if (message.delay > 0) {
      const timer = setTimeout(() => setIsVisible(true), message.delay);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [message.delay, screenId]);

  if (!isVisible) {
    return null;
  }

  const isUser = message.variant === "user";
  const alignmentClass = isUser ? "flex justify-end" : "flex justify-start";
  const bubbleClass = isUser
    ? "bg-[#3a3a3a] text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] text-sm md:text-base"
    : "bg-[#d3d3d3] text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] text-sm md:text-base";

  return (
    <div className={alignmentClass}>
      <div className={bubbleClass}>
        <TypingMessage text={message.text} />
      </div>
    </div>
  );
}

type TypingMessageProps = {
  text: string;
};

function TypingMessage({ text }: TypingMessageProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText("");
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex += 1;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <p className="whitespace-pre-wrap break-words">{displayText}</p>;
}

function SMSExchange() {
  const [currentScreen, setCurrentScreen] = useState(0);

  useEffect(() => {
    const screen = SMS_SCREENS[currentScreen];
    const switchTimer = setTimeout(() => {
      setCurrentScreen((prev) => (prev + 1) % SMS_SCREENS.length);
    }, screen.totalDuration);

    return () => clearTimeout(switchTimer);
  }, [currentScreen]);

  const screen = SMS_SCREENS[currentScreen] as ScreenDefinition;

  return (
    <div className="max-w-md mx-auto space-y-3 h-[240px] md:h-[220px]">
      {screen.messages.map((message) => (
        <ScreenMessageBubble
          key={`${screen.id}-${message.id}`}
          screenId={screen.id}
          message={message}
        />
      ))}
    </div>
  );
}

export default function B52LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f3f0]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-12 pt-0 md:pt-6 pb-9">
        <div className="bg-[#f5f3f0] md:bg-white md:shadow-2xl md:rounded-t-[32px] overflow-hidden flex flex-col md:min-h-[calc(100vh-1.5rem)]">
          <div className="relative aspect-[4/3] md:aspect-[16/9] overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-3">
              <div className="bg-[#f4c430] row-span-3" />
              <div className="bg-[#ff5722] row-span-2" />
              <div className="bg-[#1976d2] row-span-1" />
            </div>

            <div className="absolute inset-0 flex items-start justify-center pt-[18%] md:pt-8">
              <div className="flex items-start justify-center -space-x-1 md:-space-x-4">
                <span
                  className="text-[#1ba0c8] text-[28vw] md:text-[20rem] lg:text-[24rem] font-extrabold leading-none select-none md:-mt-10"
                  style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                >
                  B
                </span>
                <span
                  className="text-[#e8e4d9] text-[24vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-4 md:mt-10 select-none"
                  style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                >
                  5
                </span>
                <span
                  className="text-[#e8e4d9] text-[24vw] md:text-[16rem] lg:text-[20rem] font-extrabold leading-none mt-2 md:mt-[25px] select-none"
                  style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                >
                  2
                </span>
                <span
                  className="text-[#1976d2] text-[20vw] md:text-[13rem] lg:text-[16rem] font-extrabold leading-none mt-8 md:mt-16 select-none"
                  style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
                >
                  S
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#f5f3f0] px-6 sm:px-10 md:px-16 pt-6 md:pt-10 pb-16 md:pb-12 md:flex-1 flex flex-col md:justify-center">
            <h1
              className="text-3xl md:text-6xl lg:text-7xl font-extrabold text-black leading-tight tracking-tight text-center"
              style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
            >
              little blasts of AI.
            </h1>

            <div className="mt-4 md:mt-8 mb-4 md:mb-6">
              <SMSExchange />
            </div>

            <div
              className="mt-2 md:mt-8 text-center space-y-3 md:space-y-4 pb-6"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
            >
              <p className="text-base md:text-xl text-gray-700">
                Private AI over SMS.
              </p>
              <a
                href="sms:8663300015?body=Howdy,%20what%20can%20you%20do?"
                className="inline-block px-8 md:px-10 py-2.5 md:py-3 border-2 border-gray-800 text-gray-800 text-sm md:text-lg font-medium tracking-wide hover:bg-gray-800 hover:text-white transition-all duration-300"
              >
                Try it now
              </a>
              <p className="text-xs md:text-sm text-gray-600">
                +1-866-330-0015 (SMS/WhatsApp)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
