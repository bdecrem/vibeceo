"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  const user = params.user_slug as string
  const app = params.app_slug as string
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
    }, 2000)
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
      showCopiedNotification("Prompt copied!")
    }
  }

  const handleRemixClick = async (appNode: AppNode) => {
    const remixCommand = `REMIX ${appNode.app_slug}`
    const success = await copyToClipboard(remixCommand)
    if (success) {
      showCopiedNotification("REMIX command copied!")
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
      glowClass = 'glow-gen1' // ALL 1st generation items - orange glow
    } else if (node.generation_level === 2) {
      glowClass = 'glow-gen2' // ALL 2nd generation items - cyan glow
    } else if (node.generation_level === 3) {
      glowClass = 'glow-gen3' // ALL 3rd generation items - deep pink glow
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
            <button 
              className="try-app-btn"
              onClick={() => window.open(`/wtaf/${node.user_slug}/${node.app_slug}`, '_blank')}
            >
              TRY APP
            </button>
          </div>
        </div>
        <div className="node-content">
          <div className="node-meta">
            <div className="creator-info">
              <span className="creator-label">by</span>
              <a href={`/${node.user_slug}`} className="creator-handle">
                @{node.user_slug}
              </a>
            </div>
            <div className="remix-count">
              <span className="remix-number">{node.remix_count || 0}</span>
              <span className="remix-label">remixes</span>
            </div>
          </div>
          <div className="node-prompt" onClick={() => handlePromptClick(node.remix_prompt || node.original_prompt)}>
            "{node.remix_prompt || node.original_prompt}"
          </div>
          <div className="node-actions">
            <button className="remix-btn" onClick={() => handleRemixClick(node)}>
              REMIX
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
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading genealogy tree...</div>
      </div>
    )
  }

  if (error || !genealogyData) {
    return (
      <div className="error-container">
        <div className="error-text">Failed to load genealogy tree</div>
        <div className="error-details">{error}</div>
      </div>
    )
  }

  const buildTreeStructure = () => {
    const generations = genealogyData.genealogy_tree.generations
    const firstGeneration = generations[1] || []
    
    // Build branch columns
    const columns = []
    
    // Column 1: All first generation remixes
    columns.push({
      id: 'generation-1',
      header: 'Generation 1',
      nodes: firstGeneration
    })
    
    // Create a column for each generation 2 item ONLY (each represents a new branch)
    const secondGeneration = generations[2] || []
    secondGeneration.forEach((branchStarter: AppNode) => {
      // This gen 2 item starts a new branch, find all its descendants
      const branchNodes: AppNode[] = [branchStarter]
      
      // Find all descendants of this branch starter (gen 3, 4, 5, etc.)
      Object.keys(generations).forEach(descendantGenNum => {
        const descendantGenLevel = parseInt(descendantGenNum)
        if (descendantGenLevel > 2) {
          generations[descendantGenLevel].forEach((descendant: AppNode) => {
            // Check if this descendant's path includes the branch starter
            if (descendant.path && descendant.path.includes(branchStarter.app_slug)) {
              branchNodes.push(descendant)
            }
          })
        }
      })
      
      columns.push({
        id: `branch-${branchStarter.app_slug}`,
        header: `Branch: ${branchStarter.app_slug}`,
        nodes: branchNodes
      })
    })
    
    return (
      <div className="generations-columns">
        {columns.map((column) => (
          <div key={column.id} className="generation-column">
            <div className="generation-header">
              {column.header}
              <span className="generation-count">({column.nodes.length})</span>
            </div>
            <div className="generation-nodes">
              {column.nodes.map((node: AppNode) => (
                <div key={node.id} className="column-node">
                  {renderTreeNode(node)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Remix Tree - ${genealogyData.parent_app.app_slug} by @${genealogyData.parent_app.user_slug}`}</title>
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
            <a href={`/wtaf/${user}/${app}`} className="back-link">
              ← Back to App
            </a>
          </nav>
        </header>

        <main>
          <section className="tree-hero">
            <div className="hero-content">
              <h1 className="glitch" data-text="Evolution Through Remixing">
                Evolution Through Remixing
              </h1>
              <p>
                Witness how a single prompt spawns an entire ecosystem of creativity. Each branch represents a new
                interpretation, a fresh perspective, a chaotic evolution of the original idea.
              </p>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="stat-number">{genealogyData.stats.total_descendants}</div>
                  <div className="stat-label">Total Remixes</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">{genealogyData.stats.max_generation}</div>
                  <div className="stat-label">Generations Deep</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">{genealogyData.stats.direct_remixes}</div>
                  <div className="stat-label">Direct Remixes</div>
                </div>
                <div className="hero-stat">
                  <div className="stat-number">{genealogyData.stats.deepest_path?.length || 0}</div>
                  <div className="stat-label">Deepest Path</div>
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

          .loading-container, .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
            padding: 20px;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(157, 78, 221, 0.3);
            border-top: 3px solid #9d4edd;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .loading-text, .error-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            color: #9d4edd;
            margin-bottom: 10px;
          }

          .error-details {
            color: rgba(255, 255, 255, 0.7);
            font-size: 1rem;
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
            margin-bottom: 80px;
            padding: 40px 20px;
          }

          .hero-content {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(157, 78, 221, 0.3);
            border-radius: 30px;
            padding: 50px 40px;
            box-shadow:
              0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(157, 78, 221, 0.1);
            max-width: 800px;
            margin: 0 auto;
          }

          .tree-hero h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 3.5rem;
            color: #ffffff;
            margin-bottom: 25px;
            font-weight: 700;
            line-height: 1.1;
            text-shadow: 0 0 15px #7209b7;
          }

          .tree-hero p {
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            font-weight: 300;
            margin-bottom: 30px;
          }

          .hero-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 25px;
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

          .lineage-emoji {
            position: absolute;
            top: 15px;
            right: 15px;
            font-size: 2rem;
            z-index: 15;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            animation: float 3s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }

          .glow-gen0 {
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.6) !important;
            border-color: rgba(255, 215, 0, 0.9) !important;
            background: linear-gradient(45deg, rgba(255, 215, 0, 0.1), rgba(255, 223, 0, 0.05)) !important;
          }

          .glow-gen1 {
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.4) !important;
            border-color: rgba(255, 165, 0, 0.8) !important;
          }

          .glow-gen2 {
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.4) !important;
            border-color: rgba(0, 255, 255, 0.8) !important;
          }

          .glow-gen3 {
            box-shadow: 0 0 20px rgba(255, 20, 147, 0.6), 0 0 40px rgba(255, 20, 147, 0.4) !important;
            border-color: rgba(255, 20, 147, 0.8) !important;
          }

          .glow-gen4 {
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.6), 0 0 40px rgba(124, 58, 237, 0.4) !important;
            border-color: rgba(124, 58, 237, 0.8) !important;
          }

          .glow-gen5 {
            box-shadow: 
              0 0 20px rgba(255, 0, 255, 0.4),
              0 0 30px rgba(0, 255, 255, 0.3),
              0 0 40px rgba(255, 255, 0, 0.2) !important;
            border-color: rgba(255, 0, 255, 0.8) !important;
            animation: rainbowGlow 3s linear infinite !important;
          }

          @keyframes rainbowGlow {
            0% { border-color: rgba(255, 0, 255, 0.8); }
            33% { border-color: rgba(0, 255, 255, 0.8); }
            66% { border-color: rgba(255, 255, 0, 0.8); }
            100% { border-color: rgba(255, 0, 255, 0.8); }
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
            font-weight: 500;
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
            color: #ffffff;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 400;
            text-decoration: none;
            transition: all 0.3s ease;
          }

          .creator-handle:hover {
            color: #ffffff;
          }

          .remix-count {
            display: flex;
            align-items: baseline;
            gap: 4px;
          }

          .remix-number {
            color: #ffffff;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 400;
          }

          .remix-label {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.8rem;
          }

          .node-prompt {
            color: #ffffff;
            font-family: 'Space Grotesk', monospace;
            font-size: 0.95rem;
            font-weight: 400;
            background: rgba(114, 9, 183, 0.1);
            border: 2px solid rgba(114, 9, 183, 0.3);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
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
            color: rgba(255, 255, 255, 0.9);
            border-radius: 25px;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 300;
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

          .generations-columns {
            display: flex;
            gap: 60px;
            align-items: flex-start;
            justify-content: center;
            width: 100%;
          }

          .generation-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 350px;
          }

          .generation-header {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.2rem;
            font-weight: 700;
            color: #9d4edd;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 30px;
            text-shadow: 0 0 10px rgba(157, 78, 221, 0.5);
            background: rgba(157, 78, 221, 0.1);
            padding: 10px 20px;
            border-radius: 20px;
            border: 2px solid rgba(157, 78, 221, 0.3);
            text-align: center;
          }

          .generation-count {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
            margin-left: 8px;
            text-transform: none;
            letter-spacing: 0;
          }

          .generation-nodes {
            display: flex;
            flex-direction: column;
            gap: 40px;
            align-items: center;
          }

          .column-node {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .remixes-grid {
            display: flex;
            justify-content: center;
            gap: 60px;
            flex-wrap: wrap;
          }

          .first-generation-grid {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            width: 100%;
          }

          .remix-branch {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 40px;
          }

          .remix-connection-line {
            width: 3px;
            height: 30px;
            background: linear-gradient(to bottom, #7209b7, #a855f7);
            margin-bottom: 20px;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(114, 9, 183, 0.4);
          }

          .branch-with-children {
            display: flex;
            align-items: flex-start;
            gap: 40px;
          }

          .children-horizontal {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .horizontal-connection-line {
            width: 40px;
            height: 3px;
            background: linear-gradient(to right, #7209b7, #a855f7);
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(114, 9, 183, 0.4);
          }

          .children-list {
            display: flex;
            flex-direction: column;
            gap: 30px;
          }

          .child-node {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .child-connection-line {
            width: 3px;
            height: 20px;
            background: linear-gradient(to bottom, #a855f7, #c084fc);
            margin-bottom: 15px;
            border-radius: 2px;
            box-shadow: 0 0 6px rgba(168, 85, 247, 0.4);
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
            .generations-columns {
              gap: 40px;
            }
            .generation-column {
              min-width: 320px;
            }
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
            .node-card { width: 300px; }
            .desktop-branch-columns {
              display: none; /* Hide desktop view on mobile */
            }
            .stats-container {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .copied-notification {
              top: 20px;
              right: 20px;
              padding: 12px 20px;
              font-size: 0.9rem;
            }
            
            /* Hide hero stats section on mobile */
            .tree-hero {
              display: none !important;
            }
            
            /* Make branch navigation sticky at top */
            .progress-trail {
              position: sticky !important;
              top: 0 !important;
              z-index: 1000 !important;
              background: transparent !important;
              backdrop-filter: none !important;
              padding: 15px 20px !important;
              border-bottom: none !important;
              box-shadow: none !important;
            }
            
            /* Stats moved to be part of column content */
            .stats-container {
              order: -1; /* Show stats at top of first column */
              margin-bottom: 20px;
              width: 100%;
              max-width: 350px;
            }
          }

          @media (max-width: 480px) {
            .logo { font-size: 2rem; }
            .tree-hero h1 { font-size: 2rem; }
            .hero-content { padding: 30px 20px; }
            .node-card { width: 280px; padding: 20px; }
            .node-image { height: 150px; }
            .stats-container {
              grid-template-columns: 1fr;
              gap: 15px;
            }
            .stat-number { font-size: 2rem; }
            .copied-notification {
              top: 15px;
              right: 15px;
              padding: 10px 18px;
              font-size: 0.8rem;
            }
          }

          /* Desktop Branch Columns */
          .desktop-branch-columns {
            display: flex;
            gap: 40px;
            padding: 40px 20px;
            overflow-x: auto;
            min-height: 70vh;
          }

          .desktop-column {
            display: flex;
            flex-direction: column;
            min-width: 320px;
            flex-shrink: 0;
          }

          .column-header {
            margin-bottom: 20px;
            text-align: center;
          }

          .column-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.2rem;
            font-weight: 600;
            color: rgba(157, 78, 221, 0.8);
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 8px 16px;
            background: rgba(157, 78, 221, 0.1);
            border: 1px solid rgba(157, 78, 221, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }

          .column-nodes {
            display: flex;
            flex-direction: column;
            gap: 20px;
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
            margin-bottom: 30px;
            padding: 0 20px;
          }

          .trail-line {
            position: relative;
            height: 4px;
            background: rgba(157, 78, 221, 0.2);
            border-radius: 2px;
            margin-bottom: 20px;
            overflow: hidden;
          }

          .trail-progress {
            height: 100%;
            background: linear-gradient(90deg, #9d4edd, #7209b7);
            border-radius: 2px;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(157, 78, 221, 0.3);
          }

          .trail-markers {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }

          .trail-marker {
            background: rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(157, 78, 221, 0.3);
            border-radius: 20px;
            padding: 8px 12px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            min-width: 60px;
            text-align: center;
          }

          .trail-marker.active {
            background: rgba(157, 78, 221, 0.8);
            border-color: rgba(157, 78, 221, 0.8);
            color: #ffffff;
            box-shadow: 0 4px 15px rgba(157, 78, 221, 0.3);
          }

          .trail-marker.completed {
            background: rgba(157, 78, 221, 0.4);
            border-color: rgba(157, 78, 221, 0.4);
            color: rgba(255, 255, 255, 0.9);
          }

          .marker-label {
            font-family: 'Space Grotesk', sans-serif;
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
            gap: 20px;
            padding: 20px 0;
            min-height: 100%;
          }

          .mobile-node {
            width: 100%;
            display: flex;
            justify-content: center;
          }
        `}</style>
      </body>
    </html>
  )
} 