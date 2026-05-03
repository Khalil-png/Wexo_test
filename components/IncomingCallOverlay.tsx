
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Native Call Integration: Vibration, MediaSession, and WakeLock
  useEffect(() => {
    // 0. Audio Ringtone
    const ringtoneUrl = "https://assets.mixkit.co/active_storage/sfx/1355/1355-preview.mp3";
    ringtoneRef.current = new Audio(ringtoneUrl);
    ringtoneRef.current.loop = true;
    
    // Play ringtone with a slight delay to avoid browser policy issues
    const playRingtone = async () => {
      try {
        if (ringtoneRef.current) {
          await ringtoneRef.current.play();
        }
      } catch (err) {
        console.warn("Ringtone blocked:", err);
      }
    };
    playRingtone();

    // 1. Vibration pattern (ringtone-like)
    const startVibration = () => {
      if ('vibration' in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
        return setInterval(() => {
          navigator.vibrate([1000, 500, 1000, 500, 1000]);
        }, 3000);
      }
      return null;
    };

    const vibrationInterval = startVibration();

    // 2. MediaSession API (Lock screen controls)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Appel entrant de ${caller.username}`,
        artist: 'Wexo Social',
        album: 'Wexo Social',
        artwork: [
          { src: caller.avatar_url || DEFAULT_AVATAR, sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', onAccept);
      navigator.mediaSession.setActionHandler('pause', onDecline);
      // Remove non-standard actions to pass lint
    }

    // 3. Wake Lock (Keep screen on)
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };
    requestWakeLock();

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      if (vibrationInterval) clearInterval(vibrationInterval);
      if ('vibration' in navigator) navigator.vibrate(0);
      if (wakeLock) wakeLock.release();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [caller, onAccept, onDecline]);

  const handleDragEnd = (event: any, info: any, action: 'accept' | 'decline') => {
    // Swipe up detection (negative y offset)
    if (info.offset.y < -80) {
      if (action === 'accept') onAccept();
      else onDecline();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-between py-20 px-6 text-white overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] to-black opacity-50"></div>
      
      {/* Caller Info */}
      <div className="relative z-10 flex flex-col items-center text-center mt-12 animate-in zoom-in duration-700">
        <div className="mb-8 relative">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/20 bg-slate-900 shadow-[0_0_80px_rgba(255,255,255,0.1)]"
          >
            <img 
              src={caller.avatar_url || DEFAULT_AVATAR} 
              alt={caller.username}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          {/* Animated rings */}
          <div className="absolute inset-x-0 top-0 flex justify-center -z-10 mt-24">
             {[1, 2, 3].map(i => (
               <motion.div
                 key={i}
                 initial={{ scale: 0.8, opacity: 0.5 }}
                 animate={{ scale: 2.2, opacity: 0 }}
                 transition={{ duration: 3, repeat: Infinity, delay: i }}
                 className="absolute w-40 h-40 rounded-full border border-white/30"
               />
             ))}
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-3 tracking-tight">{caller.username}</h1>
        <p className="text-white/40 text-lg font-medium tracking-widest uppercase">Wexo Video Call...</p>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 w-full max-w-sm grid grid-cols-2 gap-12 px-8 mb-12">
        {/* Decline */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onDecline}
            className="w-20 h-20 rounded-full bg-[#ff3b30] flex items-center justify-center shadow-2xl shadow-red-500/30"
          >
            <PhoneOff size={32} className="text-white" />
          </motion.button>
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Refuser</span>
        </div>

        {/* Accept */}
        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAccept}
            className="w-20 h-20 rounded-full bg-[#34c759] flex items-center justify-center shadow-2xl shadow-emerald-500/30"
          >
            <Phone size={32} className="text-white fill-current" />
          </motion.button>
          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Répondre</span>
        </div>
      </div>
      
      {/* Quick Message Option */}
      <div className="relative z-10 w-full flex justify-center mb-10">
        <button 
          onClick={() => setShowQuickMessages(true)}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
            <MessageSquare size={20} className="text-white/60" />
          </div>
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Message</span>
        </button>
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
