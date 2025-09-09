'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const Tree = dynamic(() => import('react-d3-tree'), { ssr: false });

type RemixNode = {
  name: string;
  attributes: {
    creator: string;
    title: string;
  };
  children?: RemixNode[];
};

export default function RemixTreePage() {
  const [data, setData] = useState<RemixNode | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    async function fetchTree() {
      try {
        const response = await fetch(`/api/remix-tree/${id}`);
        const flatRemixes = await response.json();
        
        if (response.ok) {
          const tree = buildTree(flatRemixes || [], id as string);
          setData(tree);
        } else {
          console.error('Failed to fetch remix tree:', flatRemixes);
        }
      } catch (error) {
        console.error('Error fetching remix tree:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTree();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading remix tree...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen text-white remix-tree-background">
      {/* Floating punk elements */}
      <div className="float-element skull">💀</div>
      <div className="float-element lightning">⚡</div>
      <div className="float-element fire">🔥</div>
      <div className="float-element chains">⛓️</div>
      
      {/* Header */}
      <header>
        <div className="logo glitch" data-text="REMIX TREE">
          REMIX TREE
        </div>
        <div className="tagline">GENEALOGY OF DIGITAL CHAOS</div>
        <nav className="nav-back">
          <a href={`/wtaf/${data ? data.attributes?.creator : 'unknown'}/${data ? data.name : 'unknown'}`} className="back-link">
            ← Back to App
          </a>
        </nav>
      </header>

      {/* Hero Section */}
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
          </div>
        </section>

        {/* Tree Container */}
        {data && (
        <section className="remix-tree">
          <div className="tree-container">
          <Tree 
            data={data}
            orientation="horizontal"
            pathFunc="step"
            zoomable
            translate={{ x: 400, y: 300 }}
            nodeSize={{ x: 500, y: 350 }}
            separation={{ siblings: 1.5, nonSiblings: 2.2 }}
            renderCustomNodeElement={({ nodeDatum, toggleNode }) => (
              <g data-custom="true">
                {/* Main card background */}
                <rect
                  width="420"
                  height="300"
                  x="-210"
                  y="-150"
                  fill="rgba(0, 0, 0, 0.95)"
                  stroke="#9d4edd"
                  strokeWidth="3"
                  rx="20"
                />
                
                {/* Top gradient border */}
                <rect
                  width="420"
                  height="8"
                  x="-210"
                  y="-150"
                  fill="url(#borderGradient)"
                  rx="20"
                />
                
                {/* App image placeholder */}
                <rect
                  width="380"
                  height="140"
                  x="-190"
                  y="-135"
                  fill="rgba(0, 0, 0, 0.4)"
                  stroke="rgba(157, 78, 221, 0.6)"
                  strokeWidth="2"
                  rx="12"
                />
                
                {/* App image */}
                <image
                  href={`https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/og-images/${nodeDatum.attributes?.creator}-${nodeDatum.name}.png`}
                  x="-190"
                  y="-135"
                  width="380"
                  height="140"
                  style={{ borderRadius: '12px' }}
                  onError={(e) => {
                    // Fallback to placeholder on error
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Semi-transparent overlay for text readability */}
                <rect
                  width="420"
                  height="160"
                  x="-210"
                  y="10"
                  fill="rgba(0, 0, 0, 0.3)"
                  rx="0"
                />
                
                {/* App title */}
                <text
                  x="0"
                  y="35"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="26"
                  fontWeight="500"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {nodeDatum.name}
                </text>
                
                {/* Creator info */}
                <text
                  x="-180"
                  y="65"
                  textAnchor="start"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="400"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  by @{nodeDatum.attributes?.creator || 'unknown'}
                </text>
                
                {/* Remix count */}
                <text
                  x="180"
                  y="65"
                  textAnchor="end"
                  fill="#ffffff"
                  fontSize="20"
                  fontWeight="400"
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {nodeDatum.children?.length || 0} remixes
                </text>
                
                {/* Action buttons area - much more prominent */}
                <rect
                  width="140"
                  height="50"
                  x="-70"
                  y="85"
                  fill="rgba(157, 78, 221, 0.9)"
                  stroke="#ffffff"
                  strokeWidth="3"
                  rx="25"
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.open(`/wtaf/${nodeDatum.attributes?.creator}/${nodeDatum.name}`, '_blank')}
                />
                
                {/* Dark background for better text contrast */}
                <rect
                  width="130"
                  height="40"
                  x="-65"
                  y="90"
                  fill="rgba(0, 0, 0, 0.3)"
                  rx="20"
                  style={{ cursor: 'pointer' }}
                  onClick={() => window.open(`/wtaf/${nodeDatum.attributes?.creator}/${nodeDatum.name}`, '_blank')}
                />
                
                <text
                  x="0"
                  y="118"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="18"
                  fontWeight="500"
                  fontFamily="Space Grotesk, sans-serif"
                  style={{ cursor: 'pointer', textTransform: 'uppercase' }}
                  onClick={() => window.open(`/wtaf/${nodeDatum.attributes?.creator}/${nodeDatum.name}`, '_blank')}
                >
                  TRY APP
                </text>
                
                {/* Expand/collapse button for children */}
                {nodeDatum.children && nodeDatum.children.length > 0 && (
                  <g>
                    <circle
                      cx="0"
                      cy="130"
                      r="16"
                      fill="#9d4edd"
                      stroke="#ffffff"
                      strokeWidth="3"
                      style={{ cursor: 'pointer' }}
                      onClick={toggleNode}
                    />
                    <text
                      x="0"
                      y="138"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="20"
                      fontWeight="bold"
                      style={{ cursor: 'pointer' }}
                      onClick={toggleNode}
                    >
                      {nodeDatum.__rd3t?.collapsed ? '+' : '−'}
                    </text>
                  </g>
                )}
                
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9d4edd" />
                    <stop offset="50%" stopColor="#7209b7" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </g>
            )}
          />
          </div>
        </section>
        )}
      </main>
      
      <style jsx global>{`
        .remix-tree-background {
          background: linear-gradient(135deg, #1a0a2e 0%, #16213e 25%, #0f3460 50%, #533a7d 75%, #1a0a2e 100%);
          background-size: 400% 400%;
          animation: gradientShift 20s ease infinite;
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          color: #ffffff;
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
          z-index: 1;
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
        
        .glitch-text {
          text-shadow: 
            0.05em 0 0 #00ffff,
            -0.05em -0.025em 0 #ff00ff,
            0.025em 0.05em 0 #ffff00;
          animation: glitch 1s linear infinite;
          position: relative;
          z-index: 10;
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
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
        }

        .remix-tree {
          margin-bottom: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tree-container {
          width: 100%;
          height: 80vh;
          border: 2px solid rgba(157, 78, 221, 0.3);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 5;
        }

        /* Force ALL text to be white with max specificity */
        .tree-container svg g text,
        .tree-container svg text,
        .tree-container text,
        svg g g text,
        g text {
          fill: #ffffff !important;
          font-weight: 500 !important;
          stroke: none !important;
        }
      `}</style>
    </div>
  );
}

// Converts flat list of remixes into a nested tree
function buildTree(flat: any[], rootId: string): RemixNode {
  const idMap = new Map();
  
  // Find root node by parent_id === null instead of matching rootId
  const root = flat.find(item => item.parent_id === null);
  if (!root) return { name: 'Not found', attributes: { creator: '', title: '' } };

  for (const node of flat) {
    idMap.set(node.id, {
      name: node.title,
      attributes: { creator: node.creator_handle, title: node.title },
      children: [],
    });
  }

  for (const node of flat) {
    if (node.parent_id && idMap.has(node.parent_id)) {
      idMap.get(node.parent_id).children.push(idMap.get(node.id));
    }
  }

  return idMap.get(root.id);
} 