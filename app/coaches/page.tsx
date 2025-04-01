import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MessageSquare, Clock, Award, Zap, Target, Code, Lightbulb } from "lucide-react"

export default function CoachesPage() {
  return (
    <main className="min-h-screen">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a3d3d] via-[#1e4545] to-[#1a3d3d] -z-10" />

      {/* Header */}
      <header className="text-white">
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
              <div className="text-2xl font-bold cursor-pointer hover:text-[#40e0d0] transition-colors">
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
          {/* Donte */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-80 md:h-auto">
                <Image src="/images/coach-1.jpeg" alt="Donte Disrupt" fill className="object-cover" priority />
              </div>
              <div className="p-8 md:w-2/3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Donte Disrupt</h2>
                    <p className="text-[#40e0d0] text-lg">Chief Vision Optimizer</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 text-lg">
                  "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and
                  a 100% chance of sounding profound." Donte most recently <a href="https://v0-new-project-su1cynagsdw.vercel.app" target="_blank" rel="noopener noreferrer" className="text-[#40e0d0] hover:text-[#3bcdc0]">worked at DOGE</a>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">10+ pivots executed</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">60-min vision sessions</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Vision architect</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Disruption expert</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Blockchain</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">AI</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Failure</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Pivots</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="border-[#40e0d0] text-[#40e0d0] hover:bg-[#e6faf8]">
                    <Calendar className="mr-2 h-4 w-4" /> Book a Session
                  </Button>
                  <Link href="/dashboard?ceo=donte">
                    <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with Donte
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Alex */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-80 md:h-auto">
                <Image src="/images/coach-5.png" alt="Alex Monroe" fill className="object-cover" priority />
              </div>
              <div className="p-8 md:w-2/3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Alex Monroe</h2>
                    <p className="text-[#40e0d0] text-lg">Founder & CEO of LUNAA</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 text-lg">
                  "From gut-healing beauty elixirs to biohacked lattes, I'm leading a new era of high-performance self-care that blends adaptogens with algorithm-friendly aesthetics. Whether hosting BioSync retreats or experimenting with cellular hydration formulas, I'm redefining what it means to glow."
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">$3.5M Seed Round Raised</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">90-min wellness sessions</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">DTC Growth Expert</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Wellness Innovator</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Wellness</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">DTC</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Scaling</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Brand Building</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Community</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="border-[#40e0d0] text-[#40e0d0] hover:bg-[#e6faf8]">
                    <Calendar className="mr-2 h-4 w-4" /> Book a Session
                  </Button>
                  <Link href="/dashboard?ceo=alex">
                    <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with Alex
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Venus */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-80 md:h-auto">
                <Image src="/images/coach-2.jpeg" alt="Venus Metrics" fill className="object-cover" priority />
              </div>
              <div className="p-8 md:w-2/3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Venus Metrics</h2>
                    <p className="text-[#40e0d0] text-lg">Execution Specialist</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 text-lg">
                  "I don't believe in work-life balance. I believe in work-work balance. One side is your startup, the
                  other side is thinking about your startup. I'll help you optimize every minute of your day for maximum
                  burnout efficiency."
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">5+ acquisitions</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">90-min intensive sessions</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Execution expert</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Productivity maximizer</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Scaling</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Burnout</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Intensity</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Metrics</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Growth</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="border-[#40e0d0] text-[#40e0d0] hover:bg-[#e6faf8]">
                    <Calendar className="mr-2 h-4 w-4" /> Book a Session
                  </Button>
                  <Link href="/dashboard?ceo=venus">
                    <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with Venus
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Kailey */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-80 md:h-auto">
                <Image src="/images/coach-3.jpeg" alt="Kailey Calm" fill className="object-cover" priority />
              </div>
              <div className="p-8 md:w-2/3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Kailey Calm</h2>
                    <p className="text-[#40e0d0] text-lg">Strategic Alignment Officer</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 text-lg">
                  "While others are chasing the next shiny object, I help founders find clarity in chaos. My approach
                  combines ruthless prioritization with strategic patience. I'll help you identify which fires are worth
                  letting burn."
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">10+ years in venture capital</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">75-min strategic sessions</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Focus architect</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Decision framework expert</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Strategy</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Focus</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Prioritization</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Funding</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Patience</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="border-[#40e0d0] text-[#40e0d0] hover:bg-[#e6faf8]">
                    <Calendar className="mr-2 h-4 w-4" /> Book a Session
                  </Button>
                  <Link href="/dashboard?ceo=kailey">
                    <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with Kailey
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Alice */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 relative h-80 md:h-auto">
                <Image src="/images/coach-4.jpeg" alt="Alice Logic" fill className="object-cover" priority />
              </div>
              <div className="p-8 md:w-2/3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Alice Logic</h2>
                    <p className="text-[#40e0d0] text-lg">Technical Translation Expert</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6 text-lg">
                  "Most founders can't tell the difference between AI, ML, and a fancy IF statement. I bridge the gap
                  between technical possibilities and business realities. I'll help you understand what your engineers
                  are actually building."
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center">
                    <Code className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Former CTO of 3 startups</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">60-min technical reviews</span>
                  </div>
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">Tech-to-business translator</span>
                  </div>
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-[#40e0d0] mr-2" />
                    <span className="text-gray-700">AI reality checker</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">AI</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Engineering</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Technical</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Architecture</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Feasibility</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="border-[#40e0d0] text-[#40e0d0] hover:bg-[#e6faf8]">
                    <Calendar className="mr-2 h-4 w-4" /> Book a Session
                  </Button>
                  <Link href="/dashboard?ceo=alice">
                    <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                      <MessageSquare className="mr-2 h-4 w-4" /> Chat with Alice
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
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