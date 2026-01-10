import{m as Ct,r as s,s as p,j as e,X as Ke,a3 as Ut,Y as yt,H as Ht,$ as ze,a7 as Vt,a6 as Pe,q as Xt,u as Zt,B as S,d as Xe,b as ft,af as vt,f as Jt,D as Kt,A as es,N as ts,a as ss,G as as,i as rs,ag as ns,k as os,ah as ls,W as jt,a2 as Nt}from"./index-8HZmLUul.js";import{g as de}from"./gameSync-C85scV0-.js";import{S as is,n as cs,r as Te}from"./rematchService-B9FdZ2Mv.js";import{A as ds}from"./alert-triangle-CdR1lECF.js";import{C as us}from"./clock-DH6CZMwC.js";const ms=Ct("Loader2",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]),Je=Ct("MessageCircle",[["path",{d:"m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z",key:"v2veuj"}]]),fs=({isOpen:r,onClose:o,onAccept:i,onDecline:t,onBackToMenu:b,isRequester:f,requesterName:u,isWaiting:w=!1,opponentAccepted:l=!1,opponentDeclined:y=!1,error:v=null,firstPlayerName:j=null})=>{const[R,M]=s.useState(""),[T,$]=s.useState(!1);return s.useEffect(()=>{if(!w)return;const E=setInterval(()=>{M(V=>V.length>=3?"":V+".")},500);return()=>clearInterval(E)},[w]),s.useEffect(()=>{r&&!T&&(p.playSound("notification"),$(!0)),r||$(!1)},[r,T]),r?e.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4",style:{backgroundColor:"rgba(0, 0, 0, 0.8)"},children:[e.jsx("div",{className:"absolute inset-0 backdrop-blur-sm",onClick:o}),e.jsxs("div",{className:"relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/20 max-w-sm w-full overflow-hidden",children:[e.jsx("button",{onClick:o,className:"absolute top-3 right-3 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white transition-colors z-10",children:e.jsx(Ke,{size:20})}),e.jsx("div",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 blur-3xl"}),e.jsxs("div",{className:"relative p-6 pt-8",children:[e.jsx("div",{className:"flex justify-center mb-4",children:e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"absolute inset-0 bg-amber-500/30 blur-xl rounded-full"}),e.jsx("div",{className:"relative bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-full",children:e.jsx(Ut,{size:32,className:"text-white"})})]})}),e.jsx("h2",{className:"text-2xl font-bold text-center text-white mb-2",children:f?"Rematch Requested":"Rematch Challenge!"}),e.jsxs("div",{className:"text-center mb-6",children:[w&&!l&&!y&&e.jsxs("div",{className:"flex items-center justify-center gap-2 text-amber-400",children:[e.jsx(ms,{size:20,className:"animate-spin"}),e.jsxs("span",{children:["Waiting for opponent",R]})]}),l&&e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-center gap-2 text-green-400",children:[e.jsx(yt,{size:20}),e.jsx("span",{children:"Opponent accepted!"})]}),j&&e.jsxs("p",{className:"text-amber-300 text-sm",children:[j," goes first"]}),e.jsx("p",{className:"text-slate-400 text-sm",children:"Starting game..."})]}),y&&e.jsx("div",{className:"text-red-400",children:"Opponent declined the rematch"}),v&&e.jsx("div",{className:"text-red-400",children:v}),!f&&!w&&!l&&!y&&!v&&e.jsxs("p",{className:"text-slate-300",children:[e.jsx("span",{className:"text-amber-400 font-semibold",children:u})," wants a rematch!"]}),f&&!w&&!l&&!y&&!v&&e.jsx("p",{className:"text-slate-300",children:"Your rematch request has been sent"})]}),e.jsxs("div",{className:"space-y-3",children:[!f&&!y&&!l&&e.jsxs("button",{onClick:i,className:"w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2",children:[e.jsx(yt,{size:20}),"Accept Rematch"]}),!f&&!l&&!y&&e.jsxs("button",{onClick:t,className:"w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2",children:[e.jsx(Ke,{size:20}),"Decline"]}),f&&w&&!l&&!y&&e.jsx("button",{onClick:t,className:"w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-medium rounded-xl transition-all",children:"Cancel Request"}),f&&w&&!l&&!y&&b&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:()=>{p.playButtonClick(),b()},className:"w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700",children:[e.jsx(Ht,{size:18}),"Back to Menu"]}),e.jsx("p",{className:"text-slate-500 text-xs text-center",children:"Your rematch request will stay active"})]}),(y||v)&&e.jsx("button",{onClick:o,className:"w-full py-3 px-6 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium rounded-xl border border-amber-500/30 transition-all",children:"Close"})]})]})]})]}):null},ht={good_luck:{text:"Good luck!",icon:"🍀"},good_game:{text:"Good game!",icon:"🎮"},nice_move:{text:"Nice move!",icon:"👏"},thanks:{text:"Thanks!",icon:"🙏"},oops:{text:"Oops!",icon:"😅"},thinking:{text:"Thinking...",icon:"🤔"},hurry:{text:"Your turn!",icon:"⏰"},rematch:{text:"Rematch?",icon:"🔄"},hello:{text:"Hello!",icon:"👋"},bye:{text:"Goodbye!",icon:"👋"},wow:{text:"Wow!",icon:"😲"},sorry:{text:"Sorry!",icon:"😔"}},xt={thumbs_up:"👍",thumbs_down:"👎",clap:"👏",fire:"🔥",cry:"😢",laugh:"😄",mind_blown:"🤯",trophy:"🏆",heart:"❤️",skull:"💀",eyes:"👀",muscle:"💪"},re={async sendQuickChat(r,o,i){if(!ze())return{error:{message:"Not configured"}};if(!ht[i])return{error:{message:"Invalid message key"}};const{data:t,error:b}=await Pe.from("game_chat").insert({game_id:r,user_id:o,message_type:"quick_chat",message_key:i}).select().single();return{data:t,error:b}},async sendEmote(r,o,i){if(!ze())return{error:{message:"Not configured"}};if(!xt[i])return{error:{message:"Invalid emote"}};const{data:t,error:b}=await Pe.from("game_chat").insert({game_id:r,user_id:o,message_type:"emote",message_key:i}).select().single();return{data:t,error:b}},async sendCustomMessage(r,o,i){if(!ze())return{error:{message:"Not configured"}};if(!i||typeof i!="string")return{error:{message:"Invalid message"}};const t=i.trim().slice(0,200);if(t.length===0)return{error:{message:"Message cannot be empty"}};const{data:b,error:f}=await Pe.from("game_chat").insert({game_id:r,user_id:o,message_type:"custom",message_key:"custom",message:t}).select().single();return{data:b,error:f}},async getChatHistory(r,o=50){if(!ze())return{data:[],error:null};const{data:i,error:t}=await Pe.from("game_chat").select(`
        id,
        user_id,
        message_type,
        message_key,
        message,
        created_at
      `).eq("game_id",r).order("created_at",{ascending:!0}).limit(o);return{data:i||[],error:t}},subscribeToChat(r,o){return ze()?(console.log("[ChatService] Registering chat handler for game:",r),Vt.on("chatMessage",i=>{console.log("[ChatService] Received chatMessage event:",i?.id,"for game:",i?.game_id),i.game_id===r?(console.log("[ChatService] Message matches our game, calling callback"),o(i)):console.log("[ChatService] Message for different game, ignoring")})):(console.log("[ChatService] Not configured, skipping subscription"),()=>{})},unsubscribeFromChat(r){r&&typeof r=="function"&&r()},getMessageDisplay(r,o,i=null){return r==="quick_chat"?ht[o]||{text:o,icon:"💬"}:r==="emote"?{text:"",icon:xt[o]||"❓"}:r==="custom"?{text:i||o,icon:"💬"}:{text:o,icon:"💬"}}},hs=({gameId:r,userId:o,opponentName:i,disabled:t=!1,isOpen:b,onToggle:f,hideButton:u=!1,onNewMessage:w})=>{const[l,y]=s.useState(!1),v=b!==void 0&&f!==void 0,j=v?b:l,R=v?f:y,[M,T]=s.useState("chat"),[$,E]=s.useState([]),[V,g]=s.useState(null),[Ne,O]=s.useState(!1),[W,q]=s.useState(!1),[U,d]=s.useState(""),ee=s.useRef(null),A=s.useRef(null),ne=s.useRef(null),Q=s.useRef(null);s.useEffect(()=>{M==="type"&&Q.current&&Q.current.focus()},[M]),s.useEffect(()=>{if(!r){console.log("[QuickChat] No gameId, skipping subscription");return}return console.log("[QuickChat] Setting up subscription for game:",r,"userId:",o),re.getChatHistory(r).then(({data:m})=>{m&&(console.log("[QuickChat] Loaded",m.length,"existing messages"),E(m.slice(-10)))}),ee.current=re.subscribeToChat(r,m=>{if(console.log("[QuickChat] 📨 New message received:",m),E(N=>[...N.slice(-9),m]),m.user_id!==o){console.log("[QuickChat] 🔔 OPPONENT MESSAGE - Showing notification!");const N=re.getMessageDisplay(m.message_type,m.message_key,m.message);O(!0),ne.current&&clearTimeout(ne.current),ne.current=setTimeout(()=>O(!1),500),g(N),p.playSound?.("notification"),setTimeout(()=>p.playSound?.("notification"),200),navigator.vibrate&&navigator.vibrate([100,50,100,50,100]),w?.(!0),A.current&&clearTimeout(A.current),A.current=setTimeout(()=>g(null),6e3)}}),()=>{ee.current&&re.unsubscribeFromChat(ee.current),A.current&&clearTimeout(A.current),ne.current&&clearTimeout(ne.current)}},[r,o,w]);const ie=s.useRef(null);s.useEffect(()=>{if(!r||!o)return;const m=async()=>{const{data:G}=await re.getChatHistory(r);if(G&&G.length>0){const te=G[G.length-1];if(ie.current&&te.id!==ie.current&&te.user_id!==o){console.log("[QuickChat] 🔄 POLL: Found new opponent message!",te.id);const pe=re.getMessageDisplay(te.message_type,te.message_key,te.message);V||(O(!0),setTimeout(()=>O(!1),500),g(pe),p.playSound?.("notification"),navigator.vibrate&&navigator.vibrate([100,50,100]),w?.(!0),A.current&&clearTimeout(A.current),A.current=setTimeout(()=>g(null),6e3))}ie.current=te.id}};re.getChatHistory(r).then(({data:G})=>{G&&G.length>0&&(ie.current=G[G.length-1].id)});const N=setInterval(m,5e3);return()=>clearInterval(N)},[r,o,V,w]);const[he,X]=s.useState(null),ae=s.useRef(null),xe=async(m,N)=>{if(W||t)return;q(!0),setTimeout(()=>q(!1),2e3);const G=re.getMessageDisplay(m,N);m==="chat"?await re.sendQuickChat(r,o,N):await re.sendEmote(r,o,N),p.playClickSound?.("soft"),X(G),ae.current&&clearTimeout(ae.current),ae.current=setTimeout(()=>{X(null),R(!1)},1500)},Ee=async()=>{if(W||t||!U.trim())return;const m=U.trim();q(!0),setTimeout(()=>q(!1),2e3),d("");const{error:N}=await re.sendCustomMessage(r,o,m);if(N){console.error("[QuickChat] Failed to send custom message:",N),X({icon:"❌",text:"Failed to send"}),ae.current&&clearTimeout(ae.current),ae.current=setTimeout(()=>{X(null)},2e3);return}p.playClickSound?.("soft"),X({icon:"💬",text:m.slice(0,30)+(m.length>30?"...":"")}),ae.current&&clearTimeout(ae.current),ae.current=setTimeout(()=>{X(null)},1500)},Oe=m=>{m.key==="Enter"&&!m.shiftKey&&(m.preventDefault(),Ee())};return e.jsxs(e.Fragment,{children:[Ne&&e.jsx("div",{className:"fixed inset-0 z-[100] pointer-events-none bg-amber-500/40",style:{animation:"flashPulse 0.5s ease-out"}}),V&&e.jsxs("div",{className:"fixed top-16 left-1/2 -translate-x-1/2 z-50",style:{animation:"bounceIn 0.4s ease-out"},children:[e.jsx("div",{className:"absolute inset-0 bg-amber-500/30 rounded-2xl blur-xl animate-pulse"}),e.jsxs("div",{className:"relative bg-gradient-to-br from-amber-900 via-slate-800 to-slate-900 border-2 border-amber-500 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(251,191,36,0.5)] flex flex-col items-center gap-1 max-w-xs",children:[e.jsxs("div",{className:"flex items-center gap-1.5 mb-1",children:[e.jsx("div",{className:"w-2 h-2 bg-amber-400 rounded-full animate-pulse"}),e.jsxs("span",{className:"text-amber-400 text-xs font-bold uppercase tracking-wide",children:[i||"Opponent"," says:"]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-3xl",children:V.icon}),V.text&&e.jsx("span",{className:"text-white text-lg font-bold text-center break-words",children:V.text})]})]}),e.jsx("div",{className:"absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-transparent border-t-amber-500"})]}),he&&e.jsx("div",{className:"fixed top-32 left-1/2 -translate-x-1/2 z-50",style:{animation:"fadeIn 0.2s ease-out"},children:e.jsxs("div",{className:"bg-green-800 border-2 border-green-500 rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-3 max-w-xs",children:[e.jsx("span",{className:"text-green-400 text-sm font-bold",children:"SENT!"}),e.jsx("span",{className:"text-2xl",children:he.icon}),he.text&&e.jsx("span",{className:"text-green-200 text-base font-medium break-words",children:he.text})]})}),!u&&e.jsxs("button",{onClick:()=>R(!j),disabled:t,className:`
            fixed top-20 right-4 z-40 p-2.5 rounded-full shadow-lg transition-all
            ${j?"bg-amber-500 text-slate-900":"bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700"}
            ${t?"opacity-50 cursor-not-allowed":""}
          `,children:[j?e.jsx(Ke,{size:20}):e.jsx(Je,{size:20}),W&&e.jsx("div",{className:"absolute inset-0 rounded-full border-2 border-amber-400 animate-ping"})]}),j&&e.jsxs("div",{className:"fixed z-40 w-72 bg-slate-900 border border-amber-500/30 rounded-xl shadow-xl overflow-hidden",style:{right:"1rem",bottom:u?"8rem":"12rem"},children:[u&&e.jsxs("div",{className:"flex items-center justify-between px-3 py-2 border-b border-amber-500/20 bg-slate-800/50",children:[e.jsx("span",{className:"text-sm font-medium text-amber-300",children:"Quick Chat"}),e.jsx("button",{onClick:()=>R(!1),className:"p-1 text-slate-400 hover:text-white rounded",children:e.jsx(Ke,{size:16})})]}),e.jsxs("div",{className:"flex border-b border-amber-500/20",children:[e.jsx("button",{onClick:()=>T("chat"),className:`flex-1 py-2 text-xs font-medium transition-colors ${M==="chat"?"bg-amber-500/20 text-amber-300":"text-slate-400 hover:text-slate-200"}`,children:"Quick"}),e.jsx("button",{onClick:()=>T("emote"),className:`flex-1 py-2 text-xs font-medium transition-colors ${M==="emote"?"bg-amber-500/20 text-amber-300":"text-slate-400 hover:text-slate-200"}`,children:"Emotes"}),e.jsx("button",{onClick:()=>T("type"),className:`flex-1 py-2 text-xs font-medium transition-colors ${M==="type"?"bg-amber-500/20 text-amber-300":"text-slate-400 hover:text-slate-200"}`,children:"Type ✏️"})]}),e.jsx("div",{className:"p-2 max-h-64 overflow-y-auto",style:{WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"},children:M==="chat"?e.jsx("div",{className:"grid grid-cols-2 gap-2",children:Object.entries(ht).map(([m,{text:N,icon:G}])=>e.jsxs("button",{onClick:()=>xe("chat",m),disabled:W,className:`
                      flex items-center gap-2 p-2 rounded-lg text-left transition-all
                      bg-slate-800 hover:bg-slate-700 border border-slate-700
                      ${W?"opacity-50 cursor-not-allowed":"hover:border-amber-500/30"}
                    `,children:[e.jsx("span",{className:"text-lg",children:G}),e.jsx("span",{className:"text-xs text-slate-300 truncate",children:N})]},m))}):M==="emote"?e.jsx("div",{className:"grid grid-cols-5 gap-2",children:Object.entries(xt).map(([m,N])=>e.jsx("button",{onClick:()=>xe("emote",m),disabled:W,className:`
                      p-3 rounded-lg text-2xl transition-all
                      bg-slate-800 hover:bg-slate-700 border border-slate-700
                      ${W?"opacity-50 cursor-not-allowed":"hover:border-amber-500/30 hover:scale-110"}
                    `,children:N},m))}):e.jsxs("div",{className:"space-y-3",children:[e.jsx("p",{className:"text-xs text-slate-400 text-center",children:"Type a short message (max 200 chars)"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("input",{ref:Q,type:"text",value:U,onChange:m=>d(m.target.value.slice(0,200)),onKeyDown:Oe,placeholder:W?"Wait...":"Type message...",disabled:W||t,className:`
                      flex-1 px-3 py-2 bg-slate-800 border rounded-lg 
                      text-sm text-white placeholder-slate-500
                      focus:outline-none focus:ring-1 transition-all
                      ${W||t?"border-slate-700 cursor-not-allowed opacity-50":"border-slate-600 focus:border-amber-500/50 focus:ring-amber-500/30"}
                    `,maxLength:200}),e.jsx("button",{onClick:Ee,disabled:W||t||!U.trim(),className:`
                      p-2 rounded-lg transition-all
                      ${W||t||!U.trim()?"bg-slate-800 text-slate-600 cursor-not-allowed":"bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"}
                    `,children:e.jsx(is,{size:18})})]}),U.length>0&&e.jsx("div",{className:"text-right",children:e.jsxs("span",{className:`text-xs ${U.length>=200?"text-red-400":"text-slate-500"}`,children:[U.length,"/200"]})}),W&&e.jsx("div",{className:"h-1 bg-slate-800 rounded-full overflow-hidden",children:e.jsx("div",{className:"h-full bg-amber-500/50 animate-pulse",style:{width:"100%",animation:"shrink 2s linear forwards"}})})]})}),$.length>0&&e.jsxs("div",{className:"border-t border-amber-500/20 p-2 max-h-28 overflow-y-auto",style:{WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"},children:[e.jsx("p",{className:"text-xs text-slate-500 mb-1",children:"Recent"}),e.jsx("div",{className:"space-y-1",children:$.slice(-5).map((m,N)=>{const G=re.getMessageDisplay(m.message_type,m.message_key,m.message),te=m.user_id===o;return e.jsxs("div",{className:`text-xs flex items-start gap-1 ${te?"justify-end":"justify-start"}`,children:[e.jsxs("span",{className:`shrink-0 ${te?"text-amber-400":"text-cyan-400"}`,children:[te?"You":i?.slice(0,8)||"Opp",":"]}),e.jsx("span",{className:"shrink-0",children:G.icon}),G.text&&e.jsxs("span",{className:"text-slate-400 break-words max-w-[150px]",children:[G.text.slice(0,40),G.text.length>40?"...":""]})]},m.id||N)})})]})]}),e.jsx("style",{children:`
        @keyframes bounceIn {
          0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
          50% { transform: translateX(-50%) scale(1.1); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes flashPulse {
          0% { opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `})]})},xs=({seconds:r,turnStartedAt:o,isMyTurn:i,onTimeout:t,paused:b=!1})=>{const[f,u]=s.useState(r),[w,l]=s.useState(!1),[y,v]=s.useState(!1),j=s.useRef(!1),R=s.useRef(!1);if(s.useEffect(()=>{if(!r||!o||b){u(r);return}const Ne=new Date(o).getTime(),O=()=>{const q=Date.now(),U=Math.floor((q-Ne)/1e3),d=Math.max(0,r-U);u(d),l(d<=30&&d>10),v(d<=10),i&&(d<=30&&d>10&&!j.current&&(p.playSound("notification"),j.current=!0),d<=10&&!R.current&&(p.playSound("invalid"),R.current=!0)),d===0&&i&&t?.()};O();const W=setInterval(O,1e3);return()=>clearInterval(W)},[r,o,i,b,t]),s.useEffect(()=>{j.current=!1,R.current=!1},[o]),!r)return null;const M=Math.floor(f/60),T=f%60,$=M>0?`${M}:${T.toString().padStart(2,"0")}`:`${T}s`,E=f/r*100,g=y?{bg:"bg-red-500/20",border:"border-red-500",text:"text-red-400",fill:"bg-red-500"}:w?{bg:"bg-amber-500/20",border:"border-amber-500",text:"text-amber-400",fill:"bg-amber-500"}:i?{bg:"bg-green-500/20",border:"border-green-500",text:"text-green-400",fill:"bg-green-500"}:{bg:"bg-slate-500/20",border:"border-slate-500",text:"text-slate-400",fill:"bg-slate-500"};return e.jsxs("div",{className:`
      flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
      ${g.bg} ${g.border}
      ${y&&i?"animate-pulse":""}
    `,children:[y&&i?e.jsx(ds,{size:16,className:`${g.text} animate-bounce`}):e.jsx(us,{size:16,className:g.text}),e.jsxs("div",{className:"flex-1 min-w-[60px]",children:[e.jsx("div",{className:"h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1",children:e.jsx("div",{className:`h-full ${g.fill} transition-all duration-1000`,style:{width:`${E}%`}})}),e.jsx("span",{className:`text-sm font-mono font-bold ${g.text}`,children:$})]})]})},ps=r=>{if(!r)return 2;const o=r.toLowerCase();return["grandmaster","legend","champion"].includes(o)?4:["master","diamond"].includes(o)?3:["platinum","gold"].includes(o)?2:1},gs=`
@keyframes placement-ripple {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes placement-ripple-intense {
  0% {
    transform: scale(0.6);
    opacity: 1;
  }
  30% {
    transform: scale(1.0);
    opacity: 0.8;
  }
  60% {
    transform: scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: scale(2.0);
    opacity: 0;
  }
}

@keyframes placement-ripple-elite {
  0% {
    transform: scale(0.4);
    opacity: 1;
    filter: brightness(1.5);
  }
  25% {
    transform: scale(0.8);
    opacity: 0.9;
    filter: brightness(1.3);
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
    filter: brightness(1.1);
  }
  75% {
    transform: scale(2.0);
    opacity: 0.3;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

@keyframes placement-burst {
  0% {
    transform: scale(0.5) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(1.3) rotate(180deg);
    opacity: 0.7;
  }
  100% {
    transform: scale(0.3) rotate(360deg);
    opacity: 0;
  }
}

@keyframes placement-burst-intense {
  0% {
    transform: scale(0.3) rotate(0deg);
    opacity: 1;
    filter: brightness(1.3);
  }
  40% {
    transform: scale(1.5) rotate(180deg);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.8) rotate(270deg);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.2) rotate(360deg);
    opacity: 0;
  }
}

@keyframes placement-burst-elite {
  0% {
    transform: scale(0.2) rotate(0deg);
    opacity: 1;
    filter: brightness(1.5) saturate(1.3);
  }
  30% {
    transform: scale(1.2) rotate(120deg);
    opacity: 0.9;
    filter: brightness(1.4);
  }
  60% {
    transform: scale(2.0) rotate(240deg);
    opacity: 0.5;
    filter: brightness(1.2);
  }
  100% {
    transform: scale(0.1) rotate(360deg);
    opacity: 0;
  }
}

@keyframes sparkle-float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-30px) scale(0);
    opacity: 0;
  }
}

@keyframes sparkle-float-intense {
  0% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(var(--tx), var(--ty)) scale(1.2) rotate(180deg);
    opacity: 0.8;
  }
  100% {
    transform: translate(calc(var(--tx) * 2), calc(var(--ty) * 2)) scale(0) rotate(360deg);
    opacity: 0;
  }
}

@keyframes sparkle-trail {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
    filter: blur(0px);
  }
  50% {
    transform: translate(var(--tx), var(--ty)) scale(0.8);
    opacity: 0.6;
    filter: blur(1px);
  }
  100% {
    transform: translate(calc(var(--tx) * 1.5), calc(var(--ty) * 1.5)) scale(0.3);
    opacity: 0;
    filter: blur(2px);
  }
}

@keyframes cell-glow-cyan {
  0% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
  }
  50% {
    box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.8), 0 0 30px rgba(34, 211, 238, 0.6);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
  }
}

@keyframes cell-glow-cyan-intense {
  0% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
    transform: scale(1);
  }
  30% {
    box-shadow: inset 0 0 30px rgba(34, 211, 238, 1), 0 0 50px rgba(34, 211, 238, 0.8);
    transform: scale(1.05);
  }
  60% {
    box-shadow: inset 0 0 20px rgba(34, 211, 238, 0.6), 0 0 30px rgba(34, 211, 238, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(34, 211, 238, 0);
    transform: scale(1);
  }
}

@keyframes cell-glow-orange {
  0% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
  }
  50% {
    box-shadow: inset 0 0 20px rgba(251, 146, 60, 0.8), 0 0 30px rgba(251, 146, 60, 0.6);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
  }
}

@keyframes cell-glow-orange-intense {
  0% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
    transform: scale(1);
  }
  30% {
    box-shadow: inset 0 0 30px rgba(251, 146, 60, 1), 0 0 50px rgba(251, 146, 60, 0.8);
    transform: scale(1.05);
  }
  60% {
    box-shadow: inset 0 0 20px rgba(251, 146, 60, 0.6), 0 0 30px rgba(251, 146, 60, 0.4);
    transform: scale(1.02);
  }
  100% {
    box-shadow: inset 0 0 0 rgba(251, 146, 60, 0);
    transform: scale(1);
  }
}

@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

@keyframes screen-flash {
  0% { opacity: 0; }
  15% { opacity: 0.3; }
  100% { opacity: 0; }
}

@keyframes elite-particle {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  20% {
    transform: translate(calc(var(--tx) * 0.3), calc(var(--ty) * 0.3)) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0);
    opacity: 0;
  }
}

@keyframes shockwave {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
    border-width: 4px;
  }
  100% {
    transform: scale(3);
    opacity: 0;
    border-width: 1px;
  }
}
`;let _t=!1;const bs=()=>{if(_t)return;const r=document.createElement("style");r.textContent=gs,document.head.appendChild(r),_t=!0},ws=({x:r,y:o,color:i,delay:t,cellSize:b,intensity:f})=>{const u=i==="cyan",w=f>=3,l=u?w?"cell-glow-cyan-intense":"cell-glow-cyan":w?"cell-glow-orange-intense":"cell-glow-orange",y=.6+f*.1;return e.jsx("div",{className:"absolute pointer-events-none",style:{left:r,top:o,width:b,height:b,animation:`${l} ${y}s ease-out forwards`,animationDelay:`${t}ms`,borderRadius:"4px"}})},ys=({centerX:r,centerY:o,cellSize:i,intensity:t})=>{const b=t+1,f=t>=4,u=w=>t>=4?"placement-ripple-elite":t>=3?"placement-ripple-intense":"placement-ripple";return e.jsxs(e.Fragment,{children:[f&&e.jsx("div",{className:"absolute pointer-events-none rounded-full border-cyan-300",style:{left:r-i*1.5,top:o-i*1.5,width:i*3,height:i*3,borderWidth:"3px",borderStyle:"solid",animation:"shockwave 0.8s ease-out forwards"}}),Array.from({length:b}).map((w,l)=>e.jsx("div",{className:"absolute pointer-events-none rounded-full border-2 border-cyan-400",style:{left:r-i,top:o-i,width:i*2,height:i*2,animation:`${u()} ${.6+t*.15}s ease-out forwards`,animationDelay:`${l*(120-t*15)}ms`,opacity:.8-l*.1,borderWidth:`${3-l*.5}px`}},l)),t>=3&&Array.from({length:t*2}).map((w,l)=>{const y=l/(t*2)*Math.PI*2,v=i*(1+Math.random()*.5),j=Math.cos(y)*v,R=Math.sin(y)*v;return e.jsx("div",{className:"absolute pointer-events-none rounded-full bg-cyan-400",style:{left:r-3,top:o-3,width:6,height:6,boxShadow:"0 0 10px rgba(34, 211, 238, 0.8)","--tx":`${j}px`,"--ty":`${R}px`,animation:`elite-particle ${.5+t*.1}s ease-out forwards`,animationDelay:`${l*30}ms`}},`particle-${l}`)})]})},vs=({centerX:r,centerY:o,cellSize:i,intensity:t})=>{const b=4*t,f=i*(.8+t*.2),u=t>=4,w=()=>t>=4?"placement-burst-elite":t>=3?"placement-burst-intense":"placement-burst",l=()=>t>=3?"sparkle-float-intense":"sparkle-float",y=Array.from({length:b}).map((v,j)=>{const R=j/b*360,M=t>=3?(Math.random()-.5)*20:0,T=R+M,$=1+(t>=3?Math.random()*.5:j%2*.2);return{angle:T,dist:$}});return e.jsxs(e.Fragment,{children:[u&&e.jsx("div",{className:"absolute pointer-events-none rounded-full border-orange-300",style:{left:r-i*1.5,top:o-i*1.5,width:i*3,height:i*3,borderWidth:"3px",borderStyle:"solid",animation:"shockwave 0.8s ease-out forwards"}}),e.jsx("div",{className:"absolute pointer-events-none",style:{left:r-f*.5,top:o-f*.5,width:f,height:f,background:`radial-gradient(circle, rgba(251,146,60,${.6+t*.1}) 0%, rgba(251,146,60,0) 70%)`,animation:`${w()} ${.5+t*.1}s ease-out forwards`}}),t>=3&&e.jsx("div",{className:"absolute pointer-events-none",style:{left:r-f*.7,top:o-f*.7,width:f*1.4,height:f*1.4,background:"radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(251,191,36,0) 60%)",animation:`${w()} ${.7+t*.1}s ease-out forwards`,animationDelay:"50ms"}}),y.map((v,j)=>{const R=v.angle*Math.PI/180,M=i*v.dist*(1+t*.15),T=Math.cos(R)*M,$=Math.sin(R)*M,E=r+Math.cos(R)*i*.3,V=o+Math.sin(R)*i*.3,g=4+t;return e.jsx("div",{className:"absolute pointer-events-none",style:{left:E-g/2,top:V-g/2,width:g,height:g,borderRadius:"50%",background:j%3===0?"linear-gradient(135deg, #fbbf24, #f97316)":"linear-gradient(135deg, #fb923c, #ea580c)",boxShadow:`0 0 ${6+t*2}px rgba(251, 191, 36, ${.6+t*.1})`,"--tx":`${T}px`,"--ty":`${$}px`,animation:`${l()} ${.4+t*.1}s ease-out forwards`,animationDelay:`${j*(40-t*5)}ms`}},j)}),t>=4&&Array.from({length:8}).map((v,j)=>{const R=j/8*Math.PI*2,M=Math.cos(R)*i*2,T=Math.sin(R)*i*2;return e.jsx("div",{className:"absolute pointer-events-none rounded-full",style:{left:r-2,top:o-2,width:4,height:4,background:"rgba(251, 191, 36, 0.8)",boxShadow:"0 0 8px rgba(251, 191, 36, 0.6)","--tx":`${M}px`,"--ty":`${T}px`,animation:"sparkle-trail 0.6s ease-out forwards",animationDelay:`${100+j*25}ms`}},`trail-${j}`)})]})},js=({color:r})=>{const o=r==="cyan"?"rgba(34, 211, 238, 0.15)":"rgba(251, 146, 60, 0.15)";return e.jsx("div",{className:"fixed inset-0 pointer-events-none",style:{background:o,animation:"screen-flash 0.4s ease-out forwards",zIndex:100}})},Ns=({cells:r,player:o,boardRef:i,cellSize:t,tier:b,onComplete:f})=>{const[u,w]=s.useState(!0),l=ps(b);if(s.useEffect(()=>{bs();const $=600+l*150,E=setTimeout(()=>{w(!1),f?.()},$);return()=>clearTimeout(E)},[f,l]),!u||!r?.length||!i?.current)return null;const y=o===1?"cyan":"orange",v=r.reduce(($,E)=>$+E.row,0)/r.length,R=(r.reduce(($,E)=>$+E.col,0)/r.length+.5)*t,M=(v+.5)*t,T=l>=4;return e.jsxs(e.Fragment,{children:[T&&e.jsx(js,{color:y}),e.jsxs("div",{className:"absolute inset-0 pointer-events-none overflow-hidden",style:{zIndex:50},children:[r.map(($,E)=>e.jsx(ws,{x:$.col*t,y:$.row*t,color:y,delay:E*(40-l*5),cellSize:t,intensity:l},`${$.row}-${$.col}`)),o===1?e.jsx(ys,{centerX:R,centerY:M,cellSize:t,intensity:l}):e.jsx(vs,{centerX:R,centerY:M,cellSize:t,intensity:l})]})]})},_s=()=>{const[r,o]=s.useState(null),i=s.useCallback((b,f,u,w,l)=>{o({cells:b,player:f,boardRef:u,cellSize:w,tier:l,key:Date.now()})},[]),t=s.useCallback(()=>{o(null)},[]);return{animation:r,triggerAnimation:i,clearAnimation:t}},Ze={glow1:"bg-amber-500/30",glow2:"bg-orange-500/25",panelBorder:"border-amber-500/40",panelShadow:"shadow-[0_0_40px_rgba(251,191,36,0.2)]"},$e=({onClick:r,disabled:o,children:i,color:t="cyan",className:b="",title:f=""})=>{const u={cyan:"from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]",amber:"from-amber-500 to-orange-600 shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:shadow-[0_0_25px_rgba(251,191,36,0.6)]",green:"from-green-500 to-emerald-600 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)]",red:"from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]",purple:"from-purple-500 to-violet-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]",indigo:"from-indigo-500 to-blue-600 shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]",slate:"from-slate-600 to-slate-700 shadow-[0_0_10px_rgba(100,116,139,0.3)] hover:shadow-[0_0_15px_rgba(100,116,139,0.5)]"};return e.jsx("button",{onClick:r,disabled:o,title:f,className:`
        bg-gradient-to-r ${u[t]}
        text-white font-bold rounded-xl px-3 py-2 text-xs
        transition-all duration-200
        hover:scale-105 active:scale-95
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none
        flex items-center justify-center gap-1
        ${b}
      `,children:i})},Cs=({profile:r,opponent:o,isMyTurn:i,gameStatus:t})=>{const b=r?.rating||1e3,f=o?.rating||1e3,u=Nt.getRatingTier(b),w=Nt.getRatingTier(f),l=r?.username||r?.display_name||"You",y=o?.username||o?.display_name||"Opponent";return e.jsx("div",{className:"mb-3",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("div",{className:`flex-1 px-3 py-2 rounded-lg transition-all duration-300 ${i&&t==="active"?"bg-amber-500/20 border border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.4)]":"bg-slate-800/50 border border-slate-700/50"}`,children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${i&&t==="active"?"bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse":"bg-slate-600"}`}),e.jsx("span",{className:`text-sm font-bold tracking-wide truncate max-w-[80px] ${i?"text-amber-300":"text-slate-500"}`,children:l}),e.jsx(jt,{shape:u.shape,glowColor:u.glowColor,size:"small"}),e.jsx("span",{className:"text-xs text-slate-600",children:b})]})}),e.jsx("div",{className:"text-slate-600 text-xs font-bold px-3",children:"VS"}),e.jsx("div",{className:`flex-1 px-3 py-2 rounded-lg transition-all duration-300 ${!i&&t==="active"?"bg-orange-500/20 border border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.4)]":"bg-slate-800/50 border border-slate-700/50"}`,children:e.jsxs("div",{className:"flex items-center gap-2 justify-end",children:[e.jsx("span",{className:"text-xs text-slate-600",children:f}),e.jsx(jt,{shape:w.shape,glowColor:w.glowColor,size:"small"}),e.jsx("span",{className:`text-sm font-bold tracking-wide truncate max-w-[80px] ${!i&&t==="active"?"text-orange-300":"text-slate-500"}`,children:y}),e.jsx("div",{className:`w-3 h-3 rounded-full flex-shrink-0 transition-all duration-300 ${!i&&t==="active"?"bg-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse":"bg-slate-600"}`})]})})]})})},Es=({gameId:r,onLeave:o,onNavigateToGame:i})=>{const{user:t,profile:b}=Xt(),{needsScroll:f}=Zt(700),[u,w]=s.useState(r),[l,y]=s.useState(null),[v,j]=s.useState(Array(S).fill(null).map(()=>Array(S).fill(null))),[R,M]=s.useState({}),[T,$]=s.useState([]),[E,V]=s.useState(null),[g,Ne]=s.useState(!1),[O,W]=s.useState(null),[q,U]=s.useState(null),[d,ee]=s.useState(null),[A,ne]=s.useState(0),[Q,ie]=s.useState(!1),[he,X]=s.useState(!0),[ae,xe]=s.useState(null),[Ee,Oe]=s.useState(null),[m,N]=s.useState(!1),[G,te]=s.useState(null),[pe,et]=s.useState(null),[We,Be]=s.useState(null),[qe,oe]=s.useState(!1),[ue,Qe]=s.useState(null),[_e,Ye]=s.useState(!1),[kt,ge]=s.useState(!1),[Ae,Ue]=s.useState(!1),[tt,Fe]=s.useState(!1),[pt,st]=s.useState(null),[He,St]=s.useState(!1),[ks,Rt]=s.useState(!1),[D,Ce]=s.useState(!1),[me,fe]=s.useState(!1),[at,Ge]=s.useState(null),[Mt,Tt]=s.useState(null),[Ss,gt]=s.useState(!1),[Y,rt]=s.useState(!1),[ce,nt]=s.useState(null),[$t,Ve]=s.useState({x:0,y:0}),[Pt,ot]=s.useState({x:0,y:0}),[Et,lt]=s.useState(!1),[Ie,it]=s.useState(null),B=s.useRef(null),be=s.useRef(null),we=s.useRef(!1),Ot=s.useRef(Date.now()),ye=s.useRef(!1),De=s.useRef(null),se=s.useRef(!0),bt=s.useRef({}),{animation:ke,triggerAnimation:Se,clearAnimation:Bt}=_s(),Re=t?.id,ct=T.length>0,wt=s.useCallback((a,c)=>{if(!be.current)return null;const{left:h,top:n,width:P,height:I}=be.current,C=P/S,_=I/S,le=typeof window<"u"&&window.innerWidth<640?40:20,Z=a-h,L=c-le-n,J=Math.floor(Z/C),x=Math.floor(L/_),k=4;return x>=-k&&x<S+k&&J>=-k&&J<S+k?{row:x,col:J}:null},[]),dt=s.useCallback((a,c,h,n)=>{if(we.current||l?.status!=="active"||T.includes(a)||!g)return;const P=c-(n.left+n.width/2),I=h-(n.top+n.height/2);we.current=!0,nt(a),Ve({x:c,y:h}),ot({x:P,y:I}),rt(!0),U(a),ee(null),p.playPieceSelect(),document.body.style.overflow="hidden",document.body.style.touchAction="none"},[l?.status,T,g]),At=s.useCallback((a,c,h,n)=>{if(we.current||l?.status!=="active"||!g)return;const P=n?c-(n.left+n.width/2):0,I=n?h-(n.top+n.height/2):0;we.current=!0,B.current&&(be.current=B.current.getBoundingClientRect()),nt(a),Ve({x:c,y:h}),ot({x:P,y:I}),rt(!0),p.playPieceSelect(),document.body.style.overflow="hidden",document.body.style.touchAction="none"},[l?.status,g]),Me=s.useCallback((a,c)=>{if(!Y||!ce)return;Ve({x:a,y:c}),B.current&&(be.current=B.current.getBoundingClientRect());const h=wt(a,c);if(h){const n=Xe(ce,A,Q),P=Math.min(...n.map(([x])=>x)),I=Math.max(...n.map(([x])=>x)),C=Math.min(...n.map(([,x])=>x)),_=Math.max(...n.map(([,x])=>x)),F=Math.floor((I+P)/2),le=Math.floor((_+C)/2),Z=h.row-le,L=h.col-F;it({row:Z,col:L});const J=ft(v,Z,L,n);lt(J)}else it(null),lt(!1)},[Y,ce,A,Q,v,wt]),ve=s.useCallback(()=>{Y&&(Ie&&ce&&ee({piece:ce,row:Ie.row,col:Ie.col}),rt(!1),nt(null),Ve({x:0,y:0}),ot({x:0,y:0}),lt(!1),it(null),we.current=!1,document.body.style.overflow="",document.body.style.touchAction="")},[Y,Ie,ce]),Ft=s.useCallback(a=>{if(l?.status!=="active"||T.includes(a)||!g)return{};let c=null;return{onTouchStart:C=>{const _=C.touches?.[0];_&&(c=C.currentTarget?.getBoundingClientRect()||null,B?.current&&(be.current=B.current.getBoundingClientRect()),dt(a,_.clientX,_.clientY,c))},onTouchMove:C=>{we.current&&C.touches?.[0]&&(C.preventDefault(),Me(C.touches[0].clientX,C.touches[0].clientY))},onTouchEnd:C=>{we.current&&(C.preventDefault(),ve())},onMouseDown:C=>{C.button===0&&(c=C.currentTarget?.getBoundingClientRect()||null,B?.current&&(be.current=B.current.getBoundingClientRect()),dt(a,C.clientX,C.clientY,c))}}},[l?.status,T,g,dt,Me,ve]);s.useEffect(()=>{if(!Y)return;const a=h=>Me(h.clientX,h.clientY),c=()=>ve();return window.addEventListener("mousemove",a),window.addEventListener("mouseup",c),()=>{window.removeEventListener("mousemove",a),window.removeEventListener("mouseup",c)}},[Y,Me,ve]),s.useEffect(()=>{if(!Y)return;const a=n=>{n.touches?.[0]&&(Me(n.touches[0].clientX,n.touches[0].clientY),n.cancelable&&n.preventDefault())},c=()=>ve(),h=()=>ve();return window.addEventListener("touchmove",a,{passive:!1}),window.addEventListener("touchend",c),window.addEventListener("touchcancel",h),()=>{window.removeEventListener("touchmove",a),window.removeEventListener("touchend",c),window.removeEventListener("touchcancel",h)}},[Y,Me,ve]),s.useEffect(()=>{if(!m||!r||!t?.id)return;let a,c=!0;const h=async()=>{if(c)try{const{data:n}=await Te.getRematchRequestByGame(r,t.id);if(!c)return;if(n){Qe(n);const P=n.from_user_id===t.id;if(Ye(P),n.status==="accepted"&&n.new_game_id){Ue(!0),oe(!1),p.playSound("notification"),st(n.new_game_id),w(n.new_game_id),y(null),X(!0),N(!1),ge(!1),Qe(null),Ye(!1),Fe(!1),j(Array(S).fill(null).map(()=>Array(S).fill(null))),M({}),$([]),U(null),ee(null),ne(0),ie(!1);return}if(n.status==="declined"){Fe(!0),ge(!1);return}n.status==="pending"&&(!P&&!qe&&!tt&&(oe(!0),p.playSound("notification")),P&&!Ae&&(ge(!0),qe||oe(!0)))}else ue&&!Ae&&ue.status==="pending"&&_e&&(Fe(!0),ge(!1))}catch(n){console.error("[OnlineGameScreen] Rematch poll error:",n)}};return h(),a=setInterval(h,2e3),()=>{c=!1,a&&clearInterval(a)}},[m,r,t?.id,qe,tt,Ae,_e]),s.useEffect(()=>()=>{document.body.style.overflow="",document.body.style.touchAction=""},[]),s.useEffect(()=>{B.current&&(be.current=B.current.getBoundingClientRect())},[v]);const ut=s.useMemo(()=>{if(!d)return!1;const a=Xe(d.piece,A,Q);return ft(v,d.row,d.col,a)},[d,A,Q,v]),Le=s.useCallback((a,c)=>{if(!a||!se.current)return;let h=a.board;!Array.isArray(h)||h.length!==S?h=Array(S).fill(null).map(()=>Array(S).fill(null)):h=h.map(_=>_.map(F=>F===0?null:F));const n=a.board_pieces||{},P=bt.current,I=Object.keys(n).filter(_=>!P[_]);let C=!1;if(c&&I.length>0&&!ye.current){const _=a.player1_id===c?1:2,F=_===1?2:1,le=a.current_player===_&&a.status==="active",Z=a.status==="completed";if((le||Z)&&B.current){C=!0;const L=I.map(k=>{const[K,H]=k.split(",").map(Number);return{row:K,col:H}}),x=B.current.getBoundingClientRect().width/S;setTimeout(()=>{Se(L,F,B,x)},100)}}if(bt.current=n,y(a),j(h),M(n),$(Array.isArray(a.used_pieces)?a.used_pieces:[]),a.turn_started_at&&Tt(a.turn_started_at),c){const _=a.player1_id===c?1:2;V(_);const F=_===1?a.player2:a.player1;W(F);const le=a.current_player===_&&a.status==="active",Z=g;if(Ne(le),le&&!Z&&(Ot.current=Date.now(),p.playSound("notification")),a.status==="completed"&&!m&&!He){const L=a.winner_id===c,J={isWin:L,winnerId:a.winner_id,reason:a.winner_id?"normal":"draw"};Be(J),C?setTimeout(()=>{se.current&&(N(!0),p.playSound(L?"win":"lose"))},1200):(N(!0),p.playSound(L?"win":"lose"))}}},[g,m,He,Se]);s.useEffect(()=>{if(!u||!Re)return;se.current=!0;const a=setTimeout(()=>{se.current&&he&&(xe("Loading took too long. Please try again."),X(!1))},15e3);(async()=>{try{const{data:n,error:P}=await de.getGame(u);if(!se.current)return;if(clearTimeout(a),P){xe("Failed to load game: "+(P.message||"Unknown error")),X(!1);return}if(!n){xe("Game not found"),X(!1);return}Le(n,Re),X(!1);const I=n.player1_id===Re?1:2,C=n.current_player===I&&n.status==="active";if(n.used_pieces&&n.used_pieces.length>0&&C){const{data:F}=await de.getLastMove(u);if(F&&F.player_id!==Re){const le=I===1?2:1;setTimeout(()=>{if(!se.current||!B.current)return;const Z=vt[F.piece_type];if(!Z)return;let L=[...Z];const J=F.rotation||0,x=F.flipped||!1;for(let z=0;z<J;z++)L=L.map(([je,Yt])=>[-Yt,je]);x&&(L=L.map(([z,je])=>[-z,je]));const k=L.map(([z,je])=>({row:F.row+je,col:F.col+z})).filter(z=>z.row>=0&&z.row<S&&z.col>=0&&z.col<S),H=B.current.getBoundingClientRect().width/S;Se(k,le,B,H)},500)}}}catch(n){se.current&&(clearTimeout(a),xe("Error loading game: "+n.message),X(!1))}})();const h=de.subscribeToGame(u,n=>{if(se.current&&!(!n||n.id!==u)){if(De.current!==null){if((n.used_pieces?.length||0)<De.current)return;De.current=null}ye.current||(Le(n,Re),gt(!0))}},n=>{console.error("[OnlineGameScreen] Subscription error:",n),gt(!1)});return()=>{se.current=!1,clearTimeout(a),h&&h.unsubscribe()}},[u,Re,Le]),s.useEffect(()=>{if(l?.status==="completed"&&t?.id&&!m&&!He){const c=(l.player1_id===t.id?1:2)===1?l.result_viewed_p1:l.result_viewed_p2;if(l._isUnviewedResult===!0||c===!1){console.log("[OnlineGameScreen] Unviewed completed game detected"),St(!0),Rt(!0),de.markResultViewed(u,t.id);const n=l.winner_id===t.id;Be({isWin:n,winnerId:l.winner_id,reason:"normal"}),setTimeout(()=>{se.current&&(N(!0),p.playSound(n?"win":"lose"))},5e3)}}},[l?.status,l?.winner_id,l?._isUnviewedResult,t?.id,u,m,He]),s.useEffect(()=>{if(!u||!t?.id||!Pe)return;const a=Pe.channel(`chat-notify-${u}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"game_chat",filter:`game_id=eq.${u}`},c=>{if(c.new.sender_id!==t.id&&!D){fe(!0),p.playSound("notification");const h=O?.display_name||O?.username||"Opponent",n=c.new.message||c.new.quick_message||"Sent a message",P=Date.now();Ge({senderName:h,message:n,timestamp:P}),setTimeout(()=>{Ge(I=>I?.timestamp===P?null:I)},5e3),cs.notifyChatMessage(h,n,u)}}).subscribe(c=>{});return()=>{a.unsubscribe()}},[u,t?.id,D,O]),s.useEffect(()=>{if(new URLSearchParams(window.location.search).get("openChat")==="true"){Ce(!0),fe(!1),Ge(null),window.history.replaceState({},document.title,window.location.pathname);return}sessionStorage.getItem("deadblock_open_chat")==="true"&&(Ce(!0),fe(!1),Ge(null),sessionStorage.removeItem("deadblock_open_chat"))},[u]),s.useEffect(()=>{if(d){const a=Xe(d.piece,A,Q),c=ft(v,d.row,d.col,a);Oe(c?null:"Invalid placement!")}else Oe(null)},[d,A,Q,v]);const Gt=s.useCallback(a=>{!g||l?.status!=="active"||T.includes(a)||(U(a),ee(null),ne(0),ie(!1),p.playPieceSelect())},[g,l?.status,T]),It=s.useCallback((a,c)=>{Y||!g||l?.status!=="active"||q&&(ee({piece:q,row:a,col:c}),p.playClickSound("neutral"))},[Y,g,l?.status,q]),Dt=s.useCallback(a=>{if(!d)return;const c={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]},[h,n]=c[a],P=Math.max(0,Math.min(S-1,d.row+h)),I=Math.max(0,Math.min(S-1,d.col+n));ee({...d,row:P,col:I}),p.playClickSound("neutral")},[d]),Lt=s.useCallback(()=>{q&&(ne(a=>(a+1)%4),p.playPieceRotate())},[q]),zt=s.useCallback(()=>{q&&(ie(a=>!a),p.playPieceFlip())},[q]),Wt=s.useCallback(()=>{ee(null),p.playButtonClick()},[]),qt=s.useCallback(async()=>{if(!d||!ut||ye.current)return;ye.current=!0;const a=Xe(d.piece,A,Q),c=v.map(x=>[...x]),h={...R};a.forEach(([x,k])=>{const K=d.row+k,H=d.col+x;K>=0&&K<S&&H>=0&&H<S&&(c[K][H]=E,h[`${K},${H}`]=d.piece)});const n=[...T,d.piece],P=E===1?2:1,I=Object.keys(vt).length;let C=!1,_=null,F=null;if(n.length>=I){C=!0,F="all_pieces_placed";let x=0,k=0;for(let K=0;K<S;K++)for(let H=0;H<S;H++)c[K][H]===1?x++:c[K][H]===2&&k++;E===1?_=x>=k?t.id:l.player2_id:_=k>=x?t.id:l.player1_id}else n.length>=2&&(Jt(c,n)||(C=!0,F="opponent_blocked",_=t.id));p.playPiecePlace();const{data:le,error:Z}=await de.makeMove(u,t.id,{pieceType:d.piece,row:d.row,col:d.col,rotation:A,flipped:Q,newBoard:c,newBoardPieces:h,newUsedPieces:n,nextPlayer:P,gameOver:C,winnerId:_});if(Z){if(console.error("Move failed:",Z),C){const x=_===t.id;if(Be({isWin:x,winnerId:_,reason:F||"opponent_blocked"}),j(c),M(h),$(n),y(k=>k&&{...k,status:"completed",winner_id:_}),B.current){const K=B.current.getBoundingClientRect().width/S,H=a.map(([z,je])=>({row:d.row+je,col:d.col+z})).filter(z=>z.row>=0&&z.row<S&&z.col>=0&&z.col<S);Se(H,E,B,K)}setTimeout(()=>{se.current&&(N(!0),p.playSound(x?"win":"lose"))},1200),setTimeout(async()=>{try{const k=await de.makeMove(u,t.id,{pieceType:d.piece,row:d.row,col:d.col,rotation:A,flipped:Q,newBoard:c,newBoardPieces:h,newUsedPieces:n,nextPlayer:P,gameOver:!0,winnerId:_})}catch{}},2e3),ye.current=!1;return}p.playSound("invalid"),ye.current=!1,De.current=null;return}De.current=n.length;const L=a.map(([x,k])=>({row:d.row+k,col:d.col+x})).filter(x=>x.row>=0&&x.row<S&&x.col>=0&&x.col<S);if(B.current){const k=B.current.getBoundingClientRect().width/S;Se(L,E,B,k),p.playSound("place")}if(j(c),M(h),$(n),Ne(!1),U(null),ee(null),ne(0),ie(!1),C){const x=_===t.id;Be({isWin:x,winnerId:_,reason:F||"normal"}),y(k=>k&&{...k,status:"completed",winner_id:_}),setTimeout(()=>{se.current&&(N(!0),p.playSound(x?"win":"lose"))},1200)}setTimeout(()=>{ye.current=!1},500);const{data:J}=await de.getGame(u);J&&se.current&&(J.used_pieces?.length||0)>=n.length&&Le(J,t.id)},[d,ut,A,Q,v,R,T,E,r,t,Le,Se,u]),Qt=s.useCallback(async()=>{if(l?.status==="active")if(ct){if(!window.confirm("Forfeit this game? This will count as a loss."))return;p.playButtonClick(),await de.forfeitGame(u,t.id),Be({isWin:!1,winnerId:O?.id,reason:"forfeit"}),N(!0),p.playSound("lose")}else{if(!window.confirm("Quit this game? No penalty since no moves have been made."))return;p.playButtonClick(),await de.abandonGame(u),o()}},[l?.status,ct,r,t?.id,O?.id,o]),mt=()=>{p.playButtonClick(),o()};return he?e.jsx("div",{className:"min-h-screen bg-transparent flex items-center justify-center",children:e.jsxs("div",{className:"relative text-center",children:[e.jsx("div",{className:"w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"}),e.jsx("p",{className:"text-amber-300 mb-6",children:"Loading game..."}),e.jsx("button",{onClick:mt,className:"px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700",children:"Cancel"})]})}):ae?e.jsx("div",{className:"min-h-screen bg-transparent flex items-center justify-center",children:e.jsxs("div",{className:"text-center",children:[e.jsx("p",{className:"text-red-400 mb-4",children:ae}),e.jsx("button",{onClick:mt,className:"px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700",children:"Game Menu"})]})}):e.jsxs("div",{className:"min-h-screen bg-transparent overflow-x-hidden",style:{overflowY:f?"auto":"hidden",WebkitOverflowScrolling:"touch",overscrollBehaviorY:"contain",touchAction:Y?"none":"pan-y"},children:[e.jsx("div",{className:`fixed top-1/4 right-1/4 w-64 h-64 ${Ze.glow1} rounded-full blur-3xl pointer-events-none`}),e.jsx("div",{className:`fixed bottom-1/4 left-1/4 w-64 h-64 ${Ze.glow2} rounded-full blur-3xl pointer-events-none`}),Y&&ce&&e.jsx(Kt,{isDragging:Y,piece:ce,rotation:A,flipped:Q,position:$t,offset:Pt,isValidDrop:Et}),e.jsx("div",{className:`relative z-10 ${f?"min-h-screen":"h-screen flex flex-col"}`,children:e.jsxs("div",{className:`${f?"":"flex-1 flex flex-col"} max-w-lg mx-auto p-2 sm:p-4`,children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("button",{onClick:mt,className:"px-3 py-1.5 bg-slate-800/80 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-all flex items-center gap-1",children:[e.jsx(es,{size:16}),"Menu"]}),e.jsxs("div",{className:"text-center flex-1 mx-2",children:[e.jsx(ts,{text:"DEADBLOCK",size:"medium",color:"amber"}),e.jsx(ss,{text:"ONLINE BATTLE",color:"amber",size:"small",className:"mt-0"})]}),l?.turn_timer_seconds&&l?.status==="active"?e.jsx(xs,{seconds:l.turn_timer_seconds,turnStartedAt:l.turn_started_at||Mt,isMyTurn:g,onTimeout:()=>{g&&de.forfeitGame(u,t.id)}}):e.jsx("div",{className:"w-16"})]}),e.jsxs("div",{className:`bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl p-2 sm:p-4 mb-2 border ${Ze.panelBorder} ${Ze.panelShadow}`,children:[e.jsx(Cs,{profile:b,opponent:O,isMyTurn:g,gameStatus:l?.status}),e.jsx("div",{className:"flex justify-center pb-4",children:e.jsxs("div",{className:"relative",children:[e.jsx(as,{ref:B,board:v,boardPieces:R,pendingMove:d,rotation:A,flipped:Q,gameOver:l?.status==="completed",gameMode:"online",currentPlayer:E,onCellClick:It,onPendingPieceDragStart:At,isDragging:Y,dragPreviewCell:Ie,draggedPiece:ce,dragRotation:A,dragFlipped:Q}),ke&&e.jsx(Ns,{cells:ke.cells,player:ke.player,boardRef:ke.boardRef,cellSize:ke.cellSize,onComplete:Bt},ke.key)]})}),d&&g&&!Y&&e.jsxs("div",{className:"flex items-start justify-center gap-3 mb-2",children:[e.jsx("div",{className:"flex-shrink-0 w-24",children:Ee&&e.jsx("div",{className:"error-message-box bg-red-900/80 border border-red-500/60 rounded-lg p-2 text-center shadow-[0_0_15px_rgba(239,68,68,0.4)]",children:e.jsx("span",{className:"text-red-300 text-xs font-bold leading-tight block",children:Ee})})}),e.jsx(rs,{onMove:Dt}),e.jsx("div",{className:"flex-shrink-0 w-24 flex justify-center",children:l?.status==="active"&&e.jsxs("button",{onClick:()=>{Ce(!D),D||fe(!1)},className:`
                        relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg transition-all flex items-center justify-center
                        ${D?"bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]":me?"bg-gradient-to-br from-red-500 to-orange-500 text-white":"bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700"}
                      `,style:me&&!D?{animation:"chatBlink 0.8s ease-in-out infinite",boxShadow:"0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.4)"}:{},children:[e.jsx(Je,{size:20,className:me&&!D?"animate-bounce":""}),me&&!D&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white",style:{animation:"bounce 0.5s ease-in-out infinite",boxShadow:"0 0 15px rgba(239,68,68,1)"},children:"!"}),e.jsx("span",{className:"absolute inset-0 rounded-full bg-red-400/50 animate-ping"})]})]})})]}),(!d||!g||Y)&&l?.status==="active"&&e.jsx("div",{className:"flex justify-center mb-3",children:e.jsxs("button",{onClick:()=>{Ce(!D),D||fe(!1)},className:`
                    relative w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg transition-all flex items-center justify-center
                    ${D?"bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]":me?"bg-gradient-to-br from-red-500 to-orange-500 text-white":"bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700"}
                  `,style:me&&!D?{animation:"chatBlink 0.8s ease-in-out infinite",boxShadow:"0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.4)"}:{},children:[e.jsx(Je,{size:20,className:me&&!D?"animate-bounce":""}),me&&!D&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white",style:{animation:"bounce 0.5s ease-in-out infinite",boxShadow:"0 0 15px rgba(239,68,68,1)"},children:"!"}),e.jsx("span",{className:"absolute inset-0 rounded-full bg-red-400/50 animate-ping"})]})]})}),e.jsxs("div",{className:"flex gap-1 mt-3",children:[e.jsx($e,{onClick:()=>{p.playButtonClick(),o()},color:"red",className:"flex-1",children:"Menu"}),e.jsx($e,{onClick:Lt,disabled:!q||!g,color:"cyan",className:"flex-1",children:"Rotate"}),e.jsx($e,{onClick:zt,disabled:!q||!g,color:"purple",className:"flex-1",children:"Flip"}),l?.status==="active"&&e.jsxs($e,{onClick:Qt,color:"slate",className:"flex items-center gap-1 justify-center flex-1",children:[e.jsx(ns,{size:14}),e.jsx("span",{className:"hidden sm:inline",children:ct?"Forfeit":"Quit"})]})]}),d&&e.jsxs("div",{className:"flex gap-2 mt-2",children:[e.jsx($e,{onClick:Wt,color:"slate",className:"flex-1",children:"Cancel"}),e.jsx($e,{onClick:qt,disabled:!ut,color:"green",className:"flex-1",children:"Confirm"})]})]}),e.jsx(os,{usedPieces:T,selectedPiece:q,pendingMove:d,gameOver:l?.status==="completed",gameMode:"online",currentPlayer:E,isMobile:!0,onSelectPiece:Gt,createDragHandlers:Ft,isDragging:Y,draggedPiece:ce})]})}),at&&!D&&e.jsx("div",{className:"fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in duration-300",onClick:()=>{Ce(!0),fe(!1),Ge(null)},children:e.jsx("div",{className:"bg-gradient-to-r from-cyan-600/95 to-blue-600/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-2xl border border-cyan-400/30 cursor-pointer hover:scale-[1.02] transition-transform max-w-[90vw] sm:max-w-sm",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"bg-white/20 rounded-full p-2",children:e.jsx(Je,{size:18,className:"text-white"})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-cyan-100 text-xs font-medium",children:at.senderName}),e.jsx("p",{className:"text-white text-sm truncate",children:at.message})]}),e.jsx("div",{className:"text-cyan-200/60 text-xs",children:"tap to open"})]})})}),D&&l&&e.jsx(hs,{gameId:u,userId:t?.id,opponentName:O?.display_name||O?.username,isOpen:D,onToggle:a=>{Ce(a),a||fe(!1)},hideButton:!0,onNewMessage:()=>{D||fe(!0)}}),m&&We&&e.jsx(ls,{isOpen:m,isWin:We.isWin,isDraw:!We.winnerId,reason:We.reason,gameMode:"online",opponentName:O?.display_name||O?.username||"Opponent",onClose:()=>{N(!1)},onRematch:async()=>{try{const{data:a,error:c}=await Te.createRematchRequest(r,t.id,O?.id);if(c){console.error("[OnlineGameScreen] Rematch request failed:",c),et(c.message||"Could not create rematch request");return}if(a?.game){Ue(!0),st(a.game);const n=a.firstPlayerId===t.id?"You go":`${O?.display_name||O?.username||"Opponent"} goes`;p.playSound("notification"),te(`Rematch starting! ${n} first.`),setTimeout(()=>{N(!1),oe(!1),typeof o=="function"?o():window.location.href=window.location.origin},2e3);return}Qe(a),Ye(!0),ge(!0),oe(!0),p.playSound("notification")}catch(a){console.error("[OnlineGameScreen] Rematch error:",a),et("Failed to request rematch. Please try again.")}},onMenu:()=>{N(!1),typeof o=="function"?o():(console.error("[OnlineGameScreen] onLeave is not a function:",o),window.location.href=window.location.origin)}}),(G||pe)&&e.jsx("div",{className:"fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none",children:e.jsx("div",{className:`
              px-6 py-4 rounded-xl shadow-2xl max-w-sm mx-4 text-center
              ${pe?"bg-red-900/90 border border-red-500/50 text-red-100":"bg-gradient-to-r from-amber-500/90 to-orange-500/90 border border-amber-400/50 text-white"}
              backdrop-blur-sm animate-pulse
            `,children:e.jsx("div",{className:"flex items-center justify-center gap-2",children:pe?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-2xl",children:"❌"}),e.jsx("span",{className:"font-medium",children:pe})]}):e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"text-2xl",children:"⚔️"}),e.jsx("span",{className:"font-bold",children:G})]})})})}),e.jsx(fs,{isOpen:qe,onClose:()=>{oe(!1),_e&&ue?.id&&!Ae&&Te.cancelRematchRequest(ue.id,t.id)},onBackToMenu:()=>{oe(!1),N(!1),typeof o=="function"&&o()},onAccept:async()=>{if(!ue?.id)return;const{data:a,error:c}=await Te.acceptRematchRequest(ue.id,t.id);if(c){et(c.message);return}a?.game&&(Ue(!0),st(a.game),p.playSound("notification"),setTimeout(()=>{oe(!1),N(!1),i?i(a.game):(ge(!1),Qe(null),Ye(!1),Fe(!1),Ue(!1),j(Array(S).fill(null).map(()=>Array(S).fill(null))),M({}),$([]),U(null),ee(null),ne(0),ie(!1),y(null),X(!0),w(a.game.id))},1e3))},onDecline:async()=>{if(!ue?.id){oe(!1);return}_e?(await Te.cancelRematchRequest(ue.id,t.id),ge(!1),oe(!1)):(await Te.declineRematchRequest(ue.id,t.id),Fe(!0),oe(!1))},isRequester:_e,requesterName:_e?"You":O?.display_name||O?.username||"Opponent",isWaiting:kt,opponentAccepted:Ae,opponentDeclined:tt,error:pe,firstPlayerName:pt?pt.player1_id===t.id?"You go":`${O?.display_name||O?.username||"Opponent"} goes`:null})]})};export{Es as default};
