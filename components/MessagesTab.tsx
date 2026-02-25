
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Smile, Send, 
  CheckCheck, ArrowLeft,
  MessageCircle, Lock, UserPlus, Clock, 
  MessageSquarePlus, Users, User, Mic, Paperclip, AlertCircle
} from 'lucide-react';
import { Message } from '../types';
import { getSmartResponse } from '../services/geminiService';
import { supabase } from '../services/supabase';

// Avatar Gemini parfaitement centré en X et Y
const GeminiAvatarIcon = () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-900 overflow-hidden">
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[60%] h-[60%]">
      <defs>
        <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF66CC" />
          <stop offset="100%" stopColor="#4285F4" />
        </linearGradient>
      </defs>
      <path 
        d="M50 0C50 27.6142 27.6142 50 0 50C27.6142 50 50 72.3858 50 100C50 72.3858 72.3858 50 100 50C72.3858 50 50 27.6142 50 0Z" 
        fill="url(#geminiGradient)"
      />
    </svg>
  </div>
);

interface ExtendedMessage extends Message {
  isAI?: boolean;
  isError?: boolean;
  receiver_id?: string;
}

interface MessagesTabProps {
  user?: any;
  profile?: any;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ user, profile }) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messageText, setMessageText] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<'tout' | 'ami'>('tout');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Sécurité déconnexion & Initialisation
  useEffect(() => {
    if (!user) {
      setSelectedId(null);
      setMobileView('list');
      setConversations([]);
      setMessages([]);
    } else {
      fetchConversations();
      fetchFriendships();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedId) {
      fetchMessages();
      if (selectedId !== 'gemini') {
        fetchSelectedProfile();
      } else {
        setSelectedProfile({ username: 'Gemini', avatar_url: null });
      }
    }
  }, [user, selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTypingAI]);

  const fetchSelectedProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', selectedId).single();
    setSelectedProfile(data);
  };

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    
    if (data) {
      const ids = new Set<string>();
      data.forEach(m => {
        if (m.sender_id !== user.id.toString()) ids.add(m.sender_id);
        if (m.receiver_id !== user.id.toString()) ids.add(m.receiver_id);
      });
      
      const uniqueIds = Array.from(ids).filter(id => id !== 'gemini' && id !== user.id.toString());
      if (uniqueIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueIds);
        setConversations(profiles || []);
      }
    }
  };

  const fetchFriendships = async () => {
    const { data } = await supabase.from('friendships').select('*').or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
    setFriendships(data || []);
  };

  const fetchMessages = async () => {
    if (!user || !selectedId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map(m => ({
        ...m,
        is_own: m.sender_id === user.id.toString(),
        isAI: m.sender_id === 'gemini',
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
    }
  };

  const handleSearchUsers = async (query: string, tab: 'tout' | 'ami' = searchTab) => {
    setSearchQuery(query);
    let baseQuery = supabase.from('profiles').select('*').neq('id', user.id);
    if (query) baseQuery = baseQuery.ilike('username', `%${query}%`);
    if (tab === 'ami') {
      const friendsIds = friendships.filter(f => f.status === 'accepted').map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id);
      baseQuery = baseQuery.in('id', friendsIds);
    }
    const { data } = await baseQuery.limit(20);
    setUsersList(data || []);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    const isGemini = selectedId === 'gemini';
    const now = new Date().toISOString();

    const newMsg = { sender_id: user.id.toString(), receiver_id: selectedId!, text, created_at: now };
    
    // Optimistic UI
    setMessages(prev => [...prev, { 
      ...newMsg, 
      id: Date.now().toString(), 
      is_own: true, 
      timestamp: 'À l\'instant',
      sender_id: user.id.toString(),
      receiver_id: selectedId!
    } as ExtendedMessage]);
    setMessageText('');

    try {
      await supabase.from('messages').insert([newMsg]);
      
      if (isGemini) {
        setIsTypingAI(true);
        // Fix: Explicitly type historyMessages to ensure property checks work correctly in the filter/map chain.
        const historyMessages: ExtendedMessage[] = [...messages, { 
          ...newMsg, 
          is_own: true, 
          id: 'temp', 
          timestamp: 'À l\'instant' 
        } as ExtendedMessage];
        const history = historyMessages
          .filter(m => !m.isError)
          .map(m => ({
            role: m.sender_id === user.id.toString() ? 'user' : 'model',
            parts: [{ text: m.text }]
          }));
        
        const responseText = await getSmartResponse(history);
        const isQuotaError = responseText.includes("reprendre mon souffle");
        
        const aiMsg = { 
          sender_id: 'gemini', 
          receiver_id: user.id.toString(), 
          text: responseText, 
          created_at: new Date().toISOString() 
        };
        
        // On ne sauvegarde en base que si ce n'est pas une erreur de quota temporaire pour ne pas polluer l'historique
        if (!isQuotaError) {
          await supabase.from('messages').insert([aiMsg]);
        }

        setMessages(prev => [...prev, { 
          ...aiMsg, 
          id: (Date.now() + 1).toString(), 
          is_own: false, 
          isAI: true,
          isError: isQuotaError,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        } as any]);
        setIsTypingAI(false);
      }
      fetchConversations();
    } catch (e) { 
      console.error(e); 
      setIsTypingAI(false); 
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-950">
        <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-slate-800 border border-slate-800 mb-8 shadow-inner animate-pulse">
          <Lock size={48} />
        </div>
        <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">Accès restreint</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-10 font-medium leading-relaxed">
          Connectez-vous à votre compte Wexo pour accéder à vos messages et discuter avec Gemini 🙂.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden relative w-full border-t border-slate-800/40">
      
      {/* Sidebar Discussion */}
      <div className={`w-full lg:w-[380px] border-r border-slate-800/60 flex-col bg-slate-900/5 lg:flex h-full overflow-hidden ${mobileView === 'chat' ? 'hidden' : 'flex'}`}>
        <div className="p-6 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tighter">Messages</h2>
            <div className="flex items-center gap-2 relative">
              <button 
                onClick={() => {setSelectedId('gemini'); setMobileView('chat');}} 
                className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center overflow-hidden hover:bg-indigo-500/20 transition-all"
              >
                <div className="w-6 h-6"><GeminiAvatarIcon /></div>
              </button>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"><Plus size={20} /></button>
              
              {showPlusMenu && (
                <div className="absolute top-10 right-0 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-[100] animate-in zoom-in-95 duration-200">
                  <button onClick={() => {setIsSearchingUsers(true); setShowPlusMenu(false); handleSearchUsers('', 'tout');}} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 rounded-xl transition-all group text-left">
                    <div className="w-9 h-9 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all"><MessageSquarePlus size={18} /></div>
                    <span className="block text-[11px] font-black uppercase text-white tracking-widest">Démarrer une discussion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Rechercher..." className="w-full bg-slate-900/60 border border-slate-800/50 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white outline-none" /></div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Gemini List Item */}
          <div onClick={() => { setSelectedId('gemini'); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === 'gemini' ? 'bg-indigo-500/10 border-indigo-500' : 'border-transparent hover:bg-slate-800/10'}`}>
            <div className="w-10 h-10 rounded-full border border-indigo-500/20 overflow-hidden"><GeminiAvatarIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5"><h4 className="text-sm font-bold text-indigo-300">Gemini</h4><span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">IA</span></div>
              <p className="text-xs text-slate-500 truncate font-medium">Assistant intelligent</p>
            </div>
          </div>

          {/* User Conversations List */}
          {conversations.map(c => (
            <div key={c.id} onClick={() => { setSelectedId(c.id); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === c.id ? 'bg-sky-500/10 border-sky-500' : 'border-transparent hover:bg-slate-800/10'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-800 overflow-hidden"><img src={c.avatar_url || undefined} className="w-full h-full object-cover" alt="" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5"><h4 className="text-sm font-bold text-white">{c.username}</h4></div>
                <p className="text-xs text-slate-500 truncate font-medium">Membre Wexo</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Recherche / Démarrer discussion */}
      {isSearchingUsers && (
        <div className="absolute inset-0 z-[110] bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-slate-800 flex items-center gap-4 bg-slate-950/80 backdrop-blur-xl">
            <button onClick={() => setIsSearchingUsers(false)} className="p-2.5 text-slate-400 hover:text-white bg-slate-900 rounded-xl"><ArrowLeft size={20} /></button>
            <h3 className="text-xl font-black text-white tracking-tighter">Nouveau message</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input autoFocus value={searchQuery} onChange={(e) => handleSearchUsers(e.target.value)} type="text" placeholder="Rechercher par pseudo..." className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-sky-500/20 transition-all" />
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => {setSearchTab('tout'); handleSearchUsers(searchQuery, 'tout');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${searchTab === 'tout' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>TOUT</button>
              <button onClick={() => {setSearchTab('ami'); handleSearchUsers(searchQuery, 'ami');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${searchTab === 'ami' ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>AMI</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {usersList.map((u) => {
                const friendship = friendships.find(f => f.requester_id === u.id || f.receiver_id === u.id);
                const isPending = friendship?.status === 'pending';
                const isFriend = friendship?.status === 'accepted';
                
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/60 rounded-[1.8rem] hover:bg-slate-900 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden border border-white/5"><img src={u.avatar_url || undefined} className="w-full h-full object-cover" alt="" /></div>
                      <div><h4 className="text-sm font-bold text-white tracking-tight">{u.username}</h4><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Wexo User</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedId(u.id); setIsSearchingUsers(false); setMobileView('chat'); }} className="p-3 bg-sky-500/10 text-sky-400 rounded-xl hover:bg-sky-500 hover:text-white transition-all"><MessageSquarePlus size={18} /></button>
                      {isFriend ? (
                        <div className="p-3 text-emerald-500"><Users size={18} /></div>
                      ) : isPending ? (
                        <div className="p-3 text-slate-600 bg-slate-800/50 rounded-xl"><Clock size={18} /></div>
                      ) : (
                        <button onClick={async () => { await supabase.from('friendships').insert([{ requester_id: user.id, receiver_id: u.id, status: 'pending' }]); fetchFriendships(); handleSearchUsers(searchQuery); }} className="p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white hover:bg-slate-700 transition-all"><UserPlus size={18} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Zone de Chat */}
      <div className={`flex-1 flex-col bg-slate-950 relative lg:flex h-full overflow-hidden ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedId ? (
          <>
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileView('list')} className="lg:hidden p-2 text-slate-400 mr-1"><ArrowLeft size={20} /></button>
                <div className={`w-10 h-10 rounded-full border ${selectedId === 'gemini' ? 'border-indigo-500/30' : 'border-slate-800'} bg-slate-900 flex items-center justify-center overflow-hidden`}>
                  {selectedId === 'gemini' ? <div className="w-full h-full"><GeminiAvatarIcon /></div> : <img src={selectedProfile?.avatar_url || undefined} className="w-full h-full object-cover" alt="" />}
                </div>
                <div>
                  <h3 className={`text-sm font-black tracking-tight ${selectedId === 'gemini' ? 'text-indigo-400' : 'text-white'}`}>
                    {selectedId === 'gemini' ? 'Gemini' : (selectedProfile?.username || 'Chargement...')}
                  </h3>
                  <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">En ligne</p></div>
                </div>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 no-scrollbar flex flex-col z-10">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl relative shadow-2xl ${
                    msg.is_own 
                      ? 'bg-slate-900 border border-slate-800 text-white rounded-tr-none' 
                      : msg.isError 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-tl-none'
                        : 'bg-gradient-to-br from-[#1e1b4b] to-slate-900 text-white rounded-tl-none border border-indigo-500/30'
                  }`}>
                    <div className="flex flex-col gap-1">
                      {msg.isError && <div className="flex items-center gap-1.5 text-amber-500 mb-1"><AlertCircle size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Limite atteinte</span></div>}
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                    </div>
                    <div className="flex justify-end mt-1.5 text-[8px] font-black text-slate-500 uppercase tracking-widest"><span>{msg.timestamp}</span>{msg.is_own && <CheckCheck size={10} className="ml-1 text-sky-500" />}</div>
                  </div>
                </div>
              ))}
              {isTypingAI && <div className="flex justify-start animate-pulse"><div className="bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-2xl text-[9px] text-indigo-300 font-black uppercase tracking-widest">Gemini réfléchit... </div></div>}
            </div>

            <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex-shrink-0 z-20">
              <div className="flex items-center gap-3 bg-slate-900/60 rounded-2xl p-2.5 border border-slate-800/50 shadow-inner">
                <button className="p-2 text-slate-500 hover:text-sky-400 transition-colors"><Paperclip size={20} /></button>
                <input 
                  type="text" 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(messageText)} 
                  placeholder={`Écrire à ${selectedId === 'gemini' ? 'Gemini' : (selectedProfile?.username || '...')}`} 
                  className="flex-1 bg-transparent border-none text-sm text-white outline-none focus:ring-0 placeholder:text-slate-600" 
                />
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-500 hover:text-amber-400 transition-colors"><Smile size={20} /></button>
                  <button className="p-2 text-slate-500 hover:text-sky-400 transition-colors"><Mic size={20} /></button>
                  <button onClick={() => sendMessage(messageText)} className="bg-sky-500 hover:bg-sky-400 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-sky-500/20 active:scale-90"><Send size={18} fill="currentColor" /></button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-950">
            <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-slate-800 border border-slate-800 mb-8 shadow-inner animate-in fade-in zoom-in duration-500"><MessageCircle size={40} /></div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-3">Messagerie Wexo</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto font-medium leading-relaxed">Discutez avec vos amis ou profitez de l'intelligence de Gemini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
