"use client"

import { useParams } from "next/navigation"
import { useState, useRef } from "react"

export default function MemePage() {
  const params = useParams()
  const memeId = params.memeId as string
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const [isDownloading, setIsDownloading] = useState(false)
  const canvasRef = useRef(null)

  // Mock meme data - in real app this would come from API
  const memeData = {
    1: {
      id: 1,
      image: "/wtaf-landing/images/alex-blog.png",
      title: "When your SMS prompt actually works",
      prompt: "wtaf make a meme about coding success",
      creator: "alex",
      createdAt: "2024-03-20",
      views: 12847,
      downloads: 2341,
      tags: ["coding", "success", "wtaf", "programming"],
      description: "That feeling when your one-shot prompt creates exactly what you wanted on the first try.",
    },
    2: {
      id: 2,
      image: "/wtaf-landing/images/berghain.png",
      title: "Berghain Bouncer vs Your App Idea",
      prompt: "wtaf create a meme about getting into exclusive clubs",
      creator: "bart",
      createdAt: "2024-03-19",
      views: 8923,
      downloads: 1876,
      tags: ["berghain", "club", "exclusive", "berlin"],
      description: "When the Berghain bouncer is easier to get past than your app's authentication system.",
    },
    3: {
      id: 3,
      image: "/wtaf-landing/images/pong.png",
      title: "Retro Gaming Nostalgia Hit Different",
      prompt: "wtaf make a meme about old school gaming",
      creator: "zoe",
      createdAt: "2024-03-18",
      views: 15632,
      downloads: 3421,
      tags: ["retro", "gaming", "nostalgia", "pong"],
      description: "When you realize Pong had better gameplay than most modern mobile games.",
    },
  }

  const meme = memeData[memeId] || memeData[1] // fallback to first meme

  const showCopiedNotification = (text) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 2000)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handleCopyUrl = async () => {
    const memeUrl = `${window.location.origin}/meme/${meme.id}`
    const success = await copyToClipboard(memeUrl)
    if (success) {
      showCopiedNotification("Meme URL copied!")
    }
  }

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(meme.prompt)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
  }

  const downloadImage = async () => {
    setIsDownloading(true)

    try {
      // Create a canvas to handle the image
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.crossOrigin = "anonymous"

      img.onload = async () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw image to canvas
        ctx.drawImage(img, 0, 0)

        // Convert to blob
        canvas.toBlob(
          async (blob) => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            const isAndroid = /Android/.test(navigator.userAgent)

            if (isMobile) {
              // Try Web Share API first (works on iOS Safari and many Android browsers)
              if (navigator.share && navigator.canShare) {
                try {
                  const file = new File([blob], `wtaf-meme-${meme.id}.png`, {
                    type: "image/png",
                    lastModified: Date.now(),
                  })

                  // Check if files can be shared
                  if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                      title: `WTAF Meme: ${meme.title}`,
                      text: "Check out this meme from WTAF!",
                      files: [file],
                    })
                    showCopiedNotification("Shared! Choose 'Save to Photos' to add to camera roll")
                    setIsDownloading(false)
                    return
                  }
                } catch (shareError) {
                  console.log("Web Share API failed, trying alternative methods")
                }
              }

              // iOS specific handling
              if (isIOS) {
                try {
                  // Create a temporary URL and trigger download
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement("a")
                  link.href = url
                  link.download = `wtaf-meme-${meme.id}.png`
                  link.style.display = "none"

                  // Add to DOM, click, and remove
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)

                  // Clean up
                  setTimeout(() => URL.revokeObjectURL(url), 100)

                  showCopiedNotification("Downloaded! Tap and hold the image in Downloads, then 'Save to Photos'")
                } catch (error) {
                  console.error("iOS download failed:", error)
                  fallbackDownload(blob)
                }
              }
              // Android specific handling
              else if (isAndroid) {
                try {
                  // Try to create a download with proper MIME type
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement("a")
                  link.href = url
                  link.download = `wtaf-meme-${meme.id}.png`
                  link.type = "image/png"

                  // Trigger download
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)

                  setTimeout(() => URL.revokeObjectURL(url), 100)

                  showCopiedNotification("Downloaded! Check your Downloads folder or Gallery")
                } catch (error) {
                  console.error("Android download failed:", error)
                  fallbackDownload(blob)
                }
              }
              // Other mobile devices
              else {
                fallbackDownload(blob)
              }
            } else {
              // Desktop download
              fallbackDownload(blob)
            }

            setIsDownloading(false)
          },
          "image/png",
          1.0,
        ) // High quality PNG
      }

      img.onerror = () => {
        console.error("Failed to load image")
        setIsDownloading(false)
        // Direct link fallback
        const link = document.createElement("a")
        link.href = meme.image
        link.download = `wtaf-meme-${meme.id}.png`
        link.click()
        showCopiedNotification("Download started")
      }

      img.src = meme.image
    } catch (error) {
      console.error("Download failed:", error)
      setIsDownloading(false)
      showCopiedNotification("Download failed. Try again.")
    }
  }

  const fallbackDownload = (blob) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `wtaf-meme-${meme.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showCopiedNotification("Downloaded to device!")
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{meme.title} - WTAF Memes</title>
        <meta name="description" content={meme.description} />
        <meta property="og:title" content={meme.title} />
        <meta property="og:description" content={meme.description} />
        <meta property="og:image" content={meme.image} />
        <meta property="og:type" content="website" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Copied Notification */}
        {copiedNotification.show && (
          <div className="copied-notification">
            <span className="copied-text">{copiedNotification.text}</span>
            <span className="copied-checkmark">✓</span>
          </div>
        )}

        {/* Electric sparks */}
        <div className="sparks">
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
          <div className="spark"></div>
        </div>

        {/* Floating punk elements */}
        <div className="float-element skull">💀</div>
        <div className="float-element lightning">⚡</div>
        <div className="float-element fire">🔥</div>
        <div className="float-element chains">⛓️</div>

        <header>
          <div className="logo glitch" data-text="MEMES">
            MEMES
          </div>
          <div className="tagline">ALGORITHMIC CHAOS VISUALIZED</div>
          <nav className="nav-back">
            <a href="/" className="back-link">
              ← Back to WTAF
            </a>
          </nav>
        </header>

        <main>
          <div className="meme-container">
            {/* Main Meme Display */}
            <section className="meme-display">
              <div className="meme-image-container">
                <img src={meme.image || "/placeholder.svg"} alt={meme.title} className="meme-image" />
                <div className="meme-overlay">
                  <div className="action-buttons">
                    <button className="action-btn copy-url-btn" onClick={handleCopyUrl}>
                      <span className="btn-icon">🔗</span>
                      <span className="btn-text">COPY URL</span>
                    </button>
                    <button className="action-btn download-btn" onClick={downloadImage} disabled={isDownloading}>
                      <span className="btn-icon">{isDownloading ? "⏳" : "📱"}</span>
                      <span className="btn-text">{isDownloading ? "SAVING..." : "SAVE TO DEVICE"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Meme Info Sidebar */}
            <section className="meme-info">
              <div className="info-card">
                <div className="action-buttons-mobile">
                  <button className="mobile-action-btn copy-url-btn" onClick={handleCopyUrl}>
                    <span className="btn-icon">🔗</span>
                    <span className="btn-text">COPY URL</span>
                  </button>
                  <button className="mobile-action-btn download-btn" onClick={downloadImage} disabled={isDownloading}>
                    <span className="btn-icon">{isDownloading ? "⏳" : "📱"}</span>
                    <span className="btn-text">{isDownloading ? "SAVING..." : "SAVE TO DEVICE"}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            background: linear-gradient(135deg, #2d0a2d 0%, #4d1a4d 25%, #660066 50%, #4d0066 75%, #330033 100%);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }

          .copied-notification {
            position: fixed;
            top: 30px;
            right: 30px;
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000000;
            padding: 15px 25px;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 
              0 8px 25px rgba(255, 0, 255, 0.3),
              0 0 20px rgba(255, 0, 255, 0.2);
            animation: slideInFade 2s ease-out;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          }

          .copied-checkmark {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            color: #000000;
          }

          @keyframes slideInFade {
            0% {
              transform: translateX(100px);
              opacity: 0;
            }
            20% {
              transform: translateX(0);
              opacity: 1;
            }
            80% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(100px);
              opacity: 0;
            }
          }

          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          .float-element {
            position: absolute;
            opacity: 0.4;
            animation: float 8s ease-in-out infinite;
            pointer-events: none;
            filter: drop-shadow(0 0 10px rgba(255, 0, 255, 0.3));
          }

          .skull {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(255, 0, 255, 0.3);
            animation-delay: 0s;
          }

          .lightning {
            top: 30%;
            right: 8%;
            font-size: 4rem;
            color: rgba(0, 255, 255, 0.4);
            animation-delay: 3s;
          }

          .fire {
            bottom: 25%;
            left: 12%;
            font-size: 3.8rem;
            color: rgba(255, 100, 255, 0.4);
            animation-delay: 6s;
          }

          .chains {
            bottom: 10%;
            right: 15%;
            font-size: 3.2rem;
            color: rgba(200, 100, 255, 0.3);
            animation-delay: 2s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-30px) rotate(8deg); }
            66% { transform: translateY(20px) rotate(-6deg); }
          }

          .glitch {
            position: relative;
            display: inline-block;
          }

          .glitch::before,
          .glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }

          .glitch::before {
            animation: glitch1 2s infinite;
            color: #ff00ff;
            z-index: -1;
          }

          .glitch::after {
            animation: glitch2 2s infinite;
            color: #00ffff;
            z-index: -2;
          }

          @keyframes glitch1 {
            0%, 90%, 100% { transform: translate(0); }
            10% { transform: translate(-2px, -1px); }
            20% { transform: translate(1px, 2px); }
          }

          @keyframes glitch2 {
            0%, 90%, 100% { transform: translate(0); }
            10% { transform: translate(2px, 1px); }
            20% { transform: translate(-1px, -2px); }
          }

          header {
            padding: 40px 20px;
            text-align: center;
            position: relative;
            z-index: 10;
          }

          .logo {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 4rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow:
              0 0 10px #ff00ff,
              0 0 20px #ff00ff,
              0 0 30px #ff00ff;
            margin-bottom: 15px;
            letter-spacing: -2px;
          }

          .tagline {
            font-size: 1.1rem;
            color: #ff00ff;
            font-weight: 500;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 30px;
            text-shadow: 0 0 5px #ff00ff;
          }

          .nav-back {
            margin-top: 20px;
          }

          .back-link {
            color: #00ffff;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            transition: all 0.3s ease;
          }

          .back-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
          }

          main {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 5;
          }

          .meme-container {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 40px;
            margin-bottom: 80px;
          }

          .meme-display {
            position: relative;
          }

          .meme-image-container {
            position: relative;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 0, 255, 0.3);
            border-radius: 20px;
            padding: 20px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(255, 0, 255, 0.1);
            overflow: hidden;
          }

          .meme-image-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
            background-size: 200% 100%;
            animation: borderGlow 3s linear infinite;
          }

          @keyframes borderGlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .meme-image {
            width: 100%;
            height: auto;
            max-height: 80vh;
            object-fit: contain;
            border-radius: 15px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            filter: drop-shadow(0 0 20px rgba(255, 0, 255, 0.3));
            transition: all 0.3s ease;
          }

          .meme-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to bottom, transparent 0%, transparent 70%, rgba(0, 0, 0, 0.8) 100%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding: 30px;
            opacity: 0;
            transition: all 0.3s ease;
            border-radius: 20px;
          }

          .meme-image-container:hover .meme-overlay {
            opacity: 1;
          }

          .action-buttons {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .action-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px 25px;
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000000;
            border: none;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
              0 8px 25px rgba(255, 0, 255, 0.3),
              0 0 20px rgba(255, 0, 255, 0.2);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          }

          .action-btn:hover:not(:disabled) {
            transform: translateY(-3px) scale(1.05);
            box-shadow:
              0 15px 35px rgba(255, 0, 255, 0.4),
              0 0 30px rgba(255, 0, 255, 0.3);
          }

          .action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .copy-url-btn {
            background: linear-gradient(45deg, #00ffff, #0080ff);
          }

          .download-btn {
            background: linear-gradient(45deg, #ff00ff, #ff0080);
          }

          .btn-icon {
            font-size: 1.2rem;
          }

          .btn-text {
            font-weight: 700;
          }

          .meme-info {
            position: sticky;
            top: 20px;
            height: fit-content;
          }

          .info-card {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 0, 255, 0.3);
            border-radius: 20px;
            padding: 30px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(255, 0, 255, 0.1);
          }

          .info-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
            background-size: 200% 100%;
            animation: borderGlow 3s linear infinite;
          }

          .meme-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.8rem;
            color: #ffffff;
            margin-bottom: 20px;
            font-weight: 700;
            line-height: 1.2;
            text-shadow: 0 0 15px #ff00ff;
          }

          .meme-stats {
            display: flex;
            gap: 30px;
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 0, 255, 0.2);
          }

          .stat {
            text-align: center;
          }

          .stat-number {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            color: #ff00ff;
            font-weight: 700;
            text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
            display: block;
          }

          .stat-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .creator-section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 0, 255, 0.2);
          }

          .creator-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .creator-label {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
          }

          .creator-handle {
            color: #00ffff;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            transition: all 0.3s ease;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
          }

          .created-date {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.5);
            font-family: 'Space Grotesk', sans-serif;
          }

          .description-section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 0, 255, 0.2);
          }

          .meme-description {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            font-weight: 300;
          }

          .prompt-section {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 0, 255, 0.2);
          }

          .prompt-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
          }

          .prompt-showcase {
            color: #00ffff;
            font-family: 'Space Grotesk', monospace;
            font-size: 1rem;
            font-weight: 500;
            background: rgba(0, 255, 255, 0.1);
            border: 2px solid rgba(0, 255, 255, 0.3);
            border-radius: 12px;
            padding: 15px;
            text-shadow: 0 0 8px rgba(0, 255, 255, 0.5);
            backdrop-filter: blur(5px);
            font-style: italic;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
          }

          .prompt-showcase:hover {
            background: rgba(0, 255, 255, 0.15);
            border-color: rgba(0, 255, 255, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
          }

          .tags-section {
            margin-bottom: 25px;
          }

          .tags-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
          }

          .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .tag {
            background: rgba(255, 0, 255, 0.2);
            border: 1px solid rgba(255, 0, 255, 0.4);
            color: #ff00ff;
            padding: 6px 12px;
            border-radius: 15px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
            font-weight: 600;
            text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .tag:hover {
            background: rgba(255, 0, 255, 0.3);
            border-color: rgba(255, 0, 255, 0.6);
            transform: translateY(-1px);
          }

          .action-buttons-mobile {
            display: none;
          }

          .mobile-action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 15px 20px;
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000000;
            border: none;
            border-radius: 50px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow:
              0 8px 25px rgba(255, 0, 255, 0.3),
              0 0 20px rgba(255, 0, 255, 0.2);
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
            width: 100%;
          }

          .mobile-action-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow:
              0 12px 30px rgba(255, 0, 255, 0.4),
              0 0 25px rgba(255, 0, 255, 0.3);
          }

          .mobile-action-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .sparks {
            position: fixed;
            width: 100%;
            height: 100%;
            z-index: 1;
            overflow: hidden;
            top: 0;
            left: 0;
            pointer-events: none;
          }

          .spark {
            position: absolute;
            width: 2px;
            height: 2px;
            background: #ff00ff;
            border-radius: 50%;
            opacity: 0;
            animation: spark 4s infinite ease-out;
            box-shadow: 0 0 6px #ff00ff;
          }

          .spark:nth-child(1) {
            top: 25%;
            left: 20%;
            animation-delay: 0s;
          }

          .spark:nth-child(2) {
            top: 70%;
            left: 80%;
            animation-delay: 1.5s;
          }

          .spark:nth-child(3) {
            top: 50%;
            left: 10%;
            animation-delay: 3s;
          }

          .spark:nth-child(4) {
            top: 30%;
            left: 90%;
            animation-delay: 2.2s;
          }

          @keyframes spark {
            0% {
              opacity: 0;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(2);
            }
            100% {
              opacity: 0;
              transform: scale(1);
            }
          }

          @media (max-width: 1024px) {
            .meme-container {
              grid-template-columns: 1fr;
              gap: 30px;
            }
            
            .meme-info {
              position: static;
            }
            
            .action-buttons {
              display: none;
            }
            
            .action-buttons-mobile {
              display: flex;
              flex-direction: column;
              gap: 15px;
              margin-top: 20px;
            }
            
            .meme-overlay {
              display: none;
            }
          }

          @media (max-width: 768px) {
            .logo { font-size: 3rem; }
            .meme-title { font-size: 1.5rem; }
            .info-card { padding: 25px 20px; }
            .meme-image-container { padding: 15px; }
            .copied-notification {
              top: 20px;
              right: 20px;
              padding: 12px 20px;
              font-size: 0.9rem;
            }
          }

          @media (max-width: 480px) {
            .logo { font-size: 2.5rem; }
            .meme-title { font-size: 1.3rem; }
            .info-card { padding: 20px 15px; }
            .meme-image-container { padding: 10px; }
            .meme-stats { gap: 20px; }
            .stat-number { font-size: 1.3rem; }
            .mobile-action-btn { font-size: 0.8rem; padding: 12px 16px; }
            .copied-notification {
              top: 15px;
              right: 15px;
              padding: 10px 18px;
              font-size: 0.8rem;
            }
          }
        `}</style>
      </body>
    </html>
  )
}
