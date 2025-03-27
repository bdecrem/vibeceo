import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">VibeCEO</h1>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link href="/chat">
          <Button className="w-full">
            Enter Chat
          </Button>
        </Link>
        
        <div className="border rounded-lg p-4 mt-6">
          <h2 className="text-xl font-semibold mb-3">API Tests</h2>
          <p className="text-sm text-gray-600 mb-4">
            These pages help test different API implementations to fix model issues
          </p>
          
          <div className="flex flex-col gap-2">
            <Link href="/direct">
              <Button variant="outline" className="w-full">
                Test Direct API
              </Button>
            </Link>
            
            <Link href="/netlify-test">
              <Button variant="outline" className="w-full">
                Test Netlify Function
              </Button>
            </Link>
            
            <Link href="/api/check">
              <Button variant="outline" className="w-full">
                Test Pages API
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 