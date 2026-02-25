
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, X, Circle, Menu, UserPlus, Check, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'message';
  sender_id: string;
  sender_name?: string;
  status: 'unread' | 'read';
  created_at: string;
}

interface HeaderProps {
  user: any;
  profile: any;
  onOpenAuth: (type: 'login' | 'signup') => void;
  onOpenLogout: () => void;
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, profile, onOpenAuth, onOpenLogout, onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, sender:profiles(username)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotifications(data.map(n => ({ ...n, sender_name: (n as any).sender?.username })));
  };

  const handleFriendAction = async (notifId: string, senderId: string, action: 'accept' | 'refuse') => {
    if (action === 'accept') {
      await supabase.from('friendships').update({ status: 'accepted' }).match({ requester_id: senderId, receiver_id: user.id });
      await supabase.from('notifications').insert([{ user_id: senderId, type: 'friend_accepted', sender_id: user.id }]);
    } else {
      await supabase.from('friendships').delete().match({ requester_id: senderId, receiver_id: user.id });
    }
    await supabase.from('notifications').delete().eq('id', notifId);
    fetchNotifications();
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-slate-950/70 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 md:px-10 z-[100]">
      <div className="flex items-center gap-5">
        <button onClick={onToggleSidebar} className="lg:hidden p-2.5 text-slate-400 hover:text-white rounded-xl"><Menu size={24} /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center font-black text-white text-xl">W</div>
          <span className="text-xl font-black text-white hidden xs:block uppercase">Wexo</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl relative ${showNotifications ? 'bg-sky-500/10 text-sky-400' : 'text-slate-400 hover:text-white'}`}><Bell size={22} />{unreadCount > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full border-2 border-slate-950 flex items-center justify-center">{unreadCount}</span>}</button>
              {showNotifications && (
                <div className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-slate-900 border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notifications</h3></div>
                  <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5">
                        {n.type === 'friend_request' ? (
                          <div className="space-y-3">
                            <div className="flex gap-3"><div className="w-9 h-9 bg-sky-500/10 rounded-lg flex items-center justify-center text-sky-400"><UserPlus size={18} /></div><div className="flex-1"><p className="text-[11px] font-bold text-white"><span className="text-sky-400">{n.sender_name}</span> veut être votre ami !</p></div></div>
                            <div className="flex gap-2">
                              <button onClick={() => handleFriendAction(n.id, n.sender_id, 'accept')} className="flex-1 bg-sky-500 text-white text-[10px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1"><Check size={14} /> Accepter</button>
                              <button onClick={() => handleFriendAction(n.id, n.sender_id, 'refuse')} className="flex-1 bg-slate-800 text-slate-400 text-[10px] font-black uppercase py-2 rounded-lg flex items-center justify-center gap-1"><Trash2 size={14} /> Refuser</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3"><div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400"><Check size={18} /></div><div className="flex-1"><p className="text-[11px] font-bold text-white"><span className="text-emerald-400">{n.sender_name}</span> a accepté votre demande !</p></div></div>
                        )}
                      </div>
                    )) : <div className="p-10 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest">Aucune alerte</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10"><img src={profile?.avatar_url || undefined} alt="" className="w-full h-full object-cover" /></div>
            <button onClick={onOpenLogout} className="hidden sm:block p-2 text-slate-500 hover:text-red-400"><LogOut size={20} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenAuth('login')} className="text-slate-400 hover:text-white text-[11px] font-black uppercase tracking-widest px-6 py-3 transition-colors">Connexion</button>
            <button onClick={() => onOpenAuth('signup')} className="bg-sky-500 text-white text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all">S'inscrire</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
