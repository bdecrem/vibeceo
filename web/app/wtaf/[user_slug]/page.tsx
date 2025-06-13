interface UserPageProps {
  params: {
    user_slug: string
  }
}

export default function UserPage({ params }: UserPageProps) {
  const { user_slug } = params

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="text-xl md:text-2xl text-white space-y-4 leading-relaxed">
          <p>✅ Welcome to {user_slug}.</p>
          <p>This is the front porch. The weirdness lives deeper inside.</p>
          <p>Double-check your URL, or just vibe for a bit.</p>
        </div>
      </div>
    </div>
  )
}

export function generateMetadata({ params }: UserPageProps) {
  return {
    title: `${params.user_slug} - WTAF`,
    description: `Welcome to ${params.user_slug}'s corner of the weirdness.`
  }
} 