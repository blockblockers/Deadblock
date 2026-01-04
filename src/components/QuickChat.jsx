// QuickChat - In-game emotes, quick messages, and custom text
// UPDATED: Added custom text message input tab
// UPDATED: Added onNewMessage callback for notification support
// UPDATED: Enhanced received message notification with screen flash
// Place in src/components/QuickChat.jsx

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'emote', or 'type'
  const [recentMessages, setRecentMessages] = useState([]);
  const [showBubble, setShowBubble] = useState(null);
  const [showFlash, setShowFlash] = useState(false); // Screen flash effect
  const [cooldown, setCooldown] = useState(false);
  const [customText, setCustomText] = useState('');
  const subscriptionRef = useRef(null);
  const bubbleTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when switching to type tab
  useEffect(() => {
    if (activeTab === 'type' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab]);

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
        const display = chatService.getMessageDisplay(
          newMessage.message_type, 
          newMessage.message_key,
          newMessage.message // Pass custom message text
        );
        
        // Trigger screen flash
        setShowFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setShowFlash(false), 500);
        
        // Show bubble
        setShowBubble(display);
        
        // Play notification sound (multiple times for emphasis)
        soundManager.playSound?.('notification');
        setTimeout(() => soundManager.playSound?.('notification'), 200);
        
        // Vibrate on mobile if supported
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        }
        
        // Notify parent component
        onNewMessage?.(true);
        
        // Auto-dismiss bubble after 6 seconds
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        bubbleTimeoutRef.current = setTimeout(() => setShowBubble(null), 6000);
      }
    });

    return () => {
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
            
            const display = chatService.getMessageDisplay(
              latestMessage.message_type, 
              latestMessage.message_key,
              latestMessage.message
            );
            
            // Only show if bubble isn't already showing
            if (!showBubble) {
              setShowFlash(true);
              setTimeout(() => setShowFlash(false), 500);
              setShowBubble(display);
              soundManager.playSound?.('notification');
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

    soundManager.playClickSound?.('soft');
    
    // Show "sent" feedback
    setSentMessage(display);
    if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
    sentTimeoutRef.current = setTimeout(() => {
      setSentMessage(null);
      setIsOpen(false);
    }, 1500);
  };

  const sendCustomMessage = async () => {
    if (cooldown || disabled || !customText.trim()) return;

    const messageText = customText.trim();
    
    // Start cooldown (2 seconds between messages)
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    // Clear input immediately for better UX
    setCustomText('');

    // Send the message
    const { error } = await chatService.sendCustomMessage(gameId, userId, messageText);
    
    if (error) {
      console.error('[QuickChat] Failed to send custom message:', error);
      // Show error feedback
      setSentMessage({ icon: '❌', text: 'Failed to send' });
      if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
      sentTimeoutRef.current = setTimeout(() => {
        setSentMessage(null);
      }, 2000);
      return;
    }

    soundManager.playClickSound?.('soft');
    
    // Show "sent" feedback
    setSentMessage({ icon: '💬', text: messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '') });
    if (sentTimeoutRef.current) clearTimeout(sentTimeoutRef.current);
    sentTimeoutRef.current = setTimeout(() => {
      setSentMessage(null);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCustomMessage();
    }
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
          <div className="relative bg-gradient-to-br from-amber-900 via-slate-800 to-slate-900 border-2 border-amber-500 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(251,191,36,0.5)] flex flex-col items-center gap-1 max-w-xs">
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
                <span className="text-white text-lg font-bold text-center break-words">{showBubble.text}</span>
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
          <div className="bg-green-800 border-2 border-green-500 rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-3 max-w-xs">
            <span className="text-green-400 text-sm font-bold">SENT!</span>
            <span className="text-2xl">{sentMessage.icon}</span>
            {sentMessage.text && (
              <span className="text-green-200 text-base font-medium break-words">{sentMessage.text}</span>
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

      {/* Chat Panel - UPDATED: Added Type tab for custom messages */}
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
          
          {/* Tabs - Now with 3 options */}
          <div className="flex border-b border-amber-500/20">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quick
            </button>
            <button
              onClick={() => setActiveTab('emote')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'emote' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Emotes
            </button>
            <button
              onClick={() => setActiveTab('type')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === 'type' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Type ✏️
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
            ) : activeTab === 'emote' ? (
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
            ) : (
              /* Custom Message Input Tab */
              <div className="space-y-3">
                <p className="text-xs text-slate-400 text-center">
                  Type a short message (max 200 chars)
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value.slice(0, 200))}
                    onKeyDown={handleKeyDown}
                    placeholder={cooldown ? 'Wait...' : 'Type message...'}
                    disabled={cooldown || disabled}
                    className={`
                      flex-1 px-3 py-2 bg-slate-800 border rounded-lg 
                      text-sm text-white placeholder-slate-500
                      focus:outline-none focus:ring-1 transition-all
                      ${cooldown || disabled
                        ? 'border-slate-700 cursor-not-allowed opacity-50'
                        : 'border-slate-600 focus:border-amber-500/50 focus:ring-amber-500/30'
                      }
                    `}
                    maxLength={200}
                  />
                  <button
                    onClick={sendCustomMessage}
                    disabled={cooldown || disabled || !customText.trim()}
                    className={`
                      p-2 rounded-lg transition-all
                      ${cooldown || disabled || !customText.trim()
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400'
                      }
                    `}
                  >
                    <Send size={18} />
                  </button>
                </div>
                {customText.length > 0 && (
                  <div className="text-right">
                    <span className={`text-xs ${customText.length >= 200 ? 'text-red-400' : 'text-slate-500'}`}>
                      {customText.length}/200
                    </span>
                  </div>
                )}
                
                {/* Cooldown indicator */}
                {cooldown && (
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500/50 animate-pulse"
                      style={{ width: '100%', animation: 'shrink 2s linear forwards' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent messages */}
          {recentMessages.length > 0 && (
            <div className="border-t border-amber-500/20 p-2 max-h-28 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1">Recent</p>
              <div className="space-y-1">
                {recentMessages.slice(-5).map((msg, i) => {
                  const display = chatService.getMessageDisplay(
                    msg.message_type, 
                    msg.message_key,
                    msg.message
                  );
                  const isMe = msg.user_id === userId;
                  return (
                    <div 
                      key={msg.id || i} 
                      className={`text-xs flex items-start gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <span className={`shrink-0 ${isMe ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {isMe ? 'You' : (opponentName?.slice(0, 8) || 'Opp')}:
                      </span>
                      <span className="shrink-0">{display.icon}</span>
                      {display.text && (
                        <span className="text-slate-400 break-words max-w-[150px]">
                          {display.text.slice(0, 40)}{display.text.length > 40 ? '...' : ''}
                        </span>
                      )}
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
        @keyframes shrink {
          0% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </>
  );
};

export default QuickChat;
