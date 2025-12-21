// QuickChat - In-game emotes and quick messages
// UPDATED: Added external control props (isOpen, onToggle, hideButton)
// UPDATED: Added onNewMessage callback for notification support
// UPDATED: Enhanced received message notification with screen flash
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { chatService, QUICK_CHAT_MESSAGES, EMOTES } from '../services/chatService';
import { soundManager } from '../utils/soundManager';

const QuickChat = ({ 
  gameId, 
  userId, 
  opponentName, 
  disabled = false,
  // External control props
  isOpen: externalIsOpen,
  onToggle: externalOnToggle,
  hideButton = false,
  // Notification callback
  onNewMessage
}) => {
  // Use internal state if not externally controlled
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Determine if we're externally controlled
  const isControlled = externalIsOpen !== undefined && externalOnToggle !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;
  const setIsOpen = isControlled ? externalOnToggle : setInternalIsOpen;
  
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'emote'
  const [recentMessages, setRecentMessages] = useState([]);
  const [showBubble, setShowBubble] = useState(null);
  const [showFlash, setShowFlash] = useState(false); // Screen flash effect
  const [cooldown, setCooldown] = useState(false);
  const subscriptionRef = useRef(null);
  const bubbleTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  // Subscribe to chat messages
  useEffect(() => {
    if (!gameId) {
      console.log('[QuickChat] No gameId, skipping subscription');
      return;
    }

    console.log('[QuickChat] Setting up subscription for game:', gameId, 'userId:', userId);

    // Load existing messages
    chatService.getChatHistory(gameId).then(({ data }) => {
      if (data) {
        console.log('[QuickChat] Loaded', data.length, 'existing messages');
        setRecentMessages(data.slice(-10));
      }
    });

    // Subscribe to new messages
    subscriptionRef.current = chatService.subscribeToChat(gameId, (newMessage) => {
      console.log('[QuickChat] 📨 New message received:', newMessage);
      setRecentMessages(prev => [...prev.slice(-9), newMessage]);
      
      // Show bubble for opponent's messages
      if (newMessage.user_id !== userId) {
        console.log('[QuickChat] 🔔 OPPONENT MESSAGE - Showing notification!');
        const display = chatService.getMessageDisplay(newMessage.message_type, newMessage.message_key);
        
        // Trigger screen flash
        setShowFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setShowFlash(false), 500);
        
        // Show bubble
        setShowBubble(display);
        
        // Play notification sound (multiple times for emphasis)
        soundManager.playSound('notification');
        setTimeout(() => soundManager.playSound('notification'), 200);
        
        // Vibrate on mobile if supported
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        }
        
        // Notify parent component about new opponent message
        onNewMessage?.(true);
        
        // Clear bubble after 6 seconds
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        bubbleTimeoutRef.current = setTimeout(() => setShowBubble(null), 6000);
      } else {
        console.log('[QuickChat] Own message, no notification');
      }
    });

    return () => {
      console.log('[QuickChat] Cleaning up subscription');
      if (subscriptionRef.current) {
        chatService.unsubscribeFromChat(subscriptionRef.current);
      }
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [gameId, userId, onNewMessage]);

  // FALLBACK: Poll for new messages every 5 seconds in case realtime isn't working
  const lastMessageIdRef = useRef(null);
  
  useEffect(() => {
    if (!gameId || !userId) return;
    
    const pollForNewMessages = async () => {
      const { data } = await chatService.getChatHistory(gameId);
      if (data && data.length > 0) {
        const latestMessage = data[data.length - 1];
        
        // Check if this is a new message we haven't seen
        if (lastMessageIdRef.current && latestMessage.id !== lastMessageIdRef.current) {
          // Check if it's from opponent
          if (latestMessage.user_id !== userId) {
            console.log('[QuickChat] 🔄 POLL: Found new opponent message!', latestMessage.id);
            
            const display = chatService.getMessageDisplay(latestMessage.message_type, latestMessage.message_key);
            
            // Only show if bubble isn't already showing
            if (!showBubble) {
              setShowFlash(true);
              setTimeout(() => setShowFlash(false), 500);
              setShowBubble(display);
              soundManager.playSound('notification');
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              onNewMessage?.(true);
              
              if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
              bubbleTimeoutRef.current = setTimeout(() => setShowBubble(null), 6000);
            }
          }
        }
        
        lastMessageIdRef.current = latestMessage.id;
      }
    };
    
    // Initial load to set the last message ID
    chatService.getChatHistory(gameId).then(({ data }) => {
      if (data && data.length > 0) {
        lastMessageIdRef.current = data[data.length - 1].id;
      }
    });
    
    // Poll every 5 seconds as fallback
    const pollInterval = setInterval(pollForNewMessages, 5000);
    
    return () => clearInterval(pollInterval);
  }, [gameId, userId, showBubble, onNewMessage]);

  // State for showing "message sent" feedback
  const [sentMessage, setSentMessage] = useState(null);
  const sentTimeoutRef = useRef(null);

  const sendMessage = async (type, key) => {
    if (cooldown || disabled) return;

    // Start cooldown (2 seconds between messages)
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    // Get the message display info for feedback
    const display = chatService.getMessageDisplay(type, key);
    
    if (type === 'chat') {
      await chatService.sendQuickChat(gameId, userId, key);
    } else {
      await chatService.sendEmote(gameId, userId, key);
    }

    soundManager.playClickSound('soft');
    
    // Show "sent" feedback
    setSentMessage(display);
    if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
    sentTimeoutRef.current = setTimeout(() => {
      setSentMessage(null);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <>
      {/* SCREEN FLASH - Full screen amber flash when message received */}
      {showFlash && (
        <div 
          className="fixed inset-0 z-[100] pointer-events-none bg-amber-500/40"
          style={{ animation: 'flashPulse 0.5s ease-out' }}
        />
      )}
      
      {/* Chat Bubble (opponent's message) - ENHANCED for visibility */}
      {showBubble && (
        <div 
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50"
          style={{ animation: 'bounceIn 0.4s ease-out' }}
        >
          {/* Outer glow effect */}
          <div className="absolute inset-0 bg-amber-500/30 rounded-2xl blur-xl animate-pulse" />
          
          {/* Main bubble */}
          <div className="relative bg-gradient-to-br from-amber-900 via-slate-800 to-slate-900 border-2 border-amber-500 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(251,191,36,0.5)] flex flex-col items-center gap-1">
            {/* "From opponent" label */}
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-wide">
                {opponentName || 'Opponent'} says:
              </span>
            </div>
            
            {/* Message content - larger */}
            <div className="flex items-center gap-3">
              <span className="text-3xl">{showBubble.icon}</span>
              {showBubble.text && (
                <span className="text-white text-lg font-bold">{showBubble.text}</span>
              )}
            </div>
          </div>
          
          {/* Speech bubble pointer */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-transparent border-t-amber-500" />
        </div>
      )}

      {/* Sent Message Confirmation (your message) */}
      {sentMessage && (
        <div 
          className="fixed top-32 left-1/2 -translate-x-1/2 z-50"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="bg-green-800 border-2 border-green-500 rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-3">
            <span className="text-green-400 text-sm font-bold">SENT!</span>
            <span className="text-2xl">{sentMessage.icon}</span>
            {sentMessage.text && (
              <span className="text-green-200 text-base font-medium">{sentMessage.text}</span>
            )}
          </div>
        </div>
      )}

      {/* Chat Button - only show if not hidden by parent */}
      {!hideButton && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            fixed top-20 right-4 z-40 p-2.5 rounded-full shadow-lg transition-all
            ${isOpen 
              ? 'bg-amber-500 text-slate-900' 
              : 'bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
          {cooldown && (
            <div className="absolute inset-0 rounded-full border-2 border-amber-400 animate-ping" />
          )}
        </button>
      )}

      {/* Chat Panel - UPDATED: Position relative to trigger button */}
      {isOpen && (
        <div 
          className={`fixed z-40 w-72 bg-slate-900 border border-amber-500/30 rounded-xl shadow-xl overflow-hidden`}
          style={{
            // Position near the chat button - right side, lower on screen
            right: '1rem',
            bottom: hideButton ? '8rem' : '12rem',
          }}
        >
          {/* Header with close button when externally controlled */}
          {hideButton && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20 bg-slate-800/50">
              <span className="text-sm font-medium text-amber-300">Quick Chat</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          {/* Tabs */}
          <div className="flex border-b border-amber-500/20">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quick Chat
            </button>
            <button
              onClick={() => setActiveTab('emote')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'emote' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Emotes
            </button>
          </div>

          {/* Content */}
          <div className="p-2 max-h-64 overflow-y-auto">
            {activeTab === 'chat' ? (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(QUICK_CHAT_MESSAGES).map(([key, { text, icon }]) => (
                  <button
                    key={key}
                    onClick={() => sendMessage('chat', key)}
                    disabled={cooldown}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg text-left transition-all
                      bg-slate-800 hover:bg-slate-700 border border-slate-700
                      ${cooldown ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500/30'}
                    `}
                  >
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs text-slate-300 truncate">{text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(EMOTES).map(([key, emoji]) => (
                  <button
                    key={key}
                    onClick={() => sendMessage('emote', key)}
                    disabled={cooldown}
                    className={`
                      p-3 rounded-lg text-2xl transition-all
                      bg-slate-800 hover:bg-slate-700 border border-slate-700
                      ${cooldown ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500/30 hover:scale-110'}
                    `}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent messages */}
          {recentMessages.length > 0 && (
            <div className="border-t border-amber-500/20 p-2 max-h-24 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">Recent</p>
              <div className="space-y-1">
                {recentMessages.slice(-3).map((msg, i) => {
                  const display = chatService.getMessageDisplay(msg.message_type, msg.message_key);
                  const isMe = msg.user_id === userId;
                  return (
                    <div 
                      key={msg.id || i} 
                      className={`text-xs flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <span className={isMe ? 'text-amber-400' : 'text-cyan-400'}>
                        {isMe ? 'You' : opponentName}:
                      </span>
                      <span>{display.icon}</span>
                      {display.text && <span className="text-slate-400">{display.text}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
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
      `}</style>
    </>
  );
};

export default QuickChat;
