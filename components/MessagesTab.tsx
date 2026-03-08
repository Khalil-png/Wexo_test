
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Plus, Smile, Send, 
  CheckCheck, ArrowLeft, Check, Trash2,
  MessageCircle, Lock, UserPlus, Clock, 
  MessageSquarePlus, Users, User, Mic, Paperclip, AlertCircle
} from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { Message } from '../types';
import { getSmartResponse } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { generateSnowflake } from '../utils/snowflake';

// Avatar Gemini parfaitement centré en X et Y
const GeminiAvatarIcon = () => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden">
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
  const [showDeleteFriend, setShowDeleteFriend] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🤨', '🧐', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '✨', '🔥', '⭐', '🌟', '⚡', '🌈', '☁️', '☀️', '❄️', '🌊', '🍎', '🍕', '🍔', '🍟', '🍦', '🍩', '🍪', '🍫', '🍿', '🥤', '🍺', '🍷', '🥂', '🥃', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '⛳', '⛸️', '🎣', '🛶', '🏄', '🏊', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤺', '🏇', '🧘'
  ];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    // Listen for custom event from Header
    const handleSelectChat = (e: any) => {
      setSelectedId(e.detail);
      setMobileView('chat');
    };
    window.addEventListener('select-chat', handleSelectChat);

    // Check URL param on mount
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedId(chatId);
      setMobileView('chat');
    }

    return () => window.removeEventListener('select-chat', handleSelectChat);
  }, []);

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
        timestamp: new Date(m.created_at).toLocaleString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit'
        }).replace(',', '')
      })));
    }
  };

  const handleSearchUsers = async (query: string, tab: 'tout' | 'ami' = searchTab) => {
    setSearchQuery(query);
    setShowDeleteFriend(null);
    let baseQuery = supabase.from('profiles').select('*').neq('id', user.id);
    if (query) baseQuery = baseQuery.ilike('username', `%${query}%`);
    if (tab === 'ami') {
      const friendsIds = friendships.filter(f => f.status === 'accepted').map(f => f.requester_id === user.id ? f.receiver_id : f.requester_id);
      baseQuery = baseQuery.in('id', friendsIds);
    }
    const { data } = await baseQuery.limit(20);
    setUsersList(data || []);
  };

  const handleRemoveFriend = async (friendId: string) => {
    await supabase.from('friendships').delete().or(`and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`);
    fetchFriendships();
    handleSearchUsers(searchQuery);
    setShowDeleteFriend(null);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    const isGemini = selectedId === 'gemini';
    const now = new Date().toISOString();
    const snowflakeId = generateSnowflake();

    const newMsg = { id: snowflakeId, sender_id: user.id.toString(), receiver_id: selectedId!, text, created_at: now };
    
    // Optimistic UI
    const optimisticTimestamp = new Date().toLocaleString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).replace(',', '');

    setMessages(prev => [...prev, { 
      ...newMsg, 
      id: snowflakeId, 
      is_own: true, 
      timestamp: optimisticTimestamp,
      sender_id: user.id.toString(),
      receiver_id: selectedId!
    } as ExtendedMessage]);
    setMessageText('');

    try {
      await supabase.from('messages').insert([newMsg]);
      
      // Insert notification for the receiver (if not Gemini)
      if (!isGemini) {
        await supabase.from('notifications').insert([{
          id: generateSnowflake(),
          user_id: selectedId!,
          type: 'message',
          sender_id: user.id.toString(),
          status: 'unread'
        }]);
      }
      
      if (isGemini) {
        setIsTypingAI(true);
        // Fix: Explicitly type historyMessages to ensure property checks work correctly in the filter/map chain.
        const historyMessages: ExtendedMessage[] = [...messages, { 
          ...newMsg, 
          is_own: true, 
          id: 'temp', 
          timestamp: optimisticTimestamp 
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
          id: generateSnowflake(), 
          is_own: false, 
          isAI: true,
          isError: isQuotaError,
          timestamp: new Date().toLocaleString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit'
          }).replace(',', '')
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
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#0f0f0f]">
        <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-700 border border-white/10 mb-8 shadow-inner animate-pulse">
          <Lock size={48} />
        </div>
        <p className="text-slate-500 text-xs font-medium leading-relaxed">
          Vous devez être connecté pour pouvoir accéder à vos messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0f0f0f] overflow-hidden relative w-full border-t border-white/10">
      
      {/* Sidebar Discussion */}
      <div className={`w-full lg:w-[380px] border-r border-white/10 flex-col bg-[#0f0f0f] lg:flex h-full overflow-hidden ${mobileView === 'chat' ? 'hidden' : 'flex'}`}>
        <div className="p-6 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tighter">Messages</h2>
            <div className="flex items-center gap-2 relative">
              <button 
                onClick={() => {setSelectedId('gemini'); setMobileView('chat');}} 
                className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden hover:bg-white/10 transition-all"
              >
                <div className="w-6 h-6"><GeminiAvatarIcon /></div>
              </button>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"><Plus size={20} /></button>
              
              {showPlusMenu && (
                <div className="absolute top-10 right-0 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] animate-in zoom-in-95 duration-200">
                  <button onClick={() => {setIsSearchingUsers(true); setShowPlusMenu(false); handleSearchUsers('', 'tout');}} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all group text-left">
                    <div className="w-9 h-9 bg-white/10 text-white rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all"><MessageSquarePlus size={18} /></div>
                    <span className="block text-[11px] font-black uppercase text-white tracking-widest">Démarrer une discussion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Rechercher..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white outline-none" /></div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Gemini List Item */}
          <div onClick={() => { setSelectedId('gemini'); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === 'gemini' ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden flex items-center justify-center"><GeminiAvatarIcon /></div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5"><h4 className="text-sm font-bold text-white">Gemini</h4><span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">IA</span></div>
              <p className="text-xs text-slate-400 truncate font-medium">Assistant intelligent</p>
            </div>
          </div>

          {/* User Conversations List */}
          {conversations.map(c => (
            <div key={c.id} onClick={() => { setSelectedId(c.id); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === c.id ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
              <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex items-center justify-center"><img src={c.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5"><h4 className="text-sm font-bold text-white">{c.username}</h4></div>
                <p className="text-xs text-slate-400 truncate font-medium">Membre Wexo</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Recherche / Démarrer discussion */}
      {isSearchingUsers && (
        <div className="absolute inset-0 z-[110] bg-[#0f0f0f] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-[#0f0f0f]/80 backdrop-blur-xl">
            <button onClick={() => setIsSearchingUsers(false)} className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-xl"><ArrowLeft size={20} /></button>
            <h3 className="text-xl font-black text-white tracking-tighter">Nouveau message</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input autoFocus value={searchQuery} onChange={(e) => handleSearchUsers(e.target.value)} type="text" placeholder="Rechercher par pseudo..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/20 transition-all" />
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => {setSearchTab('tout'); handleSearchUsers(searchQuery, 'tout');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${searchTab === 'tout' ? 'bg-[#272727] text-white shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}>TOUT</button>
              <button onClick={() => {setSearchTab('ami'); handleSearchUsers(searchQuery, 'ami');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${searchTab === 'ami' ? 'bg-[#272727] text-white shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}>AMI</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {usersList.map((u) => {
                const friendship = friendships.find(f => f.requester_id === u.id || f.receiver_id === u.id);
                const isPending = friendship?.status === 'pending';
                const isFriend = friendship?.status === 'accepted';
                
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.8rem] hover:bg-white/10 transition-all group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden flex-shrink-0">
                    <img 
                      src={u.avatar_url || DEFAULT_AVATAR} 
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>
                  <div><h4 className="text-sm font-bold text-white tracking-tight">{u.username}</h4><p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Wexo User</p></div>
                </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedId(u.id); setIsSearchingUsers(false); setMobileView('chat'); }} className="p-3 bg-white/10 text-white rounded-xl hover:bg-white hover:text-black transition-all"><MessageSquarePlus size={18} /></button>
                      {isFriend ? (
                        <div className="relative">
                          {showDeleteFriend === u.id && (
                            <button 
                              onClick={() => handleRemoveFriend(u.id)}
                              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-1"
                            >
                              Supprimer l'ami
                            </button>
                          )}
                          <div className="px-3 py-1.5 bg-white/10 text-white rounded-md border border-white/20">
                            <span className="text-[10px] font-black uppercase tracking-widest">Ami</span>
                          </div>
                        </div>
                      ) : isPending ? (
                        <button disabled className="p-3 bg-white/5 text-slate-500 rounded-xl border border-white/10 opacity-50 cursor-not-allowed">
                          <Clock size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={async () => { 
                            const friendshipId = generateSnowflake();
                            await supabase.from('friendships').insert([{ id: friendshipId, requester_id: user.id, receiver_id: u.id, status: 'pending' }]); 
                            // Add notification for the receiver
                            await supabase.from('notifications').insert([{
                              id: generateSnowflake(),
                              user_id: u.id,
                              type: 'friend_request',
                              sender_id: user.id,
                              status: 'unread'
                            }]);
                            fetchFriendships(); 
                            handleSearchUsers(searchQuery); 
                          }} 
                          className="p-3 bg-white text-black rounded-xl hover:bg-slate-200 transition-all shadow-sm"
                        >
                          <UserPlus size={18} />
                        </button>
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
      <div className={`flex-1 flex-col bg-[#0f0f0f] relative lg:flex h-full overflow-hidden ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedId ? (
          <>
            <div className="p-4 border-b border-white/10 bg-[#0f0f0f]/80 backdrop-blur-md flex items-center justify-between z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileView('list')} className="lg:hidden p-2 text-slate-400 mr-1"><ArrowLeft size={20} /></button>
                <div className={`w-10 h-10 rounded-full border ${selectedId === 'gemini' ? 'border-white/30' : 'border-white/10'} flex items-center justify-center overflow-hidden`}>
                  {selectedId === 'gemini' ? <div className="w-full h-full"><GeminiAvatarIcon /></div> : <img src={selectedProfile?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" />}
                </div>
                <div>
                  <h3 className={`text-sm font-black tracking-tight text-white`}>
                    {selectedId === 'gemini' ? 'Gemini' : (selectedProfile?.username || 'Chargement...')}
                  </h3>
                  <div className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">En ligne</p></div>
                </div>
              </div>

              {selectedId !== 'gemini' && (
                <div className="flex items-center gap-2 relative">
                  {(() => {
                    const friendship = friendships.find(f => f.requester_id === selectedId || f.receiver_id === selectedId);
                    const isPending = friendship?.status === 'pending';
                    const isFriend = friendship?.status === 'accepted';

                    if (isFriend) return (
                      <div className="relative">
                        <button 
                          onClick={() => setShowDeleteFriend(showDeleteFriend === selectedId ? null : selectedId)}
                          className="p-2.5 bg-white text-black rounded-xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                        >
                          <Check size={18} />
                        </button>
                        
                        {showDeleteFriend === selectedId && (
                          <div className="absolute top-full mt-2 right-0 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                            <button 
                              onClick={() => handleRemoveFriend(selectedId)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-red-600 transition-all whitespace-nowrap"
                            >
                              <Trash2 size={14} />
                              Supprimer l'ami
                            </button>
                          </div>
                        )}
                      </div>
                    );

                    if (isPending) return (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-slate-500 rounded-xl border border-white/10 opacity-50">
                        <Clock size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">En attente</span>
                      </div>
                    );

                    return (
                      <button 
                        onClick={async () => { 
                          const friendshipId = generateSnowflake();
                          await supabase.from('friendships').insert([{ id: friendshipId, requester_id: user.id, receiver_id: selectedId, status: 'pending' }]); 
                          // Add notification for the receiver
                          await supabase.from('notifications').insert([{
                            id: generateSnowflake(),
                            user_id: selectedId,
                            type: 'friend_request',
                            sender_id: user.id,
                            status: 'unread'
                          }]);
                          fetchFriendships(); 
                        }} 
                        className="p-2.5 bg-white text-black rounded-xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                      >
                        <UserPlus size={18} />
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 no-scrollbar flex flex-col z-10">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl relative shadow-sm ${
                    msg.is_own 
                      ? 'bg-white text-black rounded-tr-none' 
                      : msg.isError 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-tl-none'
                        : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                  }`}>
                    <div className="flex items-end gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        {msg.isError && <div className="flex items-center gap-1.5 text-amber-500 mb-1"><AlertCircle size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Limite atteinte</span></div>}
                        <p className="text-sm font-medium leading-relaxed break-words">{msg.text}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest flex-shrink-0 mb-0.5 ${msg.is_own ? 'text-black/40' : 'text-white/40'}`}>
                        <span>{msg.timestamp}</span>
                        {msg.is_own && <CheckCheck size={10} className="text-black/60" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isTypingAI && <div className="flex justify-start animate-pulse"><div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[9px] text-white font-black uppercase tracking-widest">Gemini réfléchit... </div></div>}
            </div>

            <div className="p-4 sm:p-6 bg-[#0f0f0f] border-t border-white/10 flex-shrink-0 z-20">
              <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-2.5 border border-white/10 shadow-inner">
                <button className="p-2 text-slate-400 hover:text-white transition-colors"><Paperclip size={20} /></button>
                <input 
                  type="text" 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(messageText)} 
                  placeholder={`Écrire à ${selectedId === 'gemini' ? 'Gemini' : (selectedProfile?.username || '...')}`} 
                  className="flex-1 bg-transparent border-none text-sm text-white outline-none focus:ring-0 placeholder:text-slate-500" 
                />
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                      className={`p-2 transition-colors ${showEmojiPicker ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                    >
                      <Smile size={20} />
                    </button>

                    {showEmojiPicker && (
                      <div 
                        ref={emojiPickerRef}
                        className="absolute bottom-full mb-4 right-0 w-64 sm:w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-3 z-[100] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
                      >
                        <div className="flex items-center justify-between mb-3 px-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Emojis iOS</span>
                          <button onClick={() => setShowEmojiPicker(false)} className="text-slate-500 hover:text-white"><Plus size={14} className="rotate-45" /></button>
                        </div>
                        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 max-h-48 overflow-y-auto no-scrollbar">
                          {emojis.map((emoji, i) => (
                            <button 
                              key={i} 
                              onClick={() => {
                                setMessageText(prev => prev + emoji);
                                // On ne ferme pas forcément le picker pour permettre d'en mettre plusieurs
                              }}
                              className="text-xl hover:bg-white/10 p-1 rounded-lg transition-all active:scale-90"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="absolute top-full right-4 border-8 border-transparent border-t-[#1a1a1a]"></div>
                      </div>
                    )}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white transition-colors"><Mic size={20} /></button>
                  <button onClick={() => sendMessage(messageText)} className="bg-white text-black p-2.5 rounded-xl transition-all shadow-lg active:scale-90"><Send size={18} fill="currentColor" /></button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
            <div className="w-20 h-20 bg-white/5 text-slate-700 border border-white/10 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner animate-in fade-in zoom-in duration-500"><MessageCircle size={40} /></div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-3">Messagerie Wexo</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium leading-relaxed">Discutez avec vos amis ou profitez de l'intelligence de Gemini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
