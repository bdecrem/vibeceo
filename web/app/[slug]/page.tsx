interface UserPageProps {
  params: {
    slug: string
  }
}

export default function UserPage({ params }: UserPageProps) {
  const { slug } = params

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="text-6xl mb-8">✅</div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome to {slug}.
        </h1>
        
        <div className="text-xl md:text-2xl text-gray-200 space-y-4 leading-relaxed">
          <p>This is the front porch. The weirdness lives deeper inside.</p>
          <p>Double-check your URL, or just vibe for a bit.</p>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-600">
          <p className="text-gray-400 text-sm">
            Looking for something specific? Try <span className="text-blue-300">wtaf.me/{slug}/something</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function generateMetadata({ params }: UserPageProps) {
  return {
    title: `${params.slug} - WTAF`,
    description: `Welcome to ${params.slug}'s corner of the weirdness.`
  }
} 