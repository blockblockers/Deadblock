import{r as u,j as a,af as x}from"./index-8HZmLUul.js";const y={mixed:[{color:"#22d3ee",glow:"rgba(34,211,238,0.8)"},{color:"#ec4899",glow:"rgba(236,72,153,0.8)"},{color:"#a855f7",glow:"rgba(168,85,247,0.8)"},{color:"#22c55e",glow:"rgba(34,197,94,0.8)"},{color:"#f59e0b",glow:"rgba(245,158,11,0.8)"},{color:"#6366f1",glow:"rgba(99,102,241,0.8)"}],online:[{color:"#fbbf24",glow:"rgba(251,191,36,0.85)"},{color:"#f97316",glow:"rgba(249,115,22,0.8)"},{color:"#22d3ee",glow:"rgba(34,211,238,0.7)"},{color:"#a855f7",glow:"rgba(168,85,247,0.7)"},{color:"#fcd34d",glow:"rgba(252,211,77,0.75)"}],weekly:[{color:"#a855f7",glow:"rgba(168,85,247,0.85)"},{color:"#ec4899",glow:"rgba(236,72,153,0.8)"},{color:"#8b5cf6",glow:"rgba(139,92,246,0.8)"},{color:"#c084fc",glow:"rgba(192,132,252,0.75)"},{color:"#f472b6",glow:"rgba(244,114,182,0.7)"}],puzzle:[{color:"#22c55e",glow:"rgba(34,197,94,0.85)"},{color:"#10b981",glow:"rgba(16,185,129,0.8)"},{color:"#14b8a6",glow:"rgba(20,184,166,0.75)"},{color:"#4ade80",glow:"rgba(74,222,128,0.7)"},{color:"#34d399",glow:"rgba(52,211,153,0.75)"}],ai:[{color:"#3b82f6",glow:"rgba(59,130,246,0.85)"},{color:"#6366f1",glow:"rgba(99,102,241,0.8)"},{color:"#22d3ee",glow:"rgba(34,211,238,0.75)"},{color:"#60a5fa",glow:"rgba(96,165,250,0.7)"},{color:"#818cf8",glow:"rgba(129,140,248,0.75)"}],game:[{color:"#22d3ee",glow:"rgba(34,211,238,0.85)"},{color:"#06b6d4",glow:"rgba(6,182,212,0.8)"},{color:"#a855f7",glow:"rgba(168,85,247,0.7)"},{color:"#67e8f9",glow:"rgba(103,232,249,0.75)"},{color:"#38bdf8",glow:"rgba(56,189,248,0.75)"}],cyan:[{color:"#22d3ee",glow:"rgba(34,211,238,0.8)"},{color:"#06b6d4",glow:"rgba(6,182,212,0.8)"},{color:"#0891b2",glow:"rgba(8,145,178,0.8)"},{color:"#67e8f9",glow:"rgba(103,232,249,0.8)"}],amber:[{color:"#fbbf24",glow:"rgba(251,191,36,0.8)"},{color:"#f59e0b",glow:"rgba(245,158,11,0.8)"},{color:"#d97706",glow:"rgba(217,119,6,0.8)"},{color:"#fcd34d",glow:"rgba(252,211,77,0.8)"}],purple:[{color:"#a855f7",glow:"rgba(168,85,247,0.8)"},{color:"#9333ea",glow:"rgba(147,51,234,0.8)"},{color:"#7c3aed",glow:"rgba(124,58,237,0.8)"},{color:"#c084fc",glow:"rgba(192,132,252,0.8)"}],green:[{color:"#22c55e",glow:"rgba(34,197,94,0.8)"},{color:"#16a34a",glow:"rgba(22,163,74,0.8)"},{color:"#4ade80",glow:"rgba(74,222,128,0.8)"},{color:"#86efac",glow:"rgba(134,239,172,0.8)"}],pink:[{color:"#ec4899",glow:"rgba(236,72,153,0.8)"},{color:"#db2777",glow:"rgba(219,39,119,0.8)"},{color:"#f472b6",glow:"rgba(244,114,182,0.8)"},{color:"#f9a8d4",glow:"rgba(249,168,212,0.8)"}],red:[{color:"#ef4444",glow:"rgba(239,68,68,0.8)"},{color:"#dc2626",glow:"rgba(220,38,38,0.8)"},{color:"#f87171",glow:"rgba(248,113,113,0.8)"},{color:"#fca5a5",glow:"rgba(252,165,165,0.8)"}]},M=({piece:i,startX:w,startY:c,delay:s,duration:d,color:f,glowColor:t,size:r,rotation:l,opacity:$,floatX:e,floatY:g})=>{const n=x[i]||x.T,o=Math.min(...n.map(([b])=>b)),m=Math.min(...n.map(([,b])=>b)),h=`float-${Math.abs(Math.round(e*10))}-${Math.abs(Math.round(g*10))}-${Math.round(l)}`;return a.jsxs("div",{className:"absolute pointer-events-none",style:{left:`${w}%`,top:`${c}%`,animation:`${h} ${d}s ease-in-out infinite`,animationDelay:`${s}s`,opacity:$,willChange:"transform, opacity",filter:`drop-shadow(0 0 8px ${t})`},children:[a.jsx("style",{children:`
        @keyframes ${h} {
          0%, 100% {
            transform: translate(0, 0) rotate(${l}deg) scale(1);
          }
          25% {
            transform: translate(${e*.6}px, ${g*.4}px) rotate(${l+45}deg) scale(1.05);
          }
          50% {
            transform: translate(${e}px, ${g}px) rotate(${l+90}deg) scale(1.1);
          }
          75% {
            transform: translate(${e*.4}px, ${g*.8}px) rotate(${l+135}deg) scale(1.05);
          }
        }
      `}),a.jsx("div",{className:"relative",style:{transform:`scale(${r})`},children:n.map(([b,j],p)=>a.jsx("div",{className:"absolute rounded-sm",style:{width:10,height:10,left:(b-o)*12,top:(j-m)*12,backgroundColor:f,boxShadow:`0 0 15px ${t}, 0 0 30px ${t}60, inset 0 0 6px rgba(255,255,255,0.4)`,animation:`sparkle-piece ${1.5+p*.2}s ease-in-out infinite`,animationDelay:`${s+p*.15}s`,border:"1px solid rgba(255,255,255,0.3)"}},p))})]})};function v({theme:i="mixed",count:w=15,minOpacity:c=.25,maxOpacity:s=.55}){const[d,f]=u.useState(!1);u.useEffect(()=>{const r=setTimeout(()=>f(!0),50);return()=>clearTimeout(r)},[]);const t=u.useMemo(()=>{const r=Object.keys(x),l=y[i]||y.mixed;return Array.from({length:w}).map(($,e)=>{const g=l[e%l.length],n=e*1.618033988749895,o=m=>(Math.sin(n*m)+1)/2;return{id:e,piece:r[Math.floor(o(1)*r.length)],startX:o(2)*95+2.5,startY:o(3)*90+5,delay:o(4)*6,duration:20+o(5)*15,color:g.color,glowColor:g.glow,size:.7+o(6)*.5,rotation:o(7)*360,opacity:c+o(8)*(s-c),floatX:(o(9)-.5)*60,floatY:(o(10)-.5)*60}})},[i,w,c,s]);return d?a.jsxs(a.Fragment,{children:[a.jsx("style",{children:`
        @keyframes sparkle-piece {
          0%, 100% { 
            opacity: 0.8; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.15);
          }
        }
      `}),a.jsx("div",{className:"fixed inset-0 pointer-events-none overflow-hidden z-0",children:t.map(r=>a.jsx(M,{...r},r.id))})]}):null}export{v as F};
