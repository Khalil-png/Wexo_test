
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, MoreVertical, Plus, User, X, Loader2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { pb } from '../services/pocketbaseService';
// Firebase désactivé
import { useClickOutside } from '../utils/hooks';
import { isMobileDevice } from '../src/utils/device';
import { DEFAULT_AVATAR } from '../constants';
import { generateSnowflake } from '../utils/snowflake';
import { CallsTabProps } from '../types';

interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  type: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'completed' | 'ongoing';
  created_at: any;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const CallsTab: React.FC<CallsTabProps> = ({ 
  user, 
  profile,
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
  const [activeCall, setActiveCall] = useState<any>(propActiveCall);
  const [callTimer, setCallTimer] = useState(propCallTimer || 0);

  // Sync state with props
  useEffect(() => {
    setActiveCall(propActiveCall);
  }, [propActiveCall]);

  useEffect(() => {
    if (propCallTimer !== undefined) {
      setCallTimer(propCallTimer);
    }
  }, [propCallTimer]);

  // Gestion du bouton retour
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (activeCall) {
        // En appel, on demande confirmation ou on ne fait rien pour éviter de couper par erreur
        // Ici on choisit de ne rien faire pour protéger l'appel
        e.preventDefault();
      } else if (view === 'new-call') {
        setView('history');
        e.preventDefault();
      }
    };
    window.addEventListener('app-back-button', handleBackButton);
    return () => window.removeEventListener('app-back-button', handleBackButton);
  }, [activeCall, view]);

  // Synchronisation au réveil
  useEffect(() => {
    const fetchCalls = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const userId = user.uid || user.id;
        const resultList = await pb.collection('calls').getList(1, 50, {
          sort: '-created',
          filter: `caller_id = "${userId}" || receiver_id = "${userId}"`,
          expand: 'caller_id,receiver_id'
        });

        const formattedCalls: Call[] = resultList.items.map(record => {
          const isCaller = record.caller_id === userId;
          const otherParty = isCaller ? record.expand?.receiver_id : record.expand?.caller_id;
          
          return {
            id: record.id,
            caller_id: record.caller_id,
            receiver_id: record.receiver_id,
            type: record.type,
            status: record.status,
            created_at: record.created,
            profiles: {
              username: otherParty?.username || 'Utilisateur inconnu',
              avatar_url: otherParty?.avatar ? pb.getFileUrl(otherParty, otherParty.avatar) : null
            }
          };
        });

        setCalls(formattedCalls);
      } catch (err) {
        console.error("Error fetching calls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();

    const handleResume = () => {
      console.log('CallsTab resume detected, refreshing history...');
      fetchCalls();
    };
    window.addEventListener('app-resume', handleResume);

    // Realtime subscription
    pb.collection('calls').subscribe('*', () => {
      fetchCalls();
    });

    return () => {
      pb.collection('calls').unsubscribe('*');
      window.removeEventListener('app-resume', handleResume);
    };
  }, [user?.uid]);

  const fetchUsers = async () => {
    if (!user?.uid) return;
    try {
      const result = await pb.collection('users').getList(1, 100, {
        sort: '-created'
      });
      const usersData = result.items
        .map(u => ({ 
          id: u.id, 
          username: u.username, 
          avatar_url: u.avatar_url || u.avatar ? pb.files.getUrl(u, u.avatar) : DEFAULT_AVATAR 
        }))
        .filter((u: any) => u.id !== user.uid && u.id !== 'gemini');
      setUsers(usersData);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    }
  };

  const startCall = (receiver: any) => {
    if (!user?.uid) return;
    if (onStartCall) {
      onStartCall(receiver);
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
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {call.caller_id === 'gemini' || call.receiver_id === 'gemini' ? (
                      <img 
                        src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                        className="w-8 h-8 object-cover" 
                        alt="Gemini"
                        referrerPolicy="no-referrer"
                      />
                  ) : (
                    <img src={call.profiles.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover border border-white/10 rounded-full" alt="" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{call.profiles.username}</h4>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      {getCallIcon(call.status)}
                      <span className={`text-[10px] font-bold ${call.status === 'missed' ? 'text-red-500' : 'text-slate-500'}`}>
                        {call.status === 'missed' ? 'Manqué' : (call.status === 'incoming' || call.status === 'ongoing') ? 'Entrant' : 'Sortant'}
                      </span>
                    </div>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <p className="text-[11px] text-slate-500 font-medium">{formatDate(call.created_at)}</p>
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
                    <div className={`w-12 h-12 rounded-full overflow-hidden ${u.id === 'gemini' ? '' : 'border border-white/10'}`}>
                      {u.id === 'gemini' ? (
                        <div className="w-full h-full overflow-hidden rounded-full flex items-center justify-center">
                          <img 
                            src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
                            className="w-10 h-10 object-cover" 
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
    </div>
  );
};

export default CallsTab;
