"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"

export default function RemixTreePage() {
  const params = useParams()
  const appId = params.appId as string
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })

  const [currentColumn, setCurrentColumn] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Mock tree data - in real app this would come from API
  const treeData = {
    original: {
      id: 1,
      image: "/wtaf-landing/images/alex-blog.png",
      alt: "Alex Blog",
      prompt: "wtaf -Alex- write a blog announcing the launch of one-shot vibe coding with WTAF",
      creator: "alex",
      remixes: 247,
      name: "alex-blog",
      createdAt: "2024-03-15",
    },
    tree: [
      // Direct remixes of original
      {
        id: 4,
        image: "/wtaf-landing/images/alex-blog.png",
        alt: "Alex Blog Variant",
        prompt: "wtaf -Alex- create a minimalist blog with dark mode for announcing product launches",
        creator: "sarah",
        remixes: 134,
        name: "alex-blog-variant",
        createdAt: "2024-03-16",
        parentId: 1,
        level: 1,
        children: [
          // Remixes of the variant
          {
            id: 11,
            image: "/wtaf-landing/images/alex-blog.png",
            alt: "Dark Blog Pro",
            prompt: "wtaf -Alex- enhance the dark blog with animations and better typography",
            creator: "mike",
            remixes: 45,
            name: "dark-blog-pro",
            createdAt: "2024-03-17",
            parentId: 4,
            level: 2,
          },
          {
            id: 12,
            image: "/wtaf-landing/images/alex-blog.png",
            alt: "Minimal Launch Blog",
            prompt: "wtaf -Alex- make the minimal blog even cleaner with just essential elements",
            creator: "zen",
            remixes: 23,
            name: "minimal-launch-blog",
            createdAt: "2024-03-18",
            parentId: 4,
            level: 2,
          },
        ],
      },
      {
        id: 7,
        image: "/wtaf-landing/images/alex-blog.png",
        alt: "Personal Blog",
        prompt: "wtaf -Alex- design a personal blog with cyberpunk vibes and glitch effects",
        creator: "neon",
        remixes: 76,
        name: "personal-blog",
        createdAt: "2024-03-17",
        parentId: 1,
        level: 1,
        children: [
          {
            id: 13,
            image: "/wtaf-landing/images/alex-blog.png",
            alt: "Cyber Glitch Blog",
            prompt: "wtaf -Alex- amplify the cyberpunk blog with more neon and matrix effects",
            creator: "matrix",
            remixes: 67,
            name: "cyber-glitch-blog",
            createdAt: "2024-03-19",
            parentId: 7,
            level: 2,
            children: [
              {
                id: 14,
                image: "/wtaf-landing/images/alex-blog.png",
                alt: "Neo Matrix Blog",
                prompt: "wtaf -Alex- create the ultimate matrix-style blog with falling code background",
                creator: "neo",
                remixes: 89,
                name: "neo-matrix-blog",
                createdAt: "2024-03-20",
                parentId: 13,
                level: 3,
              },
            ],
          },
        ],
      },
      {
        id: 10,
        image: "/wtaf-landing/images/alex-blog.png",
        alt: "Content Platform",
        prompt: "wtaf -Alex- create a content platform for tech announcements with social features",
        creator: "echo",
        remixes: 43,
        name: "content-platform",
        createdAt: "2024-03-18",
        parentId: 1,
        level: 1,
      },
    ],
  }

  // Organize data into columns for mobile
  const getColumnsData = () => {
    const columns = []

    // Column 0: Original
    columns[0] = [treeData.original]

    // Column 1: Direct remixes
    columns[1] = treeData.tree

    // Column 2: Second level remixes
    columns[2] = []
    treeData.tree.forEach((remix) => {
      if (remix.children) {
        columns[2].push(...remix.children)
      }
    })

    // Column 3: Third level remixes
    columns[3] = []
    treeData.tree.forEach((remix) => {
      if (remix.children) {
        remix.children.forEach((child) => {
          if (child.children) {
            columns[3].push(...child.children)
          }
        })
      }
    })

    return columns.filter((col) => col.length > 0)
  }

  const columnsData = getColumnsData()
  const maxColumns = columnsData.length

  const handleSwipeStart = (e) => {
    if (isTransitioning) return
    const touch = e.touches ? e.touches[0] : e
    startXRef.current = touch.clientX
    currentXRef.current = touch.clientX
  }

  const handleSwipeMove = (e) => {
    if (isTransitioning) return
    const touch = e.touches ? e.touches[0] : e
    currentXRef.current = touch.clientX
  }

  const handleSwipeEnd = () => {
    if (isTransitioning) return
    const deltaX = currentXRef.current - startXRef.current
    const threshold = 50

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentColumn > 0) {
        // Swipe right - go back
        navigateToColumn(currentColumn - 1)
      } else if (deltaX < 0 && currentColumn < maxColumns - 1) {
        // Swipe left - go forward
        navigateToColumn(currentColumn + 1)
      }
    }
  }

  const navigateToColumn = (newColumn) => {
    if (newColumn === currentColumn || isTransitioning) return
    setIsTransitioning(true)
    setCurrentColumn(newColumn)
    setTimeout(() => setIsTransitioning(false), 300)
  }

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

  const handlePromptClick = async (prompt) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification("Prompt copied!")
    }
  }

  const handleRemixClick = async (app) => {
    const appUrl = `${window.location.origin}/app/${app.name}-${app.id}`
    const success = await copyToClipboard(appUrl)
    if (success) {
      showCopiedNotification("App URL copied!")
    }
  }

  const renderTreeNode = (node, isOriginal = false) => (
    <div key={node.id} className={`tree-node ${isOriginal ? "original-node" : ""}`}>
      <div className="node-card">
        {isOriginal && <div className="original-badge">ORIGINAL</div>}
        <div className="node-image-container">
          <img src={node.image || "/placeholder.svg"} alt={node.alt} className="node-image" />
          <div className="node-overlay">
            <button className="try-app-btn">TRY APP</button>
          </div>
        </div>
        <div className="node-content">
          <div className="node-meta">
            <div className="creator-info">
              <span className="creator-label">by</span>
              <a href={`/user/${node.creator}`} className="creator-handle">
                @{node.creator}
              </a>
            </div>
            <div className="remix-count">
              <span className="remix-number">{node.remixes}</span>
              <span className="remix-label">remixes</span>
            </div>
          </div>
          <div className="node-prompt" onClick={() => handlePromptClick(node.prompt)}>
            "{node.prompt}"
          </div>
          <div className="node-actions">
            <button className="remix-btn" onClick={() => handleRemixClick(node)}>
              REMIX
            </button>
            <span className="created-date">{node.createdAt}</span>
          </div>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="children-container">
          <div className="connection-line"></div>
          <div className="children-grid">
            {node.children.map((child) => (
              <div key={child.id} className="child-branch">
                <div className="branch-line"></div>
                {renderTreeNode(child)}
                {child.children && child.children.length > 0 && (
                  <div className="grandchildren-container">
                    <div className="grandchild-connection"></div>
                    <div className="grandchildren-grid">
                      {child.children.map((grandchild) => (
                        <div key={grandchild.id} className="grandchild-branch">
                          <div className="grandchild-line"></div>
                          {renderTreeNode(grandchild)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const getColumnTitle = (index) => {
    if (index === 0) return "Origin"
    return `Gen ${index}`
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Remix Tree - WTAF.me</title>
        <meta
          name="description"
          content="Explore the remix genealogy tree and see how creativity evolves through chaos."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
          <div className="logo glitch" data-text="REMIX TREE">
            REMIX TREE
          </div>
          <div className="tagline">GENEALOGY OF DIGITAL CHAOS</div>
          <nav className="nav-back">
            <a href="/trending" className="back-link">
              ← Back to Trending
            </a>
          </nav>
        </header>

        <main>
          <section className="tree-hero">
            <div className="hero-content">
              <h1 className="glitch" data-text="Evolution Through Remixing">
                Evolution Through Remixing
              </h1>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="stat-number">247</div>
                  <div className="stat-label">Total Remixes</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">4</div>
                  <div className="stat-label">Generations</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">12</div>
                  <div className="stat-label">Creators</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">6</div>
                  <div className="stat-label">Days Active</div>
                </div>
              </div>
            </div>
          </section>

          <section className="remix-tree">
            {isMobile ? (
              // Mobile horizontal scroll view
              <div className="mobile-tree-container">
                {/* Horizontal Progress Trail */}
                <div className="progress-trail">
                  <div className="trail-line">
                    <div
                      className="trail-progress"
                      style={{ width: `${((currentColumn + 1) / maxColumns) * 100}%` }}
                    ></div>
                  </div>
                  <div className="trail-markers">
                    {Array.from({ length: maxColumns }, (_, i) => (
                      <button
                        key={i}
                        className={`trail-marker ${currentColumn === i ? "active" : ""} ${i < currentColumn ? "completed" : ""}`}
                        onClick={() => navigateToColumn(i)}
                      >
                        <span className="marker-label">{getColumnTitle(i)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swipeable Content */}
                <div
                  className="swipe-container"
                  ref={containerRef}
                  onTouchStart={handleSwipeStart}
                  onTouchMove={handleSwipeMove}
                  onTouchEnd={handleSwipeEnd}
                  onMouseDown={handleSwipeStart}
                  onMouseMove={handleSwipeMove}
                  onMouseUp={handleSwipeEnd}
                >
                  <div
                    className="columns-wrapper"
                    style={{
                      transform: `translateX(-${currentColumn * 100}%)`,
                      transition: isTransitioning ? "transform 0.3s ease-out" : "none",
                    }}
                  >
                    {columnsData.map((columnData, index) => (
                      <div key={index} className="mobile-column">
                        <div className="column-content">
                          {columnData.map((node) => (
                            <div key={node.id} className="mobile-node">
                              {renderTreeNode(node, index === 0)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Swipe Hints */}
                <div className="swipe-hints">
                  {currentColumn > 0 && (
                    <div className="swipe-hint left">
                      <span className="hint-arrow">←</span>
                      <span className="hint-text">Swipe to go back</span>
                    </div>
                  )}
                  {currentColumn < maxColumns - 1 && (
                    <div className="swipe-hint right">
                      <span className="hint-text">Swipe to explore</span>
                      <span className="hint-arrow">→</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Desktop tree view (existing code)
              <>
                <div className="tree-root">{renderTreeNode(treeData.original, true)}</div>
                <div className="direct-remixes">
                  <div className="main-connection-line"></div>
                  <div className="remixes-grid">
                    {treeData.tree.map((remix) => (
                      <div key={remix.id} className="remix-branch">
                        <div className="remix-connection-line"></div>
                        {renderTreeNode(remix)}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </main>

        <style jsx global>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            background: linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #533a7d 75%, #1a0a2e 100%);
            background-size: 400% 400%;
            animation: gradientShift 20s ease infinite;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            min-height: 100vh;
            color: #ffffff;
          }

          .copied-notification {
            position: fixed;
            top: 30px;
            right: 30px;
            background: linear-gradient(45deg, #9d4edd, #7209b7);
            color: #ffffff;
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
              0 8px 25px rgba(157, 78, 221, 0.3),
              0 0 20px rgba(157, 78, 221, 0.2);
            animation: slideInFade 2s ease-out;
            text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
          }

          .copied-checkmark {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            width: 25px;
            height: 25px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
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
            animation: float 10s ease-in-out infinite;
            pointer-events: none;
            filter: drop-shadow(0 0 10px rgba(157, 78, 221, 0.3));
          }

          .skull {
            top: 8%;
            left: 5%;
            font-size: 3.5rem;
            color: rgba(157, 78, 221, 0.3);
            animation-delay: 0s;
          }

          .lightning {
            top: 30%;
            right: 8%;
            font-size: 4rem;
            color: rgba(114, 9, 183, 0.4);
            animation-delay: 4s;
          }

          .fire {
            bottom: 25%;
            left: 12%;
            font-size: 3.8rem;
            color: rgba(168, 85, 247, 0.4);
            animation-delay: 8s;
          }

          .chains {
            bottom: 10%;
            right: 15%;
            font-size: 3.2rem;
            color: rgba(196, 125, 255, 0.3);
            animation-delay: 3s;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-40px) rotate(15deg); }
            66% { transform: translateY(30px) rotate(-10deg); }
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
            color: #9d4edd;
            z-index: -1;
          }

          .glitch::after {
            animation: glitch2 2s infinite;
            color: #7209b7;
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
            font-size: 3.5rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow:
              0 0 10px #9d4edd,
              0 0 20px #9d4edd,
              0 0 30px #9d4edd;
            margin-bottom: 15px;
            letter-spacing: -2px;
          }

          .tagline {
            font-size: 1rem;
            color: #9d4edd;
            font-weight: 500;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-bottom: 30px;
            text-shadow: 0 0 5px #9d4edd;
          }

          .nav-back {
            margin-top: 20px;
          }

          .back-link {
            color: #7209b7;
            text-decoration: none;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 1.1rem;
            text-shadow: 0 0 8px rgba(114, 9, 183, 0.5);
            transition: all 0.3s ease;
          }

          .back-link:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(114, 9, 183, 0.8);
          }

          main {
            max-width: 1600px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 5;
          }

          .tree-hero {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 20px;
          }

          .hero-content {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(157, 78, 221, 0.3);
            border-radius: 25px;
            padding: 30px 25px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(157, 78, 221, 0.1);
            max-width: 400px;
            margin: 0 auto;
          }

          .tree-hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.2rem;
            color: #ffffff;
            margin-bottom: 25px;
            font-weight: 700;
            line-height: 1.1;
            text-shadow: 0 0 15px #7209b7;
          }

          .hero-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .hero-stat {
            text-align: center;
          }

          .hero-stat .stat-number {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.8rem;
            font-weight: 900;
            color: #9d4edd;
            text-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
            margin-bottom: 5px;
          }

          .hero-stat .stat-label {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .mobile-tree-container {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            position: relative;
          }

          .progress-trail {
            margin-bottom: 40px;
            position: relative;
          }

          .trail-line {
            height: 4px;
            background: rgba(157, 78, 221, 0.2);
            border-radius: 2px;
            position: relative;
            margin-bottom: 20px;
          }

          .trail-progress {
            height: 100%;
            background: linear-gradient(90deg, #9d4edd, #7209b7);
            border-radius: 2px;
            transition: width 0.3s ease-out;
            box-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
          }

          .trail-markers {
            display: flex;
            justify-content: space-between;
            position: relative;
          }

          .trail-marker {
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid rgba(157, 78, 221, 0.3);
            border-radius: 20px;
            padding: 8px 16px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 600;
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            position: relative;
          }

          .trail-marker.active {
            background: linear-gradient(45deg, #9d4edd, #7209b7);
            border-color: #9d4edd;
            color: #ffffff;
            transform: scale(1.1);
            box-shadow: 0 0 20px rgba(157, 78, 221, 0.6);
          }

          .trail-marker.completed {
            border-color: rgba(157, 78, 221, 0.6);
            color: rgba(255, 255, 255, 0.9);
          }

          .trail-marker:hover:not(.active) {
            border-color: rgba(157, 78, 221, 0.5);
            transform: scale(1.05);
          }

          .marker-label {
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .swipe-container {
            width: 100%;
            overflow: hidden;
            position: relative;
            touch-action: pan-y;
            cursor: grab;
          }

          .swipe-container:active {
            cursor: grabbing;
          }

          .columns-wrapper {
            display: flex;
            width: ${maxColumns * 100}%;
          }

          .mobile-column {
            width: ${100 / maxColumns}%;
            flex-shrink: 0;
            padding: 0 10px;
          }

          .column-content {
            display: flex;
            flex-direction: column;
            gap: 30px;
            align-items: center;
          }

          .mobile-node {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .swipe-hints {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            padding: 0 20px;
          }

          .swipe-hint {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.6);
            animation: pulseHint 2s ease-in-out infinite;
          }

          .swipe-hint.left {
            flex-direction: row;
          }

          .swipe-hint.right {
            flex-direction: row-reverse;
          }

          .hint-arrow {
            font-size: 1.2rem;
            color: #9d4edd;
            text-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
          }

          .hint-text {
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          @keyframes pulseHint {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }

          /* Hide desktop tree elements on mobile */
          @media (max-width: 768px) {
            .tree-root,
            .direct-remixes {
              display: none;
            }
          }

          /* Hide mobile elements on desktop */
          @media (min-width: 769px) {
            .mobile-tree-container {
              display: none;
            }
          }

          /* Adjust mobile node cards */
          @media (max-width: 768px) {
            .mobile-node .node-card {
              width: 100%;
              max-width: 350px;
            }
          }

          @media (max-width: 480px) {
            .mobile-tree-container {
              max-width: 320px;
            }
            
            .trail-marker {
              padding: 6px 12px;
              font-size: 0.7rem;
            }
            
            .swipe-hints {
              padding: 0 10px;
            }
            
            .swipe-hint {
              font-size: 0.8rem;
            }
            
            .mobile-node .node-card {
              width: 100%;
              max-width: 300px;
              padding: 20px;
            }
            
            .mobile-node .node-image {
              height: 150px;
            }
          }

          .remix-tree {
            margin-bottom: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .tree-root {
            margin-bottom: 60px;
          }

          .tree-node {
            position: relative;
            margin-bottom: 40px;
          }

          .original-node .node-card {
            border: 3px solid #9d4edd;
            box-shadow: 
              0 0 30px rgba(157, 78, 221, 0.4),
              inset 0 0 20px rgba(157, 78, 221, 0.1);
            transform: scale(1.1);
          }

          .original-badge {
            position: absolute;
            top: -15px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #9d4edd, #7209b7);
            color: #ffffff;
            padding: 8px 20px;
            border-radius: 20px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            z-index: 10;
            box-shadow: 0 4px 15px rgba(157, 78, 221, 0.3);
          }

          .node-card {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 25px;
            width: 350px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          }

          .node-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #9d4edd, #7209b7, #a855f7, #9d4edd);
            background-size: 200% 100%;
            animation: borderGlow 4s linear infinite;
          }

          @keyframes borderGlow {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }

          .node-card:hover {
            transform: translateY(-5px);
            box-shadow: 
              0 15px 40px rgba(0, 0, 0, 0.4),
              0 0 25px rgba(157, 78, 221, 0.2);
            border-color: rgba(157, 78, 221, 0.3);
          }

          .node-image-container {
            position: relative;
            margin-bottom: 20px;
            overflow: hidden;
            border-radius: 12px;
          }

          .node-image {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border-radius: 12px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
          }

          .node-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
            border-radius: 12px;
          }

          .node-image-container:hover .node-overlay {
            opacity: 1;
          }

          .node-image-container:hover .node-image {
            transform: scale(1.05);
          }

          .try-app-btn {
            padding: 12px 25px;
            background: linear-gradient(45deg, #9d4edd, #7209b7);
            color: #ffffff;
            border: none;
            border-radius: 25px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .try-app-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(157, 78, 221, 0.4);
          }

          .node-content {
            text-align: center;
          }

          .node-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            font-size: 0.9rem;
          }

          .creator-info {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .creator-label {
            color: rgba(255, 255, 255, 0.6);
            font-weight: 500;
          }

          .creator-handle {
            color: #9d4edd;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            text-decoration: none;
            text-shadow: 0 0 8px rgba(157, 78, 221, 0.5);
            transition: all 0.3s ease;
          }

          .creator-handle:hover {
            color: #ffffff;
            text-shadow: 0 0 15px rgba(157, 78, 221, 0.8);
          }

          .remix-count {
            display: flex;
            align-items: baseline;
            gap: 4px;
          }

          .remix-number {
            color: #a855f7;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            text-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
          }

          .remix-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
          }

          .node-prompt {
            color: #7209b7;
            font-family: 'Space Grotesk', monospace;
            font-size: 0.95rem;
            font-weight: 500;
            background: rgba(114, 9, 183, 0.1);
            border: 2px solid rgba(114, 9, 183, 0.3);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            text-shadow: 0 0 8px rgba(114, 9, 183, 0.5);
            backdrop-filter: blur(5px);
            font-style: italic;
            line-height: 1.4;
            cursor: pointer;
            transition: all 0.3s ease;
            user-select: none;
          }

          .node-prompt:hover {
            background: rgba(114, 9, 183, 0.15);
            border-color: rgba(114, 9, 183, 0.5);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(114, 9, 183, 0.2);
          }

          .node-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .remix-btn {
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #7209b7;
            color: #7209b7;
            border-radius: 25px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .remix-btn:hover {
            background: rgba(114, 9, 183, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(114, 9, 183, 0.3);
          }

          .created-date {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.5);
            font-family: 'Space Grotesk', sans-serif;
          }

          .main-connection-line {
            width: 3px;
            height: 40px;
            background: linear-gradient(to bottom, #9d4edd, #7209b7);
            margin: 0 auto 30px;
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
          }

          .direct-remixes {
            width: 100%;
          }

          .remixes-grid {
            display: flex;
            justify-content: center;
            gap: 60px;
            flex-wrap: wrap;
          }

          .remix-branch {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .remix-connection-line {
            width: 3px;
            height: 30px;
            background: linear-gradient(to bottom, #7209b7, #a855f7);
            margin-bottom: 20px;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(114, 9, 183, 0.4);
          }

          .children-container {
            margin-top: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .connection-line {
            width: 3px;
            height: 30px;
            background: linear-gradient(to bottom, #a855f7, #c084fc);
            margin-bottom: 20px;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
          }

          .children-grid {
            display: flex;
            gap: 40px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .child-branch {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .branch-line {
            width: 3px;
            height: 25px;
            background: linear-gradient(to bottom, #c084fc, #ddd6fe);
            margin-bottom: 15px;
            border-radius: 2px;
            box-shadow: 0 0 6px rgba(192, 132, 252, 0.4);
          }

          .grandchildren-container {
            margin-top: 30px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .grandchild-connection {
            width: 2px;
            height: 25px;
            background: linear-gradient(to bottom, #ddd6fe, #e9d5ff);
            margin-bottom: 15px;
            border-radius: 1px;
            box-shadow: 0 0 4px rgba(221, 214, 254, 0.4);
          }

          .grandchildren-grid {
            display: flex;
            gap: 30px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .grandchild-branch {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .grandchild-line {
            width: 2px;
            height: 20px;
            background: linear-gradient(to bottom, #e9d5ff, #f3e8ff);
            margin-bottom: 10px;
            border-radius: 1px;
            box-shadow: 0 0 3px rgba(233, 213, 255, 0.4);
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
            background: #a855f7;
            border-radius: 50%;
            opacity: 0;
            animation: spark 4.5s infinite ease-out;
            box-shadow: 0 0 6px #a855f7;
          }

          .spark:nth-child(1) {
            top: 25%;
            left: 20%;
            animation-delay: 0s;
          }

          .spark:nth-child(2) {
            top: 70%;
            left: 80%;
            animation-delay: 1.8s;
          }

          .spark:nth-child(3) {
            top: 50%;
            left: 10%;
            animation-delay: 3.6s;
          }

          .spark:nth-child(4) {
            top: 30%;
            left: 90%;
            animation-delay: 2.7s;
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

          @media (max-width: 1200px) {
            .remixes-grid {
              gap: 40px;
            }
            .children-grid {
              gap: 30px;
            }
          }

          @media (max-width: 768px) {
            .logo { font-size: 2.5rem; }
            .tree-hero h1 { font-size: 2.5rem; }
            .hero-content { padding: 40px 25px; }
            .copied-notification {
              top: 20px;
              right: 20px;
              padding: 12px 20px;
              font-size: 0.9rem;
            }
          }

          @media (max-width: 480px) {
            .logo { font-size: 2rem; }
            .tree-hero h1 { font-size: 2rem; }
            .hero-content { padding: 30px 20px; }
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
