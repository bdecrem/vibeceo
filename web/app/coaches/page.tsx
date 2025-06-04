"use client";

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MessageSquare, Clock, Award, Zap, Target, Code, Lightbulb } from "lucide-react"
import { useState, useEffect } from 'react';

export default function CoachesPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Header section with parallax */}
      <div className="relative overflow-hidden bg-[#0f172a]">
        {/* Parallax background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0f172a]/95 to-[#134e4a] transform scale-105 origin-center transition-transform duration-500 ease-out" 
          style={{
            transform: `scale(1.05) translateY(${scrollY * 0.02}px)`,
          }}
        />

        {/* Header content */}
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-6">
            <Link href="/" className="inline-block">
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.png"
                  alt="AdvisorsFoundry Logo"
                  width={40}
                  height={40}
                  className="w-8 h-8 md:w-10 md:h-10"
                />
                <div className="text-xl md:text-2xl font-bold cursor-pointer">
                  <span className="text-[#40e0d0]">Advisors</span>
                  <span className="text-white">Foundry</span>
                </div>
              </div>
            </Link>
          </div>
          <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white leading-tight">
                Meet Our Coaches
              </h1>
              <p className="text-lg sm:text-xl text-[#40e0d0] max-w-2xl mx-auto">
                Select the perfect advisor to guide your startup through its inevitable pivot to AI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the content */}
      <div className="relative bg-white">
        {/* Coaches Grid */}
        <section className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 gap-8">
            {/* Coach Card - Shared Structure */}
            {[
              {
                id: 'donte',
                name: 'Donte Disrupt',
                title: 'Chief Vision Optimizer',
                image: '/images/coach-1.jpeg',
                quote: "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and a 100% chance of sounding profound. I specialize in helping founders realize their idea is actually a completely different idea.",
                bio: [
                  "After founding three startups in the blockchain space (all acquired for undisclosed amounts that were definitely not zero), Donte discovered his true calling: telling other founders what they're doing wrong. With a background in theoretical computer science and speculative finance, he excels at identifying patterns that don't exist and market opportunities that are just beyond reach.",
                  "Donte's coaching methodology combines Silicon Valley buzzwords with just enough technical jargon to sound credible. His clients appreciate his ability to transform simple ideas into complex, venture-fundable narratives. When not advising startups, Donte can be found writing Medium articles about \"The Future of X\" and practicing his TED Talk in the mirror."
                ],
                socialLink: {
                  text: "Read the transcript of Donte's Twitter Spaces",
                  href: "https://v0-new-project-su1cynagsdw-8vtaks.vercel.app"
                },
                xLink: {
                  text: "Follow Donte on X",
                  href: "https://x.com/dontedelph64172",
                  icon: (
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6">
                      <path
                        fill="currentColor"
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                  )
                },
                stats: [
                  { icon: Award, text: "7+ failed startups" },
                  { icon: Clock, text: "60-min sessions" },
                  { icon: Zap, text: "AI specialist" },
                  { icon: Target, text: "Pivot strategist" }
                ]
              },
              {
                id: 'alex',
                name: 'Alex Monroe',
                title: 'Founder & CEO of Alexir',
                image: '/images/coach-5.png',
                quote: "From gut-healing beauty elixirs to biohacked lattes, I'm leading a new era of high-performance self-care that blends adaptogens with algorithm-friendly aesthetics. Whether hosting BioSync retreats or experimenting with cellular hydration formulas, I'm redefining what it means to glow.",
                bio: [
                  "Raised between Topanga Canyon and Santa Monica, Alex launched Alexir from her dorm at UCLA with a single product: a marine collagen sea moss blend that sold out after going viral on TikTok. Today, Alexir is stocked in Erewhon, loved by influencers, and backed by a VC fund known for investing in \"spiritually scalable\" tech.",
                  "Alex is more than a founder — she's a movement. Her approach combines ancient wisdom with modern science, creating wellness solutions that are both Instagram-worthy and scientifically sound. Through her BioSync retreats and walking meetings down Abbot Kinney, she's pioneering a new paradigm of entrepreneurship that prioritizes cellular alignment alongside capital efficiency."
                ],
                socialLink: {
                  text: "Shop at Alexir!",
                  href: "https://www.alexirwellness.com"
                },
                xLink: {
                  text: "Alex on IG",
                  href: "https://www.instagram.com/alexirwellness/?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr",
                  icon: (
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6">
                      <path
                        fill="currentColor"
                        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                      />
                    </svg>
                  )
                },
                stats: [
                  { icon: Award, text: "$3.5M Seed Raised" },
                  { icon: Clock, text: "90-min sessions" },
                  { icon: Zap, text: "DTC Expert" },
                  { icon: Target, text: "Wellness Pioneer" }
                ]
              },
              {
                id: 'rohan',
                name: 'Rohan Mehta',
                title: 'Casino Magnate & Wall Street Veteran',
                image: '/images/coach-7.png',
                quote: "If you're not winning, you're losing. And if you're not talking, you're irrelevant. I treat every day like a live market and every conversation like a hostile takeover.",
                bio: [
                  "A second-generation Indian American, Rohan made his first millions on the trading floor before pivoting to the desert, where he now runs one of the most profitable private gaming empires in Las Vegas. Ruthlessly sharp, he interrupts more than he listens, calculates faster than he blinks, and sees people as probabilities.",
                  "His casinos aren't themed, they're engineered: precision-designed machines built to extract maximum value and attention. Behind closed doors, he plays high-stakes M&A like poker — and always stacks the deck. Ask him about ethics, and he'll smirk: \"There's no morality in math.\""
                ],
                socialLink: {
                  text: "Read: This is what leadership sounds like at 3:19 AM",
                  href: "https://v0-winference-email-page.vercel.app"
                },
                stats: [
                  { icon: Award, text: "Wall Street to Vegas" },
                  { icon: Clock, text: "45-min power sessions" },
                  { icon: Zap, text: "M&A specialist" },
                  { icon: Target, text: "High-stakes strategist" }
                ]
              },
              {
                id: 'eljas',
                name: 'Eljas Virtanen',
                title: 'Sustainability Visionary & CEO of Clean Shit',
                image: '/images/coach-6.png',
                quote: "Turn leftovers into leadership. Real change smells a little — but it's powerful, clean, and worth getting your hands dirty for.",
                bio: [
                  "Eljas is a Finnish sustainability visionary, former Nokia CEO, and current head of Clean Shit—a compost-to-energy company turning municipal waste into clean, circular power. Known for his dry humor, ethical clarity, and zero-carbon footprint, Eljas leads with quiet intensity and a T-shirt that reads \"This is powerful shit.\" He accidentally landed on his town's city council after giving an impassioned speech about democratic reform, only to find himself excelling at the messy, real work of helping people work together.",
                  "Despite his deep roots in corporate leadership, Eljas thrives in the compost pile of civic life. His philosophy is simple: \"Turn leftovers into leadership.\" He speaks five languages, bathes in ice holes, and is secretly building a vintage car museum beneath his farmhouse. Whether advising mayors on circular infrastructure or helping startups build impact-first strategies, Eljas reminds us that real change smells a little — but it's powerful, clean, and worth getting your hands dirty for."
                ],
                socialLink: {
                  text: "Must-read profile on Eljas in Kaupungin Ääni",
                  href: "https://v0-kaupungin-aeaeni-interview-f9pai0.vercel.app"
                },
                stats: [
                  { icon: Award, text: "Former Nokia CEO" },
                  { icon: Clock, text: "75-min sessions" },
                  { icon: Zap, text: "Sustainability Expert" },
                  { icon: Target, text: "Circular Economy Pioneer" }
                ]
              },
              {
                id: 'venus',
                name: 'Venus Metrics',
                title: 'Execution Specialist',
                image: '/images/coach-2.jpeg',
                quote: "I don't believe in work-life balance. I believe in work-work balance. One side is your startup, the other side is thinking about your startup. I'll help you optimize every minute of your day for maximum burnout efficiency.",
                bio: [
                  "Venus is the epitome of Silicon Valley's \"move fast and break things\" philosophy — especially if those things are traditional notions of human limitations. After optimizing her own sleep schedule down to 2.5 hours per night through a combination of polyphasic sleep and pure determination, she now helps founders achieve similar levels of unsustainable productivity.",
                ],
                stats: [
                  { icon: Award, text: "5+ acquisitions" },
                  { icon: Clock, text: "90-min intensive sessions" },
                  { icon: Zap, text: "Execution expert" },
                  { icon: Target, text: "Productivity maximizer" }
                ]
              },
              {
                id: 'kailey',
                name: 'Kailey Sloan',
                title: 'Strategic Alignment Officer',
                image: '/images/coach-3.jpeg',
                quote: "While others are chasing the next shiny object, I help founders find clarity in chaos. My approach combines ruthless prioritization with strategic patience. I'll help you identify which fires are worth letting burn.",
                bio: [
                  "Kailey brings a zen-like approach to the chaotic world of startups. After spending a decade in venture capital and witnessing countless founders burn out chasing every opportunity, she developed a framework for strategic patience that has become legendary in Silicon Valley.",
                  "Her unique methodology helps founders distinguish between genuine opportunities and shiny distractions. When not advising startups, Kailey practices what she preaches through mindful meditation and strategic procrastination."
                ],
                socialLink: {
                  text: "Check out Kailey's Fast Company cover spread!",
                  href: "https://v0-veo-leadership.vercel.app"
                },
                stats: [
                  { icon: Award, text: "10+ years in venture capital" },
                  { icon: Clock, text: "75-min strategic sessions" },
                  { icon: Zap, text: "Focus architect" },
                  { icon: Target, text: "Decision framework expert" }
                ]
              }
            ].map((coach) => (
              <div key={coach.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/3 h-96 md:h-auto relative">
                    <Image 
                      src={coach.image} 
                      alt={coach.name} 
                      fill 
                      className="object-contain md:object-cover md:object-[center_top]" 
                      priority 
                    />
                  </div>
                  <div className="p-6 md:p-8 w-full md:w-2/3">
                    <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{coach.name}</h2>
                        <p className="text-base md:text-lg text-[#40e0d0]">{coach.title}</p>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-6 italic text-base md:text-lg">
                      "{coach.quote}"
                    </p>

                    <div className="text-gray-700 space-y-4 mb-8 text-base">
                      {coach.bio.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>

                    {coach.socialLink && (
                      <a href={coach.socialLink.href} className="flex items-center gap-3 mb-8 text-sm md:text-base" target="_blank" rel="noopener noreferrer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[#40F7E3]">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        <span className="text-gray-900 underline italic">{coach.socialLink.text}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-[#40F7E3]">
                          <path d="M7 17L17 7"></path>
                          <path d="M7 7h10v10"></path>
                        </svg>
                      </a>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
                      {coach.stats.map((stat, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-[#40F7E3]" />
                          <span className="text-gray-700 text-sm md:text-base">{stat.text}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link href={`/dashboard?ceo=${coach.id}`}>
                        <Button className="w-full sm:w-[200px] flex items-center justify-center bg-[#40F7E3] hover:bg-[#40F7E3]/80 text-[#1a3d3d] font-medium py-3 px-6 rounded-full">
                          <MessageSquare className="mr-2 h-4 w-4" /> Chat with {coach.name}
                        </Button>
                      </Link>
                      {coach.xLink && (
                        <a 
                          href={coach.xLink.href}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto"
                        >
                          <Button className="w-full sm:w-[200px] flex items-center justify-center border-2 border-[#40F7E3] bg-transparent hover:bg-[#40F7E3]/10 text-[#1a3d3d] font-medium py-3 px-6 rounded-full">
                            {coach.xLink.icon}
                            <span className="ml-2">{coach.xLink.text}</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
} 