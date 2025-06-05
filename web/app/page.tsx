"use client";

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, Brain, Users, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SmsModal from "@/components/sms-modal";
import SmsBanner from "@/components/sms-banner";

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);  // 1 for right, -1 for left
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  
  const slides = [
    {
      img: '/images/coach-1.jpeg',
      name: 'Donte Disrupt',
      title: 'Chief Vision Optimizer',
      text: "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and a 100% chance of sounding profound."
    },
    {
      img: '/images/coach-5.png',
      name: 'Alex Monroe',
      title: 'Founder & CEO of Alexir',
      text: "Whether I'm hosting BioSync retreats in Tulum, experimenting with cellular hydration formulas, or leading walking meetings down Abbot Kinney, I'm redefining the wellness founder archetype one chlorophyll latte at a time."
    },
    {
      img: '/images/coach-7.png',
      name: 'Rohan Mehta',
      title: 'Casino Magnate & Wall Street Veteran',
      text: "If you're not winning, you're losing. And if you're not talking, you're irrelevant. I treat every day like a live market and every conversation like a hostile takeover."
    },
    {
      img: '/images/coach-2.jpeg',
      name: 'Venus Metrics',
      title: 'Execution Specialist',
      text: "I don't believe in work-life balance. I believe in work-work balance. One side is your startup, the other side is thinking about your startup. I'll help you optimize every minute of your day for maximum burnout efficiency."
    },
    {
      img: '/images/coach-3.jpeg',
      name: 'Kailey Sloan',
      title: 'Strategic Alignment Officer',
      text: "While others are chasing the next shiny object, I help founders find clarity in chaos. My approach combines ruthless prioritization with strategic patience. I'll help you identify which fires are worth letting burn."
    },
    {
      img: '/images/coach-6.png',
      name: 'Eljas Virtanen',
      title: 'Sustainability Visionary & CEO of Clean Shit',
      text: "Most founders can't tell the difference between AI, ML, and a fancy IF statement. I bridge the gap between technical possibilities and business realities. I'll help you understand what your engineers are actually building."
    }
  ];

  const handleNext = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#0f172a]">
      {/* SMS Banner flush left, rounded right */}
      <SmsBanner onSignupClick={() => setIsSmsModalOpen(true)} />

      {/* Dark navy to teal gradient background - matching The Foundry */}
      <div className="fixed inset-0 bg-[#0f172a] bg-gradient-to-br from-[#0f172a] via-[#0f172a]/95 to-[#134e4a]" />

      {/* Content wrapper */}
      <div className="relative z-10">
        {/* Header/navigation */}
        <nav className="container mx-auto py-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="AdvisorsFoundry Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div className="text-xl font-bold">
              <span className="text-[#40e0d0]">Advisors</span>
              <span className="text-white">Foundry</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center text-center pt-8 md:pt-16 pb-12 md:pb-24">
          <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              World leading startup coaches,
              <div className="text-[#40e0d0] mt-1 md:mt-2">freshly minted.</div>
            </h1>
            <p className="text-lg md:text-xl text-gray-100 max-w-3xl mx-auto font-light leading-relaxed">
              Algorithmically optimized advice that sounds just human enough to be legally distinct from actual humans.
            </p>
            <div className="pt-4 md:pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
              <Link href="/coaches" className="w-full sm:w-auto">
                <Button className="w-full bg-[#40e0d0] hover:bg-[#40e0d0]/90 text-white px-6 md:px-10 py-4 md:py-5 text-base md:text-lg rounded-full font-semibold tracking-wide">
                  Get Started <span className="ml-2">→</span>
                </Button>
              </Link>
              <div className="w-full sm:w-auto">
                <Button 
                  variant="outline"
                  onClick={() => setIsSmsModalOpen(true)}
                  className="w-full bg-transparent border border-[#40e0d0]/30 text-[#40e0d0] hover:text-[#40e0d0] hover:bg-[#40e0d0]/10 hover:border-[#40e0d0]/50 px-6 md:px-10 py-4 md:py-5 text-base md:text-lg rounded-full font-semibold tracking-wide transition-all duration-300"
                >
                  SMS Updates <MessageSquare className="ml-2 h-5 w-5 inline-flex" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 pb-8 md:pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="group bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 hover:bg-white/[0.15] transition-all duration-300">
              <div className="bg-[#40e0d0] w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="text-[#0f172a] w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-2">Disruptively Mundane</h3>
              <p className="text-white/70 text-base leading-relaxed">
                Our advice is statistically indistinguishable from what a human would say after three Red Bulls.
              </p>
            </div>
            <div className="group bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 hover:bg-white/[0.15] transition-all duration-300">
              <div className="bg-[#40e0d0] w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Zap className="text-[#0f172a] w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-2">Aggressively Mediocre</h3>
              <p className="text-white/70 text-base leading-relaxed">
                We've trained our models on thousands of pitch decks that failed to secure funding.
              </p>
            </div>
            <div className="group bg-white/10 backdrop-blur-xl p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 hover:bg-white/[0.15] transition-all duration-300">
              <div className="bg-[#40e0d0] w-10 h-10 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Brain className="text-[#0f172a] w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white/90 mb-2">Artificially Authentic</h3>
              <p className="text-white/70 text-base leading-relaxed">
                Our coaches have been carefully designed to seem just human enough to avoid legal scrutiny.
              </p>
            </div>
          </div>
        </section>

        {/* Coaches Section */}
        <section className="bg-white">
          <div className="container mx-auto py-8 md:py-16 px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 md:mb-12">
              Meet Your <span className="text-[#40e0d0]">Definitely Human</span> Coaches
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
              <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-2/5 h-96 md:h-auto relative">
                  <Image 
                    src="/images/coach-1.jpeg" 
                    alt="Startup Coach" 
                    fill 
                    className="object-cover" 
                    priority 
                  />
                </div>
                <div className="p-4 md:p-6 md:w-3/5">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Donte Disrupt</h3>
                  <p className="text-[#40e0d0] mb-4">Chief Vision Optimizer</p>
                  <p className="text-gray-700">
                    "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and
                    a 100% chance of sounding profound."
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Blockchain</span>
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">AI</span>
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Failure</span>
                  </div>
                  <div className="mt-4">
                    <Link href="/coaches" className="text-[#1e5555] hover:text-[#1e5555]/80 font-medium">
                      More about Donte →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
                <div className="w-full md:w-2/5 h-96 md:h-auto relative">
                  <Image 
                    src="/images/coach-5.png" 
                    alt="Alex Monroe" 
                    fill 
                    className="object-cover" 
                    priority 
                  />
                </div>
                <div className="p-4 md:p-6 md:w-3/5">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Alex Monroe</h3>
                  <p className="text-[#40e0d0] mb-4">Founder & CEO of Alexir</p>
                  <p className="text-gray-700">
                    "Whether I'm hosting BioSync retreats in Tulum, experimenting with cellular hydration formulas, or leading walking meetings down Abbot Kinney, I'm redefining the wellness founder archetype one chlorophyll latte at a time."
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Wellness</span>
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">DTC</span>
                    <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Scaling</span>
                  </div>
                  <div className="mt-4">
                    <Link href="/coaches" className="text-[#1e5555] hover:text-[#1e5555]/80 font-medium">
                      More about Alex →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 md:mt-12">
              <Link href="/coaches">
                <Button className="bg-[#40e0d0] hover:bg-[#40e0d0]/90 text-[#1a3d3d] px-6 md:px-8 py-3 md:py-4 text-base rounded-full font-medium flex items-center gap-2 mx-auto">
                  <Users className="h-5 w-5" /> Meet All Our Coaches
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* New Section */}
        <section className="bg-[#e6faf8] py-16">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1a3d3d] mb-8">🚀 Get Smarter-ish, Weekly</h2>
            <div className="flex justify-center items-center gap-6 max-w-[800px] mx-auto">
              <button 
                onClick={handlePrev}
                className="bg-[#1a2937]/80 hover:bg-[#1a2937]/90 backdrop-blur-sm text-white/90 w-12 h-12 rounded-full hidden md:flex items-center justify-center transition-all duration-200 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="w-[640px] overflow-visible">
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ 
                      opacity: 0,
                      x: direction * 40
                    }}
                    animate={{ 
                      opacity: 1,
                      x: 0
                    }}
                    exit={{ 
                      opacity: 0,
                      x: direction * -40
                    }}
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 }
                    }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.3}
                    dragSnapToOrigin
                    onDragEnd={(e, info) => {
                      const threshold = 50;
                      if (info.offset.x > threshold) {
                        handlePrev();
                      } else if (info.offset.x < -threshold) {
                        handleNext();
                      }
                    }}
                    onClick={(e) => {
                      // Prevent click events from interfering with drag
                      e.stopPropagation();
                    }}
                    className="bg-white text-[#1a3d3d] shadow-lg rounded-2xl p-6 md:p-8 w-full relative touch-pan-y cursor-grab active:cursor-grabbing min-h-[200px]"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 relative rounded-full overflow-hidden mr-4">
                        <Image src={slides[currentSlide].img} alt="Profile" fill className="object-cover" priority />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{slides[currentSlide].name}</p>
                        <p className="text-sm text-[#40e0d0]">{slides[currentSlide].title}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-base md:text-lg">
                      {slides[currentSlide].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button 
                onClick={handleNext}
                className="bg-[#1a2937]/80 hover:bg-[#1a2937]/90 backdrop-blur-sm text-white/90 w-12 h-12 rounded-full hidden md:flex items-center justify-center transition-all duration-200 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]"
                aria-label="Next slide"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
            <div className="flex justify-center mt-4">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`w-2 h-2 rounded-full mx-1 focus:outline-none ${index === currentSlide ? 'bg-[#40e0d0]' : 'bg-[#1a3d3d]'}`}
                ></button>
              ))}
            </div>
            <div className="mt-8">
              <p className="text-gray-700 mb-4">
                Our coaches drop hot takes, startup hacks, and probably some buzzwords. Straight to your inbox.
              </p>
              <a href="https://advisorsfoundry.substack.com" target="_blank" rel="noopener noreferrer">
                <button className="bg-[#40e0d0] text-[#1a3d3d] px-6 py-3 rounded-full font-medium">
                  Subscribe to Substack →
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-[#0a1930] py-8 md:py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-12">
              What Our <span className="text-[#40e0d0]">Definitely Real</span> Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="bg-white/[0.02] backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/10">
                <p className="text-gray-300 italic mb-4 text-base md:text-lg">
                  "After three sessions with Donte, I pivoted my dog-walking app into a blockchain solution for virtual
                  pet ownership. We're currently pre-revenue but our burn rate is impressively efficient."
                </p>
                <p className="text-white font-semibold text-sm md:text-base">— CEO of PetherCoin</p>
              </div>
              <div className="bg-white/[0.02] backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-white/10">
                <p className="text-gray-300 italic mb-4 text-base md:text-lg">
                  "Venus helped me realize that sleep is just a social construct invented by mattress companies. Our team
                  now works in synchronized 20-minute nap cycles."
                </p>
                <p className="text-white font-semibold text-sm md:text-base">— Founder, NapMap (Acquired for $0.3M)</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-8 md:py-16">
          <div className="container mx-auto text-center px-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">Ready to be statistically average?</h2>
            <p className="text-lg md:text-xl text-[#40e0d0] mb-6 md:mb-8 max-w-2xl mx-auto">
              Our coaches are standing by or at least their algorithms are. Join the 94% of startups that will
              eventually fail, but with better buzzwords.
            </p>
            <Link href="/coaches">
              <Button size="lg" className="w-full sm:w-auto bg-white hover:bg-gray-100 text-[#1a3d3d] px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-full font-medium">
                Get Started <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto py-6 md:py-8 mt-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 md:gap-4 text-gray-400 text-sm">
            <div className="flex-1 text-center sm:text-left">
              <a href="https://coaches.advisorsfoundry.ai" target="_blank" rel="noopener noreferrer" className="hover:text-[#40e0d0]">
                YC - F2025
              </a>
            </div>
            <div className="flex-1 text-center">
              <a href="https://www.thefoundry.biz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#40e0d0]">
                The AF is a project of The Foundry
              </a>
            </div>
            <div className="flex-1 text-center sm:text-right">
              <a href="/product-hunt-does-not-exist" className="text-gray-400 hover:text-[#40e0d0]">
                Support us on Product Hunt ❤️
              </a>
            </div>
          </div>
        </footer>
      </div>

      <SmsModal 
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
      />
    </main>
  )
} 
