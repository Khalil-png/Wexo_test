
import React from 'react';
import { Phone, MoreVertical, Search } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';

interface ActiveCallOverlayProps {
  activeCall: {
    id: string;
    caller_id: string;
    receiver_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
    isOngoing?: boolean;
  };
  callTimer: number;
  onEndCall: () => void;
}

const ActiveCallOverlay: React.FC<ActiveCallOverlayProps> = ({ 
  activeCall, 
  callTimer, 
  onEndCall 
}) => {
  const ringtoneRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (!activeCall.isOngoing) {
      // Outgoing rigntone
      ringtoneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1355/1355-preview.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => console.log("Sound error:", e));
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    }
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [activeCall.isOngoing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1001] bg-black flex flex-col items-center justify-between py-24 px-6 text-white overflow-hidden select-none">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-black opacity-90 animate-in fade-in duration-1000"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="flex-1 flex flex-col items-center justify-center text-center mt-12 relative z-10 w-full animate-in slide-in-from-bottom-12 duration-700">
        <div className="relative mb-12">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-emerald-500/20 p-2 bg-slate-900 shadow-[0_0_80px_rgba(16,185,129,0.1)]">
            {activeCall.caller_id === 'gemini' || activeCall.receiver_id === 'gemini' ? (
              <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center bg-slate-800">
                <img 
                  src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                  className="w-32 h-32 object-cover" 
                  alt="Gemini"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <img 
                src={activeCall.profiles.avatar_url || DEFAULT_AVATAR} 
                className="w-full h-full rounded-full object-cover"
                alt=""
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          {/* Animated rings */}
          <div className="absolute inset-[-10px] rounded-full border-2 border-emerald-500/20 animate-[ping_3s_linear_infinite]" />
          <div className="absolute inset-[-20px] rounded-full border border-emerald-500/10 animate-[ping_4s_linear_infinite_delay-1s]" />
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] opacity-30" />
        </div>
        
        <h3 className="text-4xl font-black text-white mb-3 tracking-tight">
          {activeCall.profiles.username}
        </h3>
        
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-500 font-black tracking-widest text-[10px] uppercase">
              {activeCall.isOngoing ? 'Appel en direct' : 'Connexion...'}
            </span>
          </div>
          
          <p className="text-white/40 font-mono text-3xl tabular-nums tracking-wider mt-4">
            {formatTime(callTimer)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-10 mb-12 relative z-10 w-full">
        <button 
          title="Paramètres"
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <Search size={24} />
        </button>
        
        <button 
          onClick={onEndCall}
          className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 active:scale-90 transition-all shadow-[0_0_40px_rgba(220,38,38,0.4)] border-4 border-white/10"
        >
          <Phone size={40} className="rotate-[135deg]" />
        </button>
        
        <button 
          title="Plus d'options"
          className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5"
        >
          <MoreVertical size={24} />
        </button>
      </div>
    </div>
  );
};

export default ActiveCallOverlay;
