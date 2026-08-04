import React from "react";

interface BtsLogoProps {
  className?: string;
  glow?: boolean;
  glowColor?: "cyan" | "purple" | "both";
  size?: number | string;
}

export function BtsLogo({ className = "", glow = true, glowColor = "both", size = "100%" }: BtsLogoProps) {
  const glowFilterId = `bts-glow-${glowColor}`;
  
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      width={size}
      height="auto"
      className={`select-none ${className}`}
      style={{ filter: glow ? `url(#${glowFilterId})` : "none" }}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="bts-glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur1" />
          <feGaussianBlur stdDeviation="20" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="bts-glow-purple" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur1" />
          <feGaussianBlur stdDeviation="20" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="bts-glow-both" x="-50%" y="-50%" width="200%" height="200%">
          {/* Intense multi-layered neon glow */}
          <feGaussianBlur stdDeviation="4" result="blur1" />
          <feGaussianBlur stdDeviation="12" result="blur2" />
          <feGaussianBlur stdDeviation="30" result="blur3" />
          <feColorMatrix type="matrix" values="
            1 0 0 0 0.6
            0 1 0 0 0.1
            0 0 1 0 1
            0 0 0 1 0
          " in="blur3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradients */}
        <linearGradient id="bts-aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#9b51e0" />
          <stop offset="100%" stopColor="#ff007f" />
        </linearGradient>

        <linearGradient id="bts-silver-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#a3b8cc" />
        </linearGradient>

        <linearGradient id="wing-left-grad" x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#7000ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#050507" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="wing-right-grad" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#7000ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#050507" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background Soft Aura Waves */}
      <g opacity="0.35">
        <path d="M 150,250 C 250,150 350,350 400,250 C 450,150 550,350 650,250" fill="none" stroke="url(#bts-aurora-grad)" strokeWidth="6" strokeLinecap="round" className="animate-pulse" style={{ animationDuration: "6s" }} />
        <path d="M 100,280 C 220,180 320,380 400,280 C 480,180 580,380 700,280" fill="none" stroke="#00f2fe" strokeWidth="2" strokeDasharray="10 15" opacity="0.5" />
      </g>

      {/* Symmetrical Winged Structure */}
      <g transform="translate(400, 240)">
        {/* Left Wing Group */}
        <g className="transition-all duration-1000 hover:scale-105">
          {/* Main outer wing boundary */}
          <path 
            d="M -30,-20 
               C -90,-80 -180,-120 -350,-110 
               C -330,-60 -290,-20 -200,10 
               C -140,30 -80,20 -30,10 Z" 
            fill="url(#wing-left-grad)" 
            stroke="#00f2fe" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
          {/* Feather accents inner level 1 */}
          <path 
            d="M -50,-35 
               C -110,-75 -190,-100 -310,-95
               C -270,-55 -210,-10 -150,10
               C -110,20 -70,15 -50,5 Z" 
            fill="none" 
            stroke="#9b51e0" 
            strokeWidth="2.5" 
            strokeDasharray="400" 
          />
          {/* Feather level 2 feathers detail lines */}
          <path d="M -100,-10 C -180,-30 -240,-40 -290,-35" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          <path d="M -80,-25 C -150,-50 -210,-60 -260,-55" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          <path d="M -60,-40 C -120,-70 -180,-80 -230,-75" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          
          {/* Lower small wing feathers */}
          <path 
            d="M -30,15 
               C -70,35 -120,50 -180,45 
               C -150,65 -90,75 -30,30 Z" 
            fill="url(#wing-left-grad)" 
            stroke="#00f2fe" 
            strokeWidth="2" 
          />
          <path d="M -40,25 C -80,40 -120,48 -150,42" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        </g>

        {/* Right Wing Group */}
        <g className="transition-all duration-1000 hover:scale-105">
          {/* Main outer wing boundary */}
          <path 
            d="M 30,-20 
               C 90,-80 180,-120 350,-110 
               C 330,-60 290,-20 200,10 
               C 140,30 80,20 30,10 Z" 
            fill="url(#wing-right-grad)" 
            stroke="#00f2fe" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
          {/* Feather accents inner level 1 */}
          <path 
            d="M 50,-35 
               C 110,-75 190,-100 310,-95
               C 270,-55 210,-10 150,10
               C 110,20 70,15 50,5 Z" 
            fill="none" 
            stroke="#9b51e0" 
            strokeWidth="2.5" 
          />
          {/* Feather level 2 feathers detail lines */}
          <path d="M 100,-10 C 180,-30 240,-40 290,-35" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          <path d="M 80,-25 C 150,-50 210,-60 260,-55" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
          <path d="M 60,-40 C 120,-70 180,-80 230,-75" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />

          {/* Lower small wing feathers */}
          <path 
            d="M 30,15 
               C 70,35 120,50 180,45 
               C 150,65 90,75 30,30 Z" 
            fill="url(#wing-right-grad)" 
            stroke="#00f2fe" 
            strokeWidth="2" 
          />
          <path d="M 40,25 C 80,40 120,48 150,42" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
        </g>

        {/* Central BTS Calligraphy Graffiti Script with dripping paint */}
        {/* Glow backdrop for text to keep it high contrast */}
        <circle cx="0" cy="10" r="85" fill="#050507" opacity="0.85" filter="blur(10px)" />

        <g className="transform hover:scale-110 transition-transform duration-500">
          {/* Thick black drop shadow path of letters */}
          <path 
            d="M -75,-60 
               C -75,-60 -95,-40 -95,-10 
               C -95,20 -70,45 -45,45 
               C -25,45 -10,30 -5,15
               C 0,5 5,-5 15,-15
               C 25,-25 35,-30 45,-30
               C 60,-30 75,-15 75,10
               C 75,35 50,60 20,70
               L 15,85
               C 12,95 10,105 10,115
               C 10,125 12,130 15,130
               C 18,130 22,120 25,110
               L 40,65
               C 45,55 55,45 65,45
               C 80,45 95,60 95,80
               C 95,105 70,125 45,125
               C 25,125 5,115 -5,100
               C -10,90 -12,75 -10,60
               L -25,110
               C -28,120 -30,135 -30,145
               C -30,150 -28,155 -25,155
               C -22,155 -18,145 -15,135
               L -5,100" 
            fill="none" 
            stroke="#050507" 
            strokeWidth="22" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Glowing Purple border of bts text */}
          <path 
            d="M -75,-60 
               C -75,-60 -95,-40 -95,-10 
               C -95,20 -70,45 -45,45 
               C -25,45 -10,30 -5,15
               C 0,5 5,-5 15,-15
               C 25,-25 35,-30 45,-30
               C 60,-30 75,-15 75,10
               C 75,35 50,60 20,70
               L 15,85
               C 12,95 10,105 10,115
               C 10,125 12,130 15,130
               C 18,130 22,120 25,110
               L 40,65
               C 45,55 55,45 65,45
               C 80,45 95,60 95,80
               C 95,105 70,125 45,125
               C 25,125 5,115 -5,100
               C -10,90 -12,75 -10,60
               L -25,110
               C -28,120 -30,135 -30,145
               C -30,150 -28,155 -25,155
               C -22,155 -18,145 -15,135
               L -5,100" 
            fill="none" 
            stroke="#df19ff" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Crisp white core of bts text */}
          <path 
            d="M -75,-60 
               C -75,-60 -95,-40 -95,-10 
               C -95,20 -70,45 -45,45 
               C -25,45 -10,30 -5,15
               C 0,5 5,-5 15,-15
               C 25,-25 35,-30 45,-30
               C 60,-30 75,-15 75,10
               C 75,35 50,60 20,70
               L 15,85
               C 12,95 10,105 10,115
               C 10,125 12,130 15,130
               C 18,130 22,120 25,110
               L 40,65
               C 45,55 55,45 65,45
               C 80,45 95,60 95,80
               C 95,105 70,125 45,125
               C 25,125 5,115 -5,100
               C -10,90 -12,75 -10,60
               L -25,110
               C -28,120 -30,135 -30,145
               C -30,150 -28,155 -25,155
               C -22,155 -18,145 -15,135
               L -5,100" 
            fill="none" 
            stroke="url(#bts-silver-grad)" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Dripping Paint droplets under text (Matching graffiti look of the reference pictures) */}
          {/* Drip 1 */}
          <g transform="translate(-30, 150)">
            <path d="M 0,0 C -2,10 -5,20 -5,25 C -5,28 -3,30 0,30 C 3,30 5,28 5,25 C 5,20 2,10 0,0 Z" fill="url(#bts-silver-grad)" stroke="#df19ff" strokeWidth="1.5" />
          </g>
          {/* Drip 2 */}
          <g transform="translate(15, 133)">
            <path d="M 0,0 C -2,6 -4,12 -4,15 C -4,17 -2,18 0,18 C 2,18 4,17 4,15 C 4,12 2,6 0,0 Z" fill="url(#bts-silver-grad)" stroke="#df19ff" strokeWidth="1" />
          </g>
          {/* Drip 3 */}
          <g transform="translate(-45, 45)">
            <path d="M 0,0 C -2,8 -3,15 -3,18 C -3,20 -1,21 0,21 C 1,21 3,20 3,18 C 3,15 2,8 0,0 Z" fill="#df19ff" opacity="0.8" />
          </g>
        </g>
      </g>
      
      {/* HUD futuristic lines under */}
      <text x="400" y="475" textAnchor="middle" fill="#00f2fe" fontSize="12" fontWeight="900" letterSpacing="8" opacity="0.7" className="mono">
        DIGITÁLNÍ SIGNATURA • EST. 2003
      </text>
    </svg>
  );
}
