
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, MessageSquare, ChevronUp, X, User } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';

interface IncomingCallOverlayProps {
  caller: {
    username: string;
    avatar_url: string | null;
    id: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  onSendMessage: (text: string) => void;
}

const QUICK_MESSAGES = [
  "Je te rappelle plus tard",
  "Je suis en réunion",
  "Je ne peux pas parler pour le moment",
  "Appelle-moi dans 10 minutes"
];

const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({ 
  caller, 
  onAccept, 
  onDecline, 
  onSendMessage 
}) => {
  const [showQuickMessages, setShowQuickMessages] = useState(false);

  const handleDragEnd = (event: any, info: any, action: 'accept' | 'decline') => {
    // Swipe up detection (negative y offset)
    if (info.offset.y < -80) {
      if (action === 'accept') onAccept();
      else onDecline();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0f172a] flex flex-col items-center justify-between py-24 px-6 text-white overflow-hidden animate-in fade-in duration-500">
      {/* Caller Info */}
      <div className="flex flex-col items-center text-center mt-12">
        <h1 className="text-5xl font-bold mb-2 tracking-tight">{caller.username}</h1>
        <p className="text-slate-400 text-xl font-medium opacity-60">@{caller.username.toLowerCase().replace(/\s+/g, '')}</p>
        
        <div className="mt-20 relative">
          <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-white/5 bg-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <img 
              src={caller.avatar_url || DEFAULT_AVATAR} 
              alt={caller.username}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Animated Arrows */}
      <div className="flex flex-col items-center mb-[-40px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: [0, 1, 0],
              y: [20, 0, -20]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
            className="flex flex-col items-center"
          >
            <ChevronUp size={56} strokeWidth={2.5} className="text-white/30 -mb-8" />
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md flex items-center justify-around px-4 mb-12">
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            drag="y"
            dragConstraints={{ top: -300, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, info) => handleDragEnd(e, info, 'decline')}
            whileDrag={{ scale: 1.1 }}
            className="w-24 h-24 rounded-full bg-[#ff0033] flex items-center justify-center shadow-2xl shadow-red-500/40 cursor-grab active:cursor-grabbing"
          >
            <PhoneOff size={36} className="rotate-[135deg]" />
          </motion.div>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            drag="y"
            dragConstraints={{ top: -300, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, info) => handleDragEnd(e, info, 'accept')}
            whileDrag={{ scale: 1.1 }}
            className="w-24 h-24 rounded-full bg-[#10b981] flex items-center justify-center shadow-2xl shadow-emerald-500/40 cursor-grab active:cursor-grabbing"
          >
            <Phone size={36} />
          </motion.div>
        </div>

        {/* Message Button */}
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => setShowQuickMessages(true)}
            className="w-24 h-24 rounded-full bg-[#262d35] flex items-center justify-center shadow-2xl hover:bg-slate-700 transition-colors"
          >
            <MessageSquare size={36} />
          </button>
        </div>
      </div>

      {/* Quick Messages Modal */}
      <AnimatePresence>
        {showQuickMessages && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-end"
          >
            <div className="w-full bg-slate-900 rounded-t-[32px] p-8 pb-12">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Messages rapides</h3>
                <button 
                  onClick={() => setShowQuickMessages(false)}
                  className="p-2 bg-white/5 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                {QUICK_MESSAGES.map((msg, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSendMessage(msg);
                      setShowQuickMessages(false);
                      onDecline(); // Usually sending a quick message declines the call
                    }}
                    className="w-full p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-left font-medium transition-colors"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default IncomingCallOverlay;
