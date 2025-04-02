import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MessageSquare, Clock, Award, Zap, Target, Code, Lightbulb } from "lucide-react"

export default function CoachesPage() {
  return (
    <main className="min-h-screen bg-[#f7fafa]">
      {/* Header */}
      <header className="bg-[#0F4A4A] text-white">
        <div className="container mx-auto py-6">
          <Link href="/" className="inline-block">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="AdvisorsFoundry Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <div className="text-2xl font-bold cursor-pointer">
                <span className="text-[#40e0d0]">Advisors</span>Foundry
              </div>
            </div>
          </Link>
        </div>
        <div className="container mx-auto py-12 md:py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Meet Our Coaches</h1>
          <p className="text-xl text-[#40e0d0] max-w-2xl mx-auto">
            Select the perfect advisor to guide your startup through its inevitable pivot to AI.
          </p>
        </div>
      </header>

      {/* Coaches Grid */}
      <section className="container mx-auto py-12 md:py-20">
        <div className="grid grid-cols-1 gap-12">
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
                href: "https://v0-new-project-su1cynagsdw.vercel.app"
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
              title: 'Founder & CEO of LUNAA',
              image: '/images/coach-5.png',
              quote: "From gut-healing beauty elixirs to biohacked lattes, I'm leading a new era of high-performance self-care that blends adaptogens with algorithm-friendly aesthetics. Whether hosting BioSync retreats or experimenting with cellular hydration formulas, I'm redefining what it means to glow.",
              bio: [
                "Raised between Topanga Canyon and Santa Monica, Alex launched LUNAA from her dorm at UCLA with a single product: a marine collagen sea moss blend that sold out after going viral on TikTok. Today, LUNAA is stocked in Erewhon, loved by influencers, and backed by a VC fund known for investing in \"spiritually scalable\" tech.",
                "Alex is more than a founder — she's a movement. Her approach combines ancient wisdom with modern science, creating wellness solutions that are both Instagram-worthy and scientifically sound. Through her BioSync retreats and walking meetings down Abbot Kinney, she's pioneering a new paradigm of entrepreneurship that prioritizes cellular alignment alongside capital efficiency."
              ],
              socialLink: {
                text: "Follow Alex's Journey on LinkedIn",
                href: "#"
              },
              stats: [
                { icon: Award, text: "$3.5M Seed Raised" },
                { icon: Clock, text: "90-min sessions" },
                { icon: Zap, text: "DTC Expert" },
                { icon: Target, text: "Wellness Pioneer" }
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
                "Her coaching style combines data-driven insights with an almost religious devotion to metrics. She's famous for her \"no-excuses\" approach to startup growth and her controversial belief that weekends are just poorly optimized workdays."
              ],
              socialLink: {
                text: "Read Venus's Productivity Tips",
                href: "#"
              },
              stats: [
                { icon: Award, text: "5+ acquisitions" },
                { icon: Clock, text: "90-min intensive sessions" },
                { icon: Zap, text: "Execution expert" },
                { icon: Target, text: "Productivity maximizer" }
              ]
            },
            {
              id: 'kailey',
              name: 'Kailey Calm',
              title: 'Strategic Alignment Officer',
              image: '/images/coach-3.jpeg',
              quote: "While others are chasing the next shiny object, I help founders find clarity in chaos. My approach combines ruthless prioritization with strategic patience. I'll help you identify which fires are worth letting burn.",
              bio: [
                "Kailey brings a zen-like approach to the chaotic world of startups. After spending a decade in venture capital and witnessing countless founders burn out chasing every opportunity, she developed a framework for strategic patience that has become legendary in Silicon Valley.",
                "Her unique methodology helps founders distinguish between genuine opportunities and shiny distractions. When not advising startups, Kailey practices what she preaches through mindful meditation and strategic procrastination."
              ],
              socialLink: {
                text: "Read Kailey's Strategic Insights",
                href: "#"
              },
              stats: [
                { icon: Award, text: "10+ years in venture capital" },
                { icon: Clock, text: "75-min strategic sessions" },
                { icon: Zap, text: "Focus architect" },
                { icon: Target, text: "Decision framework expert" }
              ]
            },
            {
              id: 'alice',
              name: 'Alice Logic',
              title: 'Technical Translation Expert',
              image: '/images/coach-4.jpeg',
              quote: "Most founders can't tell the difference between AI, ML, and a fancy IF statement. I bridge the gap between technical possibilities and business realities. I'll help you understand what your engineers are actually building.",
              bio: [
                "As a former CTO of three startups, Alice has seen every flavor of technical confusion and over-promise. She specializes in translating between engineer-speak and founder-speak, helping both sides understand what's actually possible with current technology.",
                "Her pragmatic approach to technical assessment has saved countless startups from building solutions in search of problems. She excels at helping non-technical founders understand their technical stack without getting lost in the details."
              ],
              socialLink: {
                text: "Read Alice's Tech Insights",
                href: "#"
              },
              stats: [
                { icon: Code, text: "Former CTO of 3 startups" },
                { icon: Clock, text: "60-min technical reviews" },
                { icon: Lightbulb, text: "Tech-to-business translator" },
                { icon: Target, text: "AI reality checker" }
              ]
            }
          ].map((coach) => (
            <div key={coach.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3 relative h-80 md:h-auto">
                  <Image src={coach.image} alt={coach.name} fill className="object-cover" priority />
                </div>
                <div className="p-8 md:w-2/3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{coach.name}</h2>
                      <p className="text-[#40e0d0] text-lg">{coach.title}</p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-6 italic">
                    "{coach.quote}"
                  </p>

                  <div className="text-gray-700 space-y-4 mb-8">
                    {coach.bio.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>

                  <a href={coach.socialLink.href} className="text-[#40F7E3] hover:text-[#40F7E3]/80 flex items-center gap-3 mb-8" target="_blank" rel="noopener noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    {coach.socialLink.text}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M7 17L17 7"></path>
                      <path d="M7 7h10v10"></path>
                    </svg>
                  </a>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-8 mb-8">
                    {coach.stats.map((stat, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <stat.icon className="h-6 w-6 text-[#40F7E3]" />
                        <span className="text-gray-700">{stat.text}</span>
                      </div>
                    ))}
                  </div>

                  <Link href={`/dashboard?ceo=${coach.id}`}>
                    <Button className="bg-[#40F7E3] hover:bg-[#40F7E3]/80 text-[#1a3d3d] font-medium py-3 px-6 rounded-full">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with {coach.name.split(' ')[0]}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#f7fafa] p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">How do coaching sessions work?</h3>
              <p className="text-gray-700">
                Our coaching sessions are conducted via video call and last between 60-90 minutes depending on the
                coach. You'll receive a calendar invite with a link after booking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
} 