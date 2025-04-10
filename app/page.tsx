import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, Brain, Users } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="bg-pink-500 text-white text-center py-2 font-bold">
        <a href="https://discord.gg/RPTHWHgJhm" target="_blank" rel="noopener noreferrer">
          💡 Join the Discord to pitch your idea to the coaches!
        </a>
      </div>

      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a3d3d] via-[#1e4545] to-[#1a3d3d] -z-10" />

      {/* Header/navigation */}
      <nav className="container mx-auto py-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="AdvisorsFoundry Logo"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <div className="text-2xl font-bold text-white">
            <span className="text-[#40e0d0]">Advisors</span>Foundry
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center text-center pt-16 md:pt-24 pb-16">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            World leading startup coaches,
            <span className="block text-[#40e0d0]">freshly minted.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Algorithmically optimized advice that sounds just human enough to be legally distinct from actual humans.
          </p>
          <div className="pt-6">
            <Link href="/coaches">
              <Button size="lg" className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] px-8 py-6 text-lg rounded-full font-medium">
                Get Started <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="bg-[#40e0d0] w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-[#1a3d3d]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Disruptively Mundane</h3>
            <p className="text-gray-300">
              Our advice is statistically indistinguishable from what a human would say after three Red Bulls.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="bg-[#40e0d0] w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Zap className="text-[#1a3d3d]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aggressively Mediocre</h3>
            <p className="text-gray-300">
              We've trained our models on thousands of pitch decks that failed to secure funding.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="bg-[#40e0d0] w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Brain className="text-[#1a3d3d]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Artificially Authentic</h3>
            <p className="text-gray-300">
              Our coaches have been carefully designed to seem just human enough to avoid legal scrutiny.
            </p>
          </div>
        </div>
      </section>

      {/* Coaches Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Meet Your <span className="text-[#40e0d0]">Definitely Human</span> Coaches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-2/5 relative h-80 md:h-auto">
                <Image src="/images/coach-1.jpeg" alt="Startup Coach" fill className="object-cover object-[center_top]" priority />
              </div>
              <div className="p-6 md:w-3/5">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Donte Disrupt</h3>
                <p className="text-[#40e0d0] mb-4">Chief Vision Optimizer</p>
                <p className="text-gray-700">
                  "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and
                  a 100% chance of sounding profound."
                </p>
                <div className="mt-4 flex space-x-2">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Blockchain</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">AI</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Failure</span>
                </div>
                <div className="mt-4">
                  <Link href="/coaches" className="text-[#40e0d0] hover:text-[#3bcdc0] font-medium">
                    More about Donte →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-2/5 relative h-80 md:h-auto">
                <Image src="/images/coach-5.png" alt="Startup Coach" fill className="object-cover object-[center_top]" priority />
              </div>
              <div className="p-6 md:w-3/5">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Alex Monroe</h3>
                <p className="text-[#40e0d0] mb-4">Founder & CEO of Alexir</p>
                <p className="text-gray-700">
                  "Whether I'm hosting BioSync retreats in Tulum, experimenting with cellular hydration formulas, or leading walking meetings down Abbot Kinney, I'm redefining the wellness founder archetype one chlorophyll latte at a time."
                </p>
                <div className="mt-4 flex space-x-2">
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Wellness</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">DTC</span>
                  <span className="bg-[#e6faf8] text-[#1a3d3d] px-3 py-1 rounded-full text-sm">Scaling</span>
                </div>
                <div className="mt-4">
                  <Link href="/coaches" className="text-[#40e0d0] hover:text-[#3bcdc0] font-medium">
                    More about Alex →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/coaches">
              <Button className="bg-[#40e0d0] hover:bg-[#3bcdc0] text-[#1a3d3d] font-medium">
                <Users className="mr-2 h-4 w-4" /> Meet All Our Coaches
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-black py-16">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            What Our <span className="text-[#40e0d0]">Definitely Real</span> Clients Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 p-6 rounded-xl">
              <p className="text-gray-300 italic mb-4">
                "After three sessions with Donte, I pivoted my dog-walking app into a blockchain solution for virtual
                pet ownership. We're currently pre-revenue but our burn rate is impressively efficient."
              </p>
              <p className="text-white font-semibold">— CEO of PetherCoin</p>
            </div>
            <div className="bg-gray-900 p-6 rounded-xl">
              <p className="text-gray-300 italic mb-4">
                "Venus helped me realize that sleep is just a social construct invented by mattress companies. Our team
                now works in synchronized 20-minute nap cycles."
              </p>
              <p className="text-white font-semibold">— Founder, NapMap (Acquired for $0.3M)</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to be statistically average?</h2>
          <p className="text-xl text-[#40e0d0] mb-8 max-w-2xl mx-auto">
            Our coaches are standing by, or at least their algorithms are. Join the 94% of startups that will
            eventually fail, but with better buzzwords.
          </p>
          <Link href="/coaches">
            <Button size="lg" className="bg-white hover:bg-gray-100 text-[#1a3d3d] px-8 py-6 text-lg rounded-full font-medium">
              Get Started <ArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto py-8 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
          <div className="flex-1 text-left">
            <a href="https://coaches.advisorsfoundry.ai" target="_blank" rel="noopener noreferrer" className="hover:text-[#40e0d0]">
              YC - F2025
            </a>
          </div>
          <div className="flex-1 text-center">
            <a href="https://discord.gg/RPTHWHgJhm" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#40e0d0]">
              Join the Discord
            </a>
          </div>
          <div className="flex-1 text-right">
            <a href="/product-hunt-does-not-exist" className="text-gray-400 hover:text-[#40e0d0]">
              Support us on Product Hunt ❤️
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
} 