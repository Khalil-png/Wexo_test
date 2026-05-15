
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, MessageSquare, ChevronUp, X, User, Lock as LockIcon, Video, Loader2 } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';

interface IncomingCallOverlayProps {
  caller: {
    username: string;
    avatar_url: string | null;
    id: string;
    phone?: string;
  };
  onAccept: () => void;
  onDecline: () => void;
  onSendMessage: (text: string) => void;
  isProcessing?: boolean;
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
  onSendMessage,
  isProcessing = false
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
    <div className="fixed inset-0 z-[2000] bg-[#0b0e11] flex flex-col items-center justify-between py-16 px-6 text-white overflow-hidden select-none">
      {/* WhatsApp-style dark patterned background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
      
      {/* Top Banner (Optional, for "Chiffré de bout en bout" look) */}
      <div className="relative z-10 flex items-center gap-2 text-white/40 text-[10px] tracking-wider uppercase font-bold">
        <LockIcon size={10} />
        <span>Chiffré de bout en bout</span>
      </div>

      {/* Caller Info */}
      <div className="relative z-10 flex flex-col items-center text-center mt-4 animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-3xl font-normal mb-1 tracking-tight text-white">{caller.username}</h1>
        {caller.phone && <p className="text-white/40 text-sm mb-1 font-mono tracking-wider">{caller.phone}</p>}
        <p className="text-[#00a884] text-sm font-medium tracking-wide mb-10">Appel vidéo Wexo...</p>
        
        <div className="relative">
          <motion.div 
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-40 h-40 rounded-full overflow-hidden bg-slate-800"
          >
            <img 
              src={caller.avatar_url || DEFAULT_AVATAR} 
              alt={caller.username}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          
          {/* Subtle pulse rings */}
          <div className="absolute inset-0 flex justify-center items-center -z-10">
             {[1, 2].map(i => (
               <motion.div
                 key={i}
                 initial={{ scale: 1, opacity: 0.2 }}
                 animate={{ scale: 1.8, opacity: 0 }}
                 transition={{ duration: 4, repeat: Infinity, delay: i * 2 }}
                 className="absolute w-40 h-40 rounded-full border border-white/20"
               />
             ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-16 pb-10">
        {/* Swipe Handle or Quick Options */}
        <div className="flex gap-20">
          <button className="flex flex-col items-center gap-2">
            <MessageSquare size={20} className="text-white/60" />
            <span className="text-[10px] text-white/40 font-medium">Message</span>
          </button>
          <button className="flex flex-col items-center gap-2">
             <Video size={20} className="text-white/60" />
             <span className="text-[10px] text-white/40 font-medium">Vidéo</span>
          </button>
        </div>

        {/* Real Answer/Decline area */}
        <div className="w-full flex justify-around items-end">
          <div className="flex flex-col items-center gap-3">
             <motion.button
               drag={isProcessing ? false : "y"}
               dragConstraints={{ top: -100, bottom: 0 }}
               dragElastic={0.2}
               onDragEnd={(e, info) => {
                 if (info.offset.y < -60) {
                   console.log("Decline via drag");
                   onDecline();
                 }
               }}
               whileTap={{ scale: isProcessing ? 1 : 0.9 }}
               onTap={(e) => {
                 e.stopPropagation();
                 if (!isProcessing) {
                   console.log("Decline via tap");
                   onDecline();
                 }
               }}
               disabled={isProcessing}
               className={`w-16 h-16 rounded-full bg-[#ff3b30] flex items-center justify-center shadow-lg ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-red-600'}`}
             >
               {isProcessing ? <Loader2 size={28} className="text-white animate-spin" /> : <PhoneOff size={28} className="text-white" />}
             </motion.button>
             <div className="flex flex-col items-center">
               <span className="text-xs text-white/80 shadow-sm font-medium">Décliner</span>
               <ChevronUp size={12} className="text-white/40 animate-pulse" />
             </div>
          </div>

          <div className="flex flex-col items-center gap-3">
             <motion.button
               drag={isProcessing ? false : "y"}
               dragConstraints={{ top: -100, bottom: 0 }}
               dragElastic={0.2}
               onDragEnd={(e, info) => {
                 if (info.offset.y < -60) {
                   console.log("Accept via drag");
                   onAccept();
                 }
               }}
               whileTap={{ scale: isProcessing ? 1 : 0.9 }}
               onTap={(e) => {
                 e.stopPropagation();
                 if (!isProcessing) {
                   console.log("Accept via tap");
                   onAccept();
                 }
               }}
               disabled={isProcessing}
               className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
               style={{ backgroundColor: isProcessing ? '#1a9d4b' : '#25D366' }} // WhatsApp Green
             >
               {isProcessing ? <Loader2 size={28} className="text-white animate-spin" /> : <Phone size={28} className="text-white fill-current" />}
             </motion.button>
             <div className="flex flex-col items-center">
               <span className="text-xs text-white/80 shadow-sm font-medium">Répondre</span>
               <ChevronUp size={12} className="text-white/40 animate-pulse" />
             </div>
          </div>
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
