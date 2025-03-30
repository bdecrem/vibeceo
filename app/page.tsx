import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Zap, Brain, Users } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900 -z-10" />

      {/* Header/navigation */}
      <nav className="container mx-auto py-6">
        <div className="text-2xl font-bold text-white">
          <span className="text-teal-200">Advisors</span>Foundry
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto flex flex-col items-center text-center pt-16 md:pt-24 pb-16">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            World leading startup coaches,
            <span className="block text-teal-200">freshly minted.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
            Algorithmically optimized advice that sounds just human enough to be legally distinct from actual humans.
          </p>
          <div className="pt-6">
            <Link href="/coaches">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-6 text-lg rounded-full">
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
            <div className="bg-teal-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Disruptively Mundane</h3>
            <p className="text-gray-300">
              Our advice is statistically indistinguishable from what a human would say after three Red Bulls.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="bg-teal-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Zap className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Aggressively Mediocre</h3>
            <p className="text-gray-300">
              We've trained our models on thousands of pitch decks that failed to secure funding.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl">
            <div className="bg-teal-500 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Brain className="text-white" />
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
            Meet Your <span className="text-teal-600">Definitely Human</span> Coaches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-2/5 relative h-80 md:h-auto">
                <Image src="/images/coach-1.jpeg" alt="Startup Coach" fill className="object-cover" priority />
              </div>
              <div className="p-6 md:w-3/5">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Donte Disrupt</h3>
                <p className="text-teal-600 mb-4">Chief Vision Optimizer</p>
                <p className="text-gray-700">
                  "I've pivoted more startups than a revolving door. My advice comes with a 60% confidence interval and
                  a 100% chance of sounding profound."
                </p>
                <div className="mt-4 flex space-x-2">
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">Blockchain</span>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">AI</span>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">Failure</span>
                </div>
                <div className="mt-4">
                  <Link href="/coaches" className="text-teal-600 hover:text-teal-700 font-medium">
                    More about Donte →
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row">
              <div className="md:w-2/5 relative h-80 md:h-auto">
                <Image src="/images/coach-2.jpeg" alt="Startup Coach" fill className="object-cover" priority />
              </div>
              <div className="p-6 md:w-3/5">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Venus Metrics</h3>
                <p className="text-teal-600 mb-4">Execution Specialist</p>
                <p className="text-gray-700">
                  "I don't believe in work-life balance. I believe in work-work balance. One side is your startup, the
                  other side is thinking about your startup."
                </p>
                <div className="mt-4 flex space-x-2">
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">Scaling</span>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">Burnout</span>
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm">Intensity</span>
                </div>
                <div className="mt-4">
                  <Link href="/coaches" className="text-teal-600 hover:text-teal-700 font-medium">
                    More about Venus →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/coaches">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
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
            What Our <span className="text-teal-400">Definitely Real</span> Clients Say
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
      <section className="bg-teal-900 py-16">
        <div className="container mx-auto">
          <div className="bg-teal-800/50 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to be statistically average?</h2>
            <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
              Our coaches are standing by, or at least their algorithms are. Join the 94% of startups that will
              eventually fail, but with better buzzwords.
            </p>
            <Link href="/coaches">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-teal-900 px-8 py-6 text-lg rounded-full">
                Get Started <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto py-8 border-t border-white/10 mt-auto">
        <div className="flex justify-between items-center text-gray-400 text-sm">
          <div>YC - F2025</div>
          <div>
            <a href="/product-hunt-does-not-exist" className="text-gray-400 hover:text-teal-300">
              Support us on Product Hunt ❤️
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
} 