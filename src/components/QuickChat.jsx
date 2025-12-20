// QuickChat - In-game emotes and quick messages
// UPDATED: Added external control props (isOpen, onToggle, hideButton)
// UPDATED: Added onNewMessage callback for notification support
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
  const [cooldown, setCooldown] = useState(false);
  const subscriptionRef = useRef(null);
  const bubbleTimeoutRef = useRef(null);

  // Subscribe to chat messages
  useEffect(() => {
    if (!gameId) return;

    // Load existing messages
    chatService.getChatHistory(gameId).then(({ data }) => {
      if (data) setRecentMessages(data.slice(-10));
    });

    // Subscribe to new messages
    subscriptionRef.current = chatService.subscribeToChat(gameId, (newMessage) => {
      setRecentMessages(prev => [...prev.slice(-9), newMessage]);
      
      // Show bubble for opponent's messages
      if (newMessage.user_id !== userId) {
        const display = chatService.getMessageDisplay(newMessage.message_type, newMessage.message_key);
        setShowBubble(display);
        soundManager.playSound('notification');
        
        // Notify parent component about new opponent message
        onNewMessage?.(true);
        
        // Clear after 3 seconds
        if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
        bubbleTimeoutRef.current = setTimeout(() => setShowBubble(null), 3000);
      }
    });

    return () => {
      if (subscriptionRef.current) {
        chatService.unsubscribeFromChat(subscriptionRef.current);
      }
      if (bubbleTimeoutRef.current) {
        clearTimeout(bubbleTimeoutRef.current);
      }
    };
  }, [gameId, userId, onNewMessage]);

  const sendMessage = async (type, key) => {
    if (cooldown || disabled) return;

    // Start cooldown (2 seconds between messages)
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    if (type === 'chat') {
      await chatService.sendQuickChat(gameId, userId, key);
    } else {
      await chatService.sendEmote(gameId, userId, key);
    }

    soundManager.playClickSound('soft');
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Bubble (opponent's message) */}
      {showBubble && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in"
          style={{ animation: 'bounceIn 0.3s ease-out' }}
        >
          <div className="bg-slate-800 border border-amber-500/50 rounded-2xl px-4 py-2 shadow-lg flex items-center gap-2">
            <span className="text-xl">{showBubble.icon}</span>
            {showBubble.text && (
              <span className="text-amber-200 text-sm font-medium">{showBubble.text}</span>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800" />
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
      `}</style>
    </>
  );
};

export default QuickChat;
