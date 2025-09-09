"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import CopiedModal from "@/components/ui/copied-modal"

interface AppNode {
  id: string
  app_slug: string
  user_slug: string
  original_prompt: string
  created_at: string
  remix_count: number
  generation_level: number
  remix_prompt?: string
  parent_app_id?: string
  parent_app_slug?: string
  parent_user_slug?: string
  path?: string[]
  children?: AppNode[]
}

interface GenealogyData {
  parent_app: AppNode
  genealogy_tree: {
    generations: Record<number, AppNode[]>
    generation_count: number
    max_generation: number
    total_descendants: number
  }
  stats: {
    total_descendants: number
    max_generation: number
    direct_remixes: number
    most_recent_remix: string | null
    deepest_path: string[]
  }
}

export default function RemixTreePage() {
  const params = useParams()
  const user = params?.user_slug as string
  const app = params?.app_slug as string
  const [copiedNotification, setCopiedNotification] = useState({ show: false, text: "" })
  const [genealogyData, setGenealogyData] = useState<GenealogyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Mobile pagination state
  const [currentColumn, setCurrentColumn] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  useEffect(() => {
    // Set page title
    document.title = `Remix Tree - ${app} - WEBTOYS`
    
    const fetchGenealogyData = async () => {
      try {
        const response = await fetch(`/api/genealogy?user=${user}&app=${app}&format=tree`)
        if (!response.ok) {
          throw new Error('Failed to fetch genealogy data')
        }
        const data = await response.json()
        setGenealogyData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load genealogy data')
      } finally {
        setLoading(false)
      }
    }

    fetchGenealogyData()
  }, [user, app])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Organize data into branch-based columns for mobile
  const getColumnsData = () => {
    if (!genealogyData) return []
    
    const columns = []
    const generations = genealogyData.genealogy_tree.generations

    // Get all nodes first
    const allNodes: AppNode[] = []
    for (let gen = 1; gen <= genealogyData.genealogy_tree.max_generation; gen++) {
      if (generations[gen]) {
        allNodes.push(...generations[gen])
      }
    }

    // Column 0: Original at top + ALL its direct children below (Generation 1)
    const directChildren = generations[1] || []
    columns[0] = [genealogyData.parent_app, ...directChildren]

    // Create columns for each parent-child relationship
    const processedParents = new Set([genealogyData.parent_app.id])
    let columnIndex = 1

    // Sort direct children by creation date to process branches in order
    const sortedDirectChildren = [...directChildren].sort((a: AppNode, b: AppNode) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // For each direct child that became a parent, create a column
    for (const directChild of sortedDirectChildren) {
      const childrenOfThisNode = allNodes.filter((child: AppNode) => child.parent_app_id === directChild.id)
      
      if (childrenOfThisNode.length > 0) {
        columns[columnIndex] = [directChild, ...childrenOfThisNode]
        columnIndex++
      }
    }

    // Then process any remaining nodes that became parents
    for (const node of allNodes) {
      if (!processedParents.has(node.id) && !directChildren.includes(node)) {
        const childrenOfThisNode = allNodes.filter((child: AppNode) => child.parent_app_id === node.id)
        
        if (childrenOfThisNode.length > 0) {
          columns[columnIndex] = [node, ...childrenOfThisNode]
          columnIndex++
        }
      }
    }

    return columns.filter((col) => col && col.length > 0)
  }

  const columnsData = getColumnsData()
  const maxColumns = columnsData.length

  const handleSwipeStart = (e: any) => {
    if (isTransitioning) return
    const touch = e.touches ? e.touches[0] : e
    startXRef.current = touch.clientX
    currentXRef.current = touch.clientX
  }

  const handleSwipeMove = (e: any) => {
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

  const navigateToColumn = (newColumn: number) => {
    setIsTransitioning(true)
    setCurrentColumn(newColumn)
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const getColumnTitle = (index: number) => {
    if (index === 0) return "Origin"
    return `Branch ${index}`
  }

  const showCopiedNotification = (text: string) => {
    setCopiedNotification({ show: true, text })
    setTimeout(() => {
      setCopiedNotification({ show: false, text: "" })
    }, 3000)
  }

  const closeCopiedModal = () => {
    setCopiedNotification({ show: false, text: "" })
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error("Failed to copy text: ", err)
      return false
    }
  }

  const handlePromptClick = async (prompt: string) => {
    const success = await copyToClipboard(prompt)
    if (success) {
      showCopiedNotification(prompt)
    }
  }

  const handleRemixClick = async (appNode: AppNode) => {
    const remixCommand = `REMIX ${appNode.app_slug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification(remixCommand)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getLineageInfo = (node: AppNode) => {
    // Get glow class based on generation level - ALL items in each generation get the same glow
    let glowClass = ''
    if (node.generation_level === 0) {
      glowClass = 'glow-gen0' // Original app - special gold glow
    } else if (node.generation_level === 1) {
      glowClass = 'glow-gen1' // ALL 1st generation items - blue glow
    } else if (node.generation_level === 2) {
      glowClass = 'glow-gen2' // ALL 2nd generation items - green glow
    } else if (node.generation_level === 3) {
      glowClass = 'glow-gen3' // ALL 3rd generation items - red glow
    } else if (node.generation_level === 4) {
      glowClass = 'glow-gen4' // ALL 4th generation items - purple glow
    } else if (node.generation_level >= 5) {
      glowClass = 'glow-gen5' // 5th+ generation items - rainbow glow
    }
    
    return { glowClass }
  }

  const renderTreeNode = (node: AppNode, isOriginal = false) => {
    // For original apps, force generation level to 0 to get proper glow
    const nodeForGlow = isOriginal ? { ...node, generation_level: 0 } : node
    const lineageInfo = getLineageInfo(nodeForGlow)
    
    return (
      <div key={node.id} className={`tree-node ${isOriginal ? "original-node" : ""}`}>
        <div className={`node-card ${lineageInfo.glowClass}`}>
          {isOriginal && <div className="original-badge">ORIGINAL</div>}
          <div className="node-image-container">
            <img 
              src={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${node.user_slug}-${node.app_slug}.png`} 
              alt={node.app_slug} 
              className="node-image" 
            />
            <div className="node-overlay">
              <Link 
                href={`/${node.user_slug}/${node.app_slug}?demo=true`}
                className="try-app-btn"
              >
                🚀 Try This App
              </Link>
            </div>
          </div>
          <div className="node-content">
            <div className="node-meta">
              <div className="creator-info">
                <span className="creator-label">by</span>
                <Link href={`/wtaf/${node.user_slug}/creations`} className="creator-handle">
                  @{node.user_slug}
                </Link>
              </div>
              <div className="remix-count">
                <span className="remix-number">{node.remix_count || 0}</span>
                <span className="remix-label">remix{(node.remix_count || 0) === 1 ? '' : 'es'}</span>
              </div>
            </div>
            <div className="prompt-label">The Text Message:</div>
            <div className="node-prompt" onClick={() => handlePromptClick(node.remix_prompt || node.original_prompt)}>
              "{node.remix_prompt || node.original_prompt}"
            </div>
            <div className="node-actions">
              <button className="remix-btn" onClick={() => handleRemixClick(node)}>
                <span className="remix-icon">🎨</span>
                <span>Remix This</span>
              </button>
              <span className="created-date">{formatDate(node.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-icon">🌳</div>
          <h3 className="loading-title">Growing the family tree...</h3>
          <p className="loading-subtitle">Mapping the genealogy of digital creativity</p>
        </div>
      </div>
    )
  }

  if (error || !genealogyData) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">😅</div>
          <h3 className="error-title">Oops! Tree got a bit tangled</h3>
          <p className="error-subtitle">
            Our remix family tree is taking a break. Try refreshing the page!
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Copied Modal */}
      <CopiedModal 
        show={copiedNotification.show}
        text={copiedNotification.text}
        onClose={closeCopiedModal}
      />

      {/* Floating shapes */}
      <div className="floating-shape shape1"></div>
      <div className="floating-shape shape2"></div>
      <div className="floating-shape shape3"></div>
      <div className="floating-shape shape4"></div>
      <div className="floating-shape shape5"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <Link href="/" className="logo">WEBTOYS</Link>
          <div className="nav-links">
            <Link href={`/${user}/${app}`} className="back-link">
              ← Back to App
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Section */}
        <section className="tree-hero">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">🌳 Remix Family Tree</h1>
              <p className="hero-description">
                Witness how a single idea grows into an entire ecosystem of creativity. Each branch 
                represents a new interpretation, a fresh perspective, and the beautiful evolution of digital art.
              </p>
              <div className="stats-row">
                <div className="stat-item">
                  <div className="stat-number">{genealogyData.stats.total_descendants}</div>
                  <div className="stat-label">Total Remixes</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{genealogyData.stats.max_generation}</div>
                  <div className="stat-label">Generations Deep</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{genealogyData.stats.direct_remixes}</div>
                  <div className="stat-label">Direct Children</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{genealogyData.stats.deepest_path?.length || 0}</div>
                  <div className="stat-label">Deepest Branch</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tree Section */}
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
                        {columnData.map((node: AppNode) => (
                          <div key={node.id} className="mobile-node">
                            {renderTreeNode(node, node.id === genealogyData.parent_app.id)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Desktop tree view - use same branch structure as mobile
            <div className="desktop-branch-columns">
              {columnsData.map((columnData, index) => (
                <div key={index} className="desktop-column">
                  <div className="column-header">
                    <span className="column-title">{getColumnTitle(index)}</span>
                  </div>
                  <div className="column-nodes">
                    {columnData.map((node: AppNode) => (
                      <div key={node.id} className="desktop-node">
                        {renderTreeNode(node, node.id === genealogyData.parent_app.id)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Call to Action */}
        <section className="cta-section">
          <div className="cta-container">
            <h2 className="cta-title">Ready to Plant Your Own Tree?</h2>
            <p className="cta-description">
              Join the ecosystem of creators growing amazing ideas from simple text messages.
            </p>
            <a href="sms:+18663300015" className="cta-button">
              <span>📱</span>
              <span>Text (866) 330-0015 Now</span>
            </a>
          </div>
        </section>
      </main>

      <style jsx global>{`
        /* WEBTOYS GRAND Design System */
        :root {
          /* Core WEBTOYS DNA Colors */
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          --orange: #FF8C42;
          --orange-soft: #FFB380;
          
          /* Professional Additions */
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--cream);
          color: var(--charcoal);
          line-height: 1.6;
          overflow-x: hidden;
        }

        /* Floating shapes */
        .floating-shape {
          position: fixed;
          opacity: 0.15;
          animation: float-shape 25s infinite ease-in-out;
          pointer-events: none;
          z-index: 1;
        }
        
        .shape1 {
          width: 180px;
          height: 180px;
          background: var(--yellow);
          border-radius: 50%;
          top: 15%;
          left: 8%;
          animation-delay: 0s;
        }
        
        .shape2 {
          width: 120px;
          height: 120px;
          background: var(--blue);
          border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          top: 70%;
          right: 12%;
          animation-delay: 8s;
        }
        
        .shape3 {
          width: 90px;
          height: 90px;
          background: var(--red);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          bottom: 25%;
          left: 18%;
          animation-delay: 16s;
        }

        .shape4 {
          width: 140px;
          height: 140px;
          background: var(--purple-accent);
          border-radius: 20% 80% 20% 80% / 80% 20% 80% 20%;
          top: 40%;
          right: 5%;
          animation-delay: 12s;
        }

        .shape5 {
          width: 100px;
          height: 100px;
          background: var(--green-mint);
          border-radius: 50% 20% 50% 20%;
          top: 80%;
          left: 50%;
          animation-delay: 4s;
        }
        
        @keyframes float-shape {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(20px, -20px) rotate(90deg); }
          50% { transform: translate(-15px, 15px) rotate(180deg); }
          75% { transform: translate(25px, 8px) rotate(270deg); }
        }

        /* Loading and Error States */
        .loading-container, .error-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
        }

        .loading-content, .error-content {
          text-align: center;
          background: var(--white-pure);
          padding: 3rem;
          border-radius: 2rem;
          box-shadow: 0 10px 0 var(--green-sage), 0 20px 40px var(--purple-shadow);
          border: 4px solid var(--green-mint);
          max-width: 500px;
        }

        .loading-icon, .error-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: bounce 2s ease-in-out infinite;
        }

        .loading-title, .error-title {
          font-size: 1.8rem;
          color: var(--charcoal);
          margin-bottom: 1rem;
          font-weight: 800;
        }

        .loading-subtitle, .error-subtitle {
          color: var(--gray-warm);
          font-size: 1.1rem;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          width: 100%;
          background: var(--white-pure);
          border-bottom: 4px solid var(--green-mint);
          box-shadow: 0 4px 20px var(--purple-shadow);
          z-index: 1000;
          transition: all 0.3s ease;
        }
        
        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
        }
        
        .logo {
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--green-sage) 0%, var(--blue) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .logo::before {
          content: "🌳";
          font-size: 2rem;
          animation: spin 4s ease-in-out infinite;
        }
        
        @keyframes spin {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(15deg); }
        }

        .back-link {
          color: var(--blue-deep);
          text-decoration: none;
          font-weight: 600;
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          transition: all 0.3s ease;
        }

        .back-link:hover {
          background: var(--blue);
          color: white;
          transform: translateY(-2px);
        }

        /* Main Content */
        .main-content {
          margin-top: 80px;
        }

        /* Hero Section */
        .tree-hero {
          padding: 4rem 2rem;
          background: linear-gradient(135deg, var(--green-mint) 0%, var(--cream) 60%, rgba(182,255,179,0.1) 100%);
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero-content {
          text-align: center;
          background: var(--white-pure);
          border: 6px solid var(--green-mint);
          border-radius: 3rem;
          padding: 3rem 2rem;
          box-shadow: 0 12px 0 var(--green-sage), 0 24px 60px var(--purple-shadow);
          position: relative;
          z-index: 2;
        }

        .hero-title {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 900;
          color: var(--green-sage);
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: -2px;
          position: relative;
        }

        .hero-title::after {
          content: "🌿";
          position: absolute;
          top: -20px;
          right: -40px;
          font-size: 2rem;
          animation: sparkle 2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.5; transform: scale(1.2) rotate(180deg); }
        }

        .hero-description {
          font-size: 1.3rem;
          color: var(--gray-warm);
          margin-bottom: 2.5rem;
          font-weight: 500;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .stats-row {
          display: flex;
          justify-content: center;
          gap: 3rem;
          flex-wrap: wrap;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--red);
          display: block;
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* Tree Section */
        .remix-tree {
          padding: 4rem 2rem;
          background: var(--white-pure);
        }

        /* Node Styles */
        .tree-node {
          position: relative;
          margin-bottom: 2rem;
        }

        .original-node .node-card {
          border: 5px solid var(--yellow);
          box-shadow: 0 15px 0 var(--orange), 0 30px 80px var(--purple-shadow);
          transform: scale(1.05);
        }

        .original-badge {
          position: absolute;
          top: -15px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--yellow);
          color: var(--charcoal);
          padding: 8px 20px;
          border-radius: 2rem;
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          z-index: 10;
          box-shadow: 0 4px 0 var(--orange);
          border: 2px solid var(--orange);
        }

        .node-card {
          background: var(--cream);
          border: 4px solid var(--yellow);
          border-radius: 2rem;
          padding: 2rem;
          width: 350px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 8px 0 var(--purple-accent);
        }

        .node-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 13px 0 var(--purple-accent);
        }

        .glow-gen0 {
          border-color: var(--yellow) !important;
          box-shadow: 0 15px 0 var(--orange), 0 0 20px rgba(255, 215, 0, 0.3) !important;
        }

        .glow-gen1 {
          border-color: var(--blue) !important;
          box-shadow: 0 8px 0 var(--blue-deep), 0 0 15px rgba(110, 203, 255, 0.3) !important;
        }

        .glow-gen2 {
          border-color: var(--green-mint) !important;
          box-shadow: 0 8px 0 var(--green-sage), 0 0 15px rgba(182, 255, 179, 0.3) !important;
        }

        .glow-gen3 {
          border-color: var(--red) !important;
          box-shadow: 0 8px 0 var(--red-soft), 0 0 15px rgba(255, 75, 75, 0.3) !important;
        }

        .glow-gen4 {
          border-color: var(--purple-accent) !important;
          box-shadow: 0 8px 0 var(--purple-shadow), 0 0 15px rgba(139, 127, 212, 0.3) !important;
        }

        .glow-gen5 {
          border: 4px solid transparent !important;
          background: linear-gradient(var(--cream), var(--cream)) padding-box, 
                      linear-gradient(45deg, var(--yellow), var(--blue), var(--green-mint), var(--red), var(--purple-accent)) border-box !important;
          animation: rainbowGlow 3s linear infinite !important;
          box-shadow: 0 8px 0 var(--charcoal), 0 0 20px rgba(255, 255, 255, 0.5) !important;
        }

        @keyframes rainbowGlow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .node-image-container {
          position: relative;
          margin-bottom: 1.5rem;
          overflow: hidden;
          border-radius: 1.5rem;
          background: var(--white-pure);
        }

        .node-image {
          width: 100%;
          height: auto;
          aspect-ratio: 3 / 2;
          object-fit: cover;
          border-radius: 1.5rem;
          transition: all 0.3s ease;
          display: block;
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
          border-radius: 1.5rem;
        }

        .node-image-container:hover .node-overlay {
          opacity: 1;
        }

        .node-image-container:hover .node-image {
          transform: scale(1.05);
        }

        .try-app-btn {
          background: var(--blue);
          color: white;
          padding: 1rem 2rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 0 var(--blue-deep);
        }

        .try-app-btn:hover {
          background: var(--blue-deep);
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--blue);
        }

        .node-content {
          text-align: center;
        }

        .node-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .creator-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .creator-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          font-weight: 500;
        }

        .creator-handle {
          color: var(--red);
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .creator-handle:hover {
          color: var(--red-soft);
          transform: translateY(-1px);
        }

        .remix-count {
          display: flex;
          align-items: baseline;
          gap: 0.3rem;
          background: var(--purple-accent);
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .remix-number {
          font-weight: 700;
          font-size: 1rem;
        }

        .remix-label {
          font-size: 0.8rem;
          font-weight: 500;
        }

        .prompt-label {
          font-size: 0.9rem;
          color: var(--gray-warm);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 0.8rem;
          font-weight: 600;
        }

        .node-prompt {
          background: var(--white-pure);
          border: 3px solid var(--green-mint);
          border-radius: 1.5rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--charcoal);
          cursor: pointer;
          transition: all 0.3s ease;
          line-height: 1.4;
        }

        .node-prompt:hover {
          background: var(--green-mint);
          transform: translateY(-2px);
        }

        .node-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .remix-btn {
          background: var(--white-pure);
          border: 3px solid var(--purple-accent);
          color: var(--purple-accent);
          padding: 0.8rem 1.5rem;
          border-radius: 2rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .remix-btn:hover {
          background: var(--purple-accent);
          color: white;
          transform: translateY(-2px);
        }

        .remix-icon {
          font-size: 1.2rem;
        }

        .created-date {
          font-size: 0.8rem;
          color: var(--gray-warm);
          font-weight: 500;
        }

        /* Desktop Branch Columns */
        .desktop-branch-columns {
          display: flex;
          gap: 2rem;
          padding: 2rem;
          overflow-x: auto;
          min-height: 70vh;
        }

        .desktop-column {
          display: flex;
          flex-direction: column;
          min-width: 350px;
          flex-shrink: 0;
        }

        .column-header {
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .column-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--blue-deep);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0.8rem 1.5rem;
          background: var(--blue);
          color: white;
          border-radius: 2rem;
          box-shadow: 0 4px 0 var(--blue-deep);
        }

        .column-nodes {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: center;
        }

        .desktop-node {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* Mobile Pagination Styles */
        .mobile-tree-container {
          position: relative;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
        }

        @media (min-width: 769px) {
          .mobile-tree-container {
            display: none; /* Hide mobile view on desktop */
          }
        }

        .progress-trail {
          margin-bottom: 2rem;
          padding: 0 1rem;
        }

        .trail-line {
          position: relative;
          height: 6px;
          background: var(--cream);
          border-radius: 3px;
          margin-bottom: 1rem;
          overflow: hidden;
          border: 2px solid var(--yellow);
        }

        .trail-progress {
          height: 100%;
          background: var(--green-mint);
          border-radius: 3px;
          transition: width 0.3s ease;
          box-shadow: 0 0 10px rgba(182, 255, 179, 0.5);
        }

        .trail-markers {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .trail-marker {
          background: var(--white-pure);
          border: 3px solid var(--yellow);
          border-radius: 1.5rem;
          padding: 0.5rem 1rem;
          color: var(--charcoal);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 60px;
          text-align: center;
        }

        .trail-marker.active {
          background: var(--yellow);
          border-color: var(--orange);
          box-shadow: 0 4px 0 var(--orange);
        }

        .trail-marker.completed {
          background: var(--green-mint);
          border-color: var(--green-sage);
          color: var(--charcoal);
        }

        .marker-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .swipe-container {
          position: relative;
          width: 100%;
          height: 70vh;
          overflow: hidden;
          cursor: grab;
        }

        .swipe-container:active {
          cursor: grabbing;
        }

        .columns-wrapper {
          display: flex;
          width: 100%;
          height: 100%;
          will-change: transform;
        }

        .mobile-column {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
          overflow-y: auto;
        }

        .column-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem 0;
          min-height: 100%;
        }

        .mobile-node {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* Call to Action */
        .cta-section {
          padding: 5rem 2rem;
          background: var(--blue-deep);
          color: white;
          text-align: center;
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-title {
          font-size: 3rem;
          font-weight: 900;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .cta-description {
          font-size: 1.3rem;
          margin-bottom: 2.5rem;
          opacity: 0.9;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 1rem;
          background: var(--yellow);
          color: var(--charcoal);
          padding: 1.5rem 3rem;
          border-radius: 3rem;
          font-size: 1.3rem;
          font-weight: 800;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 0 var(--orange);
        }

        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 11px 0 var(--orange);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nav-container {
            padding: 1rem;
          }

          .hero-content {
            padding: 2rem 1.5rem;
          }

          .stats-row {
            gap: 2rem;
          }

          .stat-number {
            font-size: 2rem;
          }

          .desktop-branch-columns {
            display: none; /* Hide desktop view on mobile */
          }

          .node-card {
            width: 300px;
          }

          .cta-title {
            font-size: 2.2rem;
          }

          .tree-hero {
            padding: 2rem 1rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .node-card {
            width: 280px;
            padding: 1.5rem;
          }

          .cta-button {
            padding: 1.2rem 2rem;
            font-size: 1.1rem;
          }

          .hero-content {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </>
  )
}