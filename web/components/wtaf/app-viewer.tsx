"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import WTAFNavigationBar from "./navigation-bar";

interface WTAFAppViewerProps {
  userSlug: string;
  appSlug: string;
  htmlContent: string;
}

export default function WTAFAppViewer({ 
  userSlug, 
  appSlug, 
  htmlContent 
}: WTAFAppViewerProps) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for navigation requests from iframe (stackobjectify apps)
    const handleMessage = (event: MessageEvent) => {
      // For srcDoc iframes, we can't reliably check the source
      // Instead, check if the message is the expected format
      console.log('📨 Received message:', event.data, 'from:', event.origin);

      if (event.data && event.data.type === 'NAVIGATE_REQUEST') {
        console.log('📍 Navigation request from iframe:', event.data.url);
        
        // Navigate to the requested URL
        const currentPath = window.location.pathname;
        const newUrl = event.data.url ? `${currentPath}${event.data.url}` : currentPath;
        
        console.log('🚀 Navigating to:', newUrl);
        
        // Use router.push to navigate
        router.push(newUrl);
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [router, userSlug, appSlug]);

  return (
    <div className="wtaf-app-container">
      {/* Navigation Bar */}
      <WTAFNavigationBar 
        userSlug={userSlug} 
        appSlug={appSlug} 
      />
      
      {/* App Content Iframe */}
      <div className="wtaf-iframe-container">
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          className="wtaf-app-iframe"
          loading="eager"
          title={`WTAF App: ${appSlug} by ${userSlug}`}
          allowFullScreen
        />
      </div>

      <style jsx>{`
        .wtaf-app-container {
          width: 100%;
          height: 100vh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .wtaf-iframe-container {
          flex: 1;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .wtaf-app-iframe {
          width: 100%;
          height: 100%;
          border: none;
          background-color: white;
          display: block;
        }

        /* Ensure no scrollbars on the container */
        .wtaf-app-container {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* Internet Explorer 10+ */
        }

        .wtaf-app-container::-webkit-scrollbar {
          display: none; /* WebKit */
        }
      `}</style>
    </div>
  );
} 