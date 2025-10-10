"use client";

import { useState, useEffect } from "react";
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
    kochi: "\"I've been going hard and need a few days to recharge so I can keep delivering quality work.\" Frame it as investment, not weakness."
  },
  {
    user: "Recommend a book for a long flight",
    kochi: "Tomorrow, and Tomorrow, and Tomorrow by Gabrielle Zevin. About friendship, games, and creativity. You won't want to land."
  }
];

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
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="pb-16 flex flex-col items-center gap-6"
        >
          {/* Kochi character icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="flex justify-center"
          >
            <img
              src="/kochi-icon.png"
              alt="Kochi character"
              className="w-[240px] h-[240px] md:w-[320px] md:h-[320px]"
            />
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
        </motion.footer>
      </div>
    </div>
  );
}
