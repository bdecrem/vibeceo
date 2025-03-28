import Image from "next/image"

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#9e3a2f] to-[#d68e2e] relative overflow-hidden">
      <div className="container mx-auto px-6 py-12 md:py-16 relative z-10">
        <div className="mb-16">
          <Image
            src="/images/logo-white.png"
            alt="myVEO Logo"
            width={215}
            height={70}
            className="w-auto h-[70px]"
            priority
          />
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Leadership that
              <br />
              inspires,
              <br />
              automated.
            </h1>
          </div>

          <div className="md:w-1/2 flex justify-end">
            <Image
              src="/images/team-image.png"
              alt="Leadership Team"
              width={600}
              height={600}
              className="w-full max-w-[600px]"
              priority
            />
          </div>
        </div>
      </div>
    </main>
  )
}

