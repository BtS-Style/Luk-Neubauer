import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Comment } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, GitCommit, Network, Radio, HelpCircle } from "lucide-react";

interface ConversationMapProps {
  comments: Comment[];
  postAuthorName: string;
  postAuthorPic?: string;
  postContent: string;
}

interface MapNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  pic?: string;
  content: string;
  timestamp: number;
  isRoot: boolean;
  color: string;
}

interface MapLink extends d3.SimulationLinkDatum<MapNode> {
  source: string | MapNode;
  target: string | MapNode;
}

export function ConversationMap({ comments, postAuthorName, postAuthorPic, postContent }: ConversationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 220 });
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [links, setLinks] = useState<MapLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

  // Monitor container width to keep SVG fluid and responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: 220
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute node structures and simulation
  useEffect(() => {
    const { width, height } = dimensions;

    // 1. Build Nodes list
    const rootNode: MapNode = {
      id: "root",
      label: postAuthorName,
      pic: postAuthorPic || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=100&h=100&fit=crop",
      content: postContent,
      timestamp: Date.now() - 86400000,
      isRoot: true,
      color: "#00f2fe", // Cyan for root post
      x: width / 2,
      y: height / 2
    };

    const participantColors = ["#df19ff", "#ff007f", "#9b51e0", "#a100ff", "#00f2fe", "#38bdf8"];

    const uniqueCommentsMap = new Map<string, Comment>();
    comments.forEach(c => {
      if (c && c.id !== undefined) {
        let cleanId = String(c.id);
        if (cleanId === "root") {
          cleanId = "comment_root";
        }
        uniqueCommentsMap.set(cleanId, c);
      }
    });
    const uniqueComments = Array.from(uniqueCommentsMap.values());

    const commentNodes: MapNode[] = uniqueComments.map((c, idx) => {
      // Deterministically select a neon accent color for this commenter
      const colorIndex = Math.abs(c.authorName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % participantColors.length;
      let cleanId = String(c.id);
      if (cleanId === "root") {
        cleanId = "comment_root";
      }
      return {
        id: cleanId,
        label: c.authorName,
        pic: c.authorPic,
        content: c.content,
        timestamp: c.timestamp,
        isRoot: false,
        color: participantColors[colorIndex],
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height / 2 + (Math.random() - 0.5) * 100
      };
    });

    const allNodes = [rootNode, ...commentNodes];

    // 2. Build Links list with semantic reply connections
    const allLinks: MapLink[] = [];

    commentNodes.forEach((node, idx) => {
      let targetId = "root"; // Default reply targets the original post

      // Semantic analysis: check if comment content references another participant's name
      const contentLower = node.content.toLowerCase();
      
      // Look for mentions (e.g. "@Jungkook" or "Jungkook:") or simply a participant's name
      let foundReplyTarget = false;
      for (let prevIdx = idx - 1; prevIdx >= 0; prevIdx--) {
        const prevNode = commentNodes[prevIdx];
        const prevNameLower = prevNode.label.toLowerCase();
        
        if (contentLower.includes(`@${prevNameLower}`) || contentLower.includes(prevNameLower)) {
          targetId = prevNode.id;
          foundReplyTarget = true;
          break;
        }
      }

      // If no name mention, establish a structured thread fallback to form branch hierarchies
      if (!foundReplyTarget) {
        if (idx === 0) {
          targetId = "root";
        } else {
          // Chain comments with a branching pattern: link to previous or standard parent to keep it looking like a conversation
          const branchingFactor = Math.abs(node.label.length % 3);
          if (branchingFactor === 1 && idx > 1) {
            targetId = commentNodes[idx - 2].id;
          } else if (branchingFactor === 2 && idx > 0) {
            targetId = commentNodes[idx - 1].id;
          } else {
            targetId = "root";
          }
        }
      }

      allLinks.push({
        source: node.id,
        target: targetId
      });
    });

    // 3. Configure D3 Force Simulation
    const simulation = d3.forceSimulation<MapNode>(allNodes)
      .force("link", d3.forceLink<MapNode, MapLink>(allLinks)
        .id(d => d.id)
        .distance(55)
      )
      .force("charge", d3.forceManyBody<MapNode>().strength(-140))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<MapNode>().radius(28))
      .alphaDecay(0.06);

    // Run simulation tick updates safely
    simulation.on("tick", () => {
      // Bounding box constraint to keep nodes nicely inside the canvas area
      allNodes.forEach(node => {
        const r = 20;
        node.x = Math.max(r + 10, Math.min(width - r - 10, node.x || width / 2));
        node.y = Math.max(r + 10, Math.min(height - r - 10, node.y || height / 2));
      });

      setNodes([...allNodes]);
      setLinks([...allLinks]);
    });

    // Set first comment as hovered initially for empty state visual polish
    if (commentNodes.length > 0) {
      setSelectedNode(commentNodes[commentNodes.length - 1]);
    }

    return () => {
      simulation.stop();
    };
  }, [comments, dimensions.width, dimensions.height, postAuthorName, postAuthorPic, postContent]);

  const activeNode = hoveredNode || selectedNode || nodes[0];

  return (
    <div className="bg-black/40 border border-white/5 rounded-3xl p-5 space-y-4 relative overflow-hidden shadow-inner mt-4">
      {/* Background Grid Pattern for high-tech HUD look */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />
      <div className="absolute -left-12 -top-12 w-24 h-24 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />
      <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full pointer-events-none" />

      {/* Header Info */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            CONVERSATION_NEURAL_MAP (D3_SYS_v2)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono">
          <Radio size={10} className="text-purple-400 animate-ping" />
          <span>ACTIVE_NODES: {nodes.length}</span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="w-full h-[220px] relative border border-white/5 rounded-2xl bg-black/60 overflow-hidden cursor-crosshair">
        <svg width="100%" height="100%">
          <defs>
            {/* Soft path gradient & glow */}
            <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Circular avatar clip paths */}
            {nodes.map(node => (
              <clipPath key={`clip-${node.id}`} id={`clip-pat-${node.id}`}>
                <circle cx={node.x} cy={node.y} r={14} />
              </clipPath>
            ))}
          </defs>

          {/* Draw Connection Links (Lines) */}
          <g>
            {links.map((link, idx) => {
              const sNode = link.source as MapNode;
              const tNode = link.target as MapNode;
              if (!sNode || !tNode || sNode.x === undefined || sNode.y === undefined || tNode.x === undefined || tNode.y === undefined) return null;

              const isLinkSelected = (selectedNode && (selectedNode.id === sNode.id || selectedNode.id === tNode.id)) ||
                                     (hoveredNode && (hoveredNode.id === sNode.id || hoveredNode.id === tNode.id));

              return (
                <g key={`link-${idx}`}>
                  {/* Outer glow line on hover/selection */}
                  {isLinkSelected && (
                    <line
                      x1={sNode.x}
                      y1={sNode.y}
                      x2={tNode.x}
                      y2={tNode.y}
                      stroke={sNode.color}
                      strokeWidth={4}
                      strokeOpacity={0.25}
                      filter="url(#map-glow)"
                    />
                  )}
                  {/* Primary Link Line */}
                  <line
                    x1={sNode.x}
                    y1={sNode.y}
                    x2={tNode.x}
                    y2={tNode.y}
                    stroke={isLinkSelected ? sNode.color : "rgba(255, 255, 255, 0.12)"}
                    strokeWidth={isLinkSelected ? 1.8 : 1}
                    strokeDasharray={sNode.isRoot ? "4 4" : "0"}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </g>

          {/* Draw Nodes (Commenters) */}
          <g>
            {nodes.map(node => {
              if (node.x === undefined || node.y === undefined) return null;
              const isHovered = hoveredNode?.id === node.id;
              const isSelected = selectedNode?.id === node.id;
              const isSpecial = isHovered || isSelected;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer select-none"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Outer glowing halo ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isRoot ? 20 : 16}
                    fill="transparent"
                    stroke={node.color}
                    strokeWidth={isSpecial ? 2.5 : 1}
                    strokeOpacity={isSpecial ? 0.9 : 0.3}
                    className="transition-all duration-300"
                    style={{ filter: isSpecial ? "url(#map-glow)" : "none" }}
                  />

                  {/* Node solid base */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.isRoot ? 17 : 14}
                    fill="#050507"
                  />

                  {/* Author picture/fallback */}
                  {node.pic ? (
                    <image
                      href={node.pic}
                      x={node.x - (node.isRoot ? 17 : 14)}
                      y={node.y - (node.isRoot ? 17 : 14)}
                      width={node.isRoot ? 34 : 28}
                      height={node.isRoot ? 34 : 28}
                      clipPath={`url(#clip-pat-${node.id})`}
                    />
                  ) : (
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill={node.color}
                      fontSize={node.isRoot ? "10" : "8"}
                      fontWeight="bold"
                    >
                      {node.label[0]}
                    </text>
                  )}

                  {/* Compact tooltip/label over nodes */}
                  {isSpecial && (
                    <g transform={`translate(${node.x}, ${node.y - (node.isRoot ? 26 : 22)})`}>
                      <rect
                        x="-50"
                        y="-14"
                        width="100"
                        height="18"
                        rx="4"
                        fill="#050507"
                        stroke={node.color}
                        strokeWidth="1"
                        opacity="0.9"
                      />
                      <text
                        x="0"
                        y="-2"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="8"
                        fontWeight="black"
                        className="truncate uppercase tracking-wider"
                      >
                        {node.label.slice(0, 15)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Active Node Detail HUD */}
      <AnimatePresence mode="wait">
        {activeNode && (
          <motion.div
            key={activeNode.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3.5 bg-black/50 border border-white/5 rounded-2xl relative flex gap-3.5 items-start"
          >
            {/* Left color glow bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: activeNode.color }} />

            <div className="w-8 h-8 rounded-xl bg-white/10 shrink-0 overflow-hidden border border-white/10">
              {activeNode.pic ? (
                <img src={activeNode.pic} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/50">
                  {activeNode.label[0]}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: activeNode.color }}>
                  {activeNode.label}
                  {activeNode.isRoot && (
                    <span className="text-[7px] px-1 py-0.5 bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 font-mono rounded">
                      ROOT_POST
                    </span>
                  )}
                </span>
                <span className="text-[8px] text-white/30 font-mono">
                  {new Date(activeNode.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed italic line-clamp-2">
                „{activeNode.content}“
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
