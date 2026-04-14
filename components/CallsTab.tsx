
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, MoreVertical, Plus, User, X, Loader2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { useClickOutside } from '../utils/hooks';
import { isMobileDevice } from '../src/utils/device';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc,
  doc, 
  getDoc, 
  getDocs, 
  limit, 
  or, 
  serverTimestamp 
} from 'firebase/firestore';
import { DEFAULT_AVATAR } from '../constants';
import { generateSnowflake } from '../utils/snowflake';

interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'completed';
  created_at: any;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CallsTabProps {
  user: any;
  activeCall?: any;
  callTimer?: number;
  onEndCall?: () => void;
  onStartCall?: (receiver: any) => void;
}

const CallsTab: React.FC<CallsTabProps> = ({ 
  user, 
  activeCall: propActiveCall, 
  callTimer: propCallTimer,
  onEndCall,
  onStartCall
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'history' | 'new-call'>('history');
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);

  // Sync with props if provided
  useEffect(() => {
    if (propActiveCall !== undefined) setActiveCall(propActiveCall);
  }, [propActiveCall]);

  useEffect(() => {
    if (propCallTimer !== undefined) setCallTimer(propCallTimer);
  }, [propCallTimer]);

  useEffect(() => {
    let interval: any;
    if (activeCall && propCallTimer === undefined) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  useEffect(() => {
    if (!user?.uid) return;

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      or(
        where('caller_id', '==', user.uid),
        where('receiver_id', '==', user.uid)
      ),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const callsData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
          const call = docSnapshot.data() as Call;
          const otherPartyId = call.caller_id === user.uid ? call.receiver_id : call.caller_id;
          
          // Fetch other party profile
          const profileRef = doc(db, 'profiles', otherPartyId);
          const profileSnap = await getDoc(profileRef);
          const otherProfile = profileSnap.exists() ? profileSnap.data() : { username: 'Inconnu', avatar_url: null };

          return {
            ...call,
            id: docSnapshot.id,
            profiles: otherProfile
          } as Call;
        }));
        setCalls(callsData);
        setLoading(false);
      } catch (err) {
        console.error("Error processing calls snapshot:", err);
        setError("Erreur lors du traitement des appels.");
      }
    }, (err) => {
      console.error("Calls subscription error:", err);
      setError("Impossible de charger l'historique des appels.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const fetchUsers = async () => {
    if (!user?.uid) return;
    try {
      const usersRef = collection(db, 'profiles');
      const q = query(usersRef, limit(50));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.id !== user.uid && u.id !== 'gemini');
      setUsers(usersData);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError("Erreur lors de la recherche d'utilisateurs.");
    }
  };

  const startCall = async (receiver: any) => {
    if (!user?.uid) return;
    
    if (isMobileDevice()) {
      setError("Les appels ne sont pas disponibles sur la version web mobile.");
      return;
    }

    setIsCalling(true);
    setError(null);
    try {
      const callId = generateSnowflake();
      const callData = {
        id: callId,
        caller_id: user.uid,
        receiver_id: receiver.id,
        type: 'audio',
        status: 'outgoing',
        created_at: serverTimestamp()
      };

      await setDoc(doc(db, 'calls', callId), callData);
      
      const callWithProfile = {
        id: callId,
        ...callData,
        profiles: receiver
      };

      if (onStartCall) {
        onStartCall(callWithProfile);
      } else {
        setActiveCall(callWithProfile);
      }
      setView('history');
    } catch (err: any) {
      console.error("Error starting call:", err);
      setError("Échec du lancement de l'appel. Réessayez.");
    } finally {
      setIsCalling(false);
    }
  };

  const endCall = () => {
    if (onEndCall) {
      onEndCall();
    } else {
      setActiveCall(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (status: string) => {
    switch (status) {
      case 'incoming': return <PhoneIncoming size={12} className="text-slate-500" />;
      case 'outgoing': return <PhoneOutgoing size={12} className="text-slate-500" />;
      case 'missed': return <PhoneMissed size={12} className="text-red-500" />;
      default: return <PhoneCall size={12} className="text-slate-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `Aujourd'hui, ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {view === 'new-call' && (
            <button 
              onClick={() => setView('history')}
              className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {view === 'history' ? 'Appels' : 'Nouvel appel'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all">
            <Search size={20} />
          </button>
          {view === 'history' && (
            <button 
              onClick={() => { setView('new-call'); fetchUsers(); }}
              className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 animate-in slide-in-from-top-2">
          <AlertCircle size={18} />
          <p className="text-xs font-bold">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500/50 hover:text-red-500">
            <X size={16} />
          </button>
        </div>
      )}

      {view === 'history' ? (
        /* Calls List */
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
          ) : calls.map((call) => (
            <div 
              key={call.id}
              className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group cursor-pointer border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                  {call.caller_id === 'gemini' || call.receiver_id === 'gemini' ? (
                    <div className="w-full h-full overflow-hidden rounded-full">
                      <img 
                        src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                        className="w-full h-full object-cover" 
                        alt="Gemini"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <img src={call.profiles.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white">{call.profiles.username}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCallIcon(call.status)}
                      <span className={`text-[10px] font-bold ${call.status === 'missed' ? 'text-red-500' : 'text-slate-500'}`}>
                        {call.status === 'missed' ? 'Manqué' : call.status === 'incoming' ? 'Entrant' : 'Sortant'}
                      </span>
                    </div>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <p className="text-xs text-slate-500 font-medium">{formatDate(call.created_at)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); startCall({ id: call.caller_id === user.uid ? call.receiver_id : call.caller_id, ...call.profiles }); }}
                  className="p-3 text-slate-400 hover:text-emerald-500 bg-white/5 hover:bg-emerald-500/10 rounded-xl transition-all"
                >
                  <Phone size={18} />
                </button>
                <button className="p-3 text-slate-400 hover:text-white bg-white/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}

          {!loading && calls.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-slate-500 mb-6">
                <Phone size={40} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Aucun appel</h3>
              <p className="text-slate-500 text-sm max-w-xs">Vos appels apparaîtront ici.</p>
            </div>
          )}
        </div>
      ) : (
        /* New Call View */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {users
              .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((u) => (
                <div 
                  key={u.id}
                  onClick={() => startCall(u)}
                  className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                      {u.id === 'gemini' ? (
                        <div className="w-full h-full overflow-hidden rounded-full">
                          <img 
                            src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                            className="w-full h-full object-cover" 
                            alt="Gemini"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <img src={u.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <span className="font-bold text-white">{u.username}</span>
                  </div>
                  <button className="p-3 text-emerald-500 bg-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                    {isCalling ? <Loader2 className="animate-spin" size={18} /> : <Phone size={18} />}
                  </button>
                </div>
              ))}
            
            {users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <User size={40} className="mb-4" />
                <p className="text-sm font-bold">Aucun utilisateur trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="absolute inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-300">
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 p-1">
                {activeCall.caller_id === 'gemini' || activeCall.receiver_id === 'gemini' ? (
                  <div className="w-full h-full overflow-hidden rounded-full">
                    <img 
                      src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                      className="w-full h-full object-cover" 
                      alt="Gemini"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <img 
                    src={activeCall.profiles.avatar_url || DEFAULT_AVATAR} 
                    className="w-full h-full rounded-full object-cover"
                    alt=""
                  />
                )}
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500 animate-ping opacity-20" />
            </div>
            
            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">
              {activeCall.profiles.username}
            </h3>
            <p className="text-emerald-500 font-bold tracking-widest text-xs uppercase mb-4">
              Appel en cours...
            </p>
            <p className="text-white/40 font-mono text-xl tabular-nums">
              {formatTime(callTimer)}
            </p>
          </div>

          <div className="flex items-center gap-8 mb-12">
            <button className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <Search size={24} />
            </button>
            <button 
              onClick={endCall}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              <Phone size={32} className="rotate-[135deg]" />
            </button>
            <button className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all">
              <MoreVertical size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsTab;
