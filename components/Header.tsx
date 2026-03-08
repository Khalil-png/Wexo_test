
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, X, Circle, Menu, UserPlus, Check, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { generateSnowflake } from '../utils/snowflake';
import { DEFAULT_AVATAR } from '../constants';
import { TabId } from '../types';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'message';
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content?: string;
  status: 'unread' | 'read';
  created_at: string;
}

interface HeaderProps {
  user: any;
  profile: any;
  onOpenAuth: (type: 'login' | 'signup') => void;
  onOpenLogout: () => void;
  onToggleSidebar: () => void;
  onTabChange: (id: any) => void;
  activeTab: TabId;
}

const NOTIF_BADGE_URL = "https://media-mrs2-3.cdn.whatsapp.net/v/t61.24694-24/648205020_2400601040389975_6782283630986826495_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa4AF8snxJ_C2NiaM_ALXpEsITJanZhm_2hnc7PIA8DQU8jw&oe=69BA9C61&_nc_sid=5e03e0&_nc_cat=106";

const NOTIF_SOUND_URL = "https://files.catbox.moe/d4x9vh.mp3";

const composeNotificationIcon = async (avatarUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(avatarUrl);

    const avatarImg = new Image();
    avatarImg.crossOrigin = "anonymous";
    avatarImg.src = avatarUrl;

    avatarImg.onload = () => {
      // Draw round avatar
      ctx.save();
      ctx.beginPath();
      ctx.arc(96, 96, 96, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, 0, 0, 192, 192);
      ctx.restore();

      // Draw badge
      const badgeImg = new Image();
      badgeImg.crossOrigin = "anonymous";
      badgeImg.src = NOTIF_BADGE_URL;
      badgeImg.onload = () => {
        const badgeSize = 64;
        const padding = 5;
        // Draw badge circle background
        ctx.beginPath();
        ctx.arc(192 - badgeSize/2 - padding, 192 - badgeSize/2 - padding, badgeSize/2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        
        // Draw badge image
        ctx.save();
        ctx.beginPath();
        ctx.arc(192 - badgeSize/2 - padding, 192 - badgeSize/2 - padding, badgeSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(badgeImg, 192 - badgeSize - padding, 192 - badgeSize - padding, badgeSize, badgeSize);
        ctx.restore();
        
        resolve(canvas.toDataURL());
      };
      badgeImg.onerror = () => resolve(canvas.toDataURL());
    };
    avatarImg.onerror = () => resolve(avatarUrl);
  });
};

const Header: React.FC<HeaderProps> = ({ user, profile, onOpenAuth, onOpenLogout, onToggleSidebar, onTabChange, activeTab }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Request browser notification permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Realtime subscription for notifications
      console.log('Subscribing to notifications for user:', user.id);
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('New notification received via realtime:', payload);
          const newNotif = payload.new as Notification;
          handleNewNotification(newNotif);
        })
        .subscribe((status) => {
          console.log('Notification subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleNewNotification = async (notif: Notification) => {
    console.log('Processing new notification:', notif);
    try {
      // Fetch sender info
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', notif.sender_id)
        .single();
      
      const senderName = senderProfile?.username || 'Quelqu\'un';
      const senderAvatar = senderProfile?.avatar_url || DEFAULT_AVATAR;
      
      // If it's a message and content is missing, try to fetch the last message
      let messageContent = (notif as any).content;
      if (notif.type === 'message' && !messageContent) {
        try {
          console.log('Fetching message content for notification...');
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('text')
            .eq('sender_id', notif.sender_id)
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (lastMsg) {
            messageContent = lastMsg.text;
            console.log('Message content found:', messageContent);
          }
        } catch (err) {
          console.error('Error fetching last message for notification:', err);
        }
      }

      const notifWithSender = { 
        ...notif, 
        sender_name: senderName, 
        sender_avatar: senderAvatar,
        content: messageContent
      };
      
      setNotifications(prev => [notifWithSender, ...prev]);

      // Play notification sound
      const audio = new Audio(NOTIF_SOUND_URL);
      audio.play().catch(e => console.log('Audio play failed:', e));

      // Browser notification
      if (Notification.permission === 'granted') {
        console.log('Notification permission granted, checking tab and visibility...');
        
        const isMessageTab = notif.type === 'message' && activeTab === 'message';
        const isTabVisible = document.visibilityState === 'visible';

        // Only skip if user is IN the message tab AND the tab is actually visible
        if (isMessageTab && isTabVisible) {
          console.log('User is in message tab and it is visible, skipping browser notification');
          return;
        }

        let title = 'Wexo Social';
        let body = '';
        
        if (notif.type === 'message') {
          title = senderName;
          body = messageContent || 'Vous a envoyé un message';
        } else if (notif.type === 'friend_request') {
          title = `Demande d'ami`;
          body = `${senderName} veut être votre ami !`;
        } else if (notif.type === 'friend_accepted') {
          title = `Demande acceptée`;
          body = `${senderName} a accepté votre demande !`;
        }

        console.log('Triggering browser notification:', title, body);
        const composedIcon = await composeNotificationIcon(senderAvatar || DEFAULT_AVATAR);
        
        const notification = new Notification(title, { 
          body, 
          icon: composedIcon,
          badge: NOTIF_BADGE_URL,
          tag: notif.id,
          silent: false,
          requireInteraction: false
        });

        notification.onclick = () => {
          window.focus();
          if (notif.type === 'message') {
            onTabChange('message');
            const url = new URL(window.location.href);
            url.searchParams.set('chat', notif.sender_id);
            window.history.pushState({}, '', url);
            window.dispatchEvent(new CustomEvent('select-chat', { detail: notif.sender_id }));
          } else if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
            onTabChange('message');
          }
        };
      } else {
        console.log('Notification permission status:', Notification.permission);
      }
    } catch (error) {
      console.error('Error handling new notification:', error);
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const fetchNotifications = async () => {
    console.log('Fetching notifications for user:', user.id);
    const { data, error } = await supabase
      .from('notifications')
      .select('*, sender:profiles!notifications_sender_id_fkey(username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }
    
    console.log('Fetched notifications:', data);
    if (data) {
      const enrichedNotifs = await Promise.all(data.map(async (n) => {
        let content = (n as any).content;
        if (n.type === 'message' && !content) {
          const { data: msg } = await supabase
            .from('messages')
            .select('text')
            .eq('sender_id', n.sender_id)
            .eq('receiver_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (msg) content = msg.text;
        }
        return { 
          ...n, 
          sender_name: (n as any).sender?.username || 'Utilisateur Wexo',
          sender_avatar: (n as any).sender?.avatar_url || DEFAULT_AVATAR,
          content
        };
      }));
      setNotifications(enrichedNotifs);
    }
  };

  const handleFriendAction = async (notifId: string, senderId: string, action: 'accept' | 'refuse') => {
    if (action === 'accept') {
      await supabase.from('friendships').update({ status: 'accepted' }).match({ requester_id: senderId, receiver_id: user.id });
      await supabase.from('notifications').insert([{ 
        id: generateSnowflake(),
        user_id: senderId, 
        type: 'friend_accepted', 
        sender_id: user.id,
        status: 'unread'
      }]);
    } else {
      await supabase.from('friendships').delete().match({ requester_id: senderId, receiver_id: user.id });
    }
    await supabase.from('notifications').delete().eq('id', notifId);
    fetchNotifications();
  };

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'message') {
      onTabChange('message');
      // Update URL and dispatch event
      const url = new URL(window.location.href);
      url.searchParams.set('chat', notif.sender_id);
      window.history.pushState({}, '', url);
      window.dispatchEvent(new CustomEvent('select-chat', { detail: notif.sender_id }));
      
      // Mark as read and remove from list (or just mark as read)
      supabase.from('notifications').delete().eq('id', notif.id).then(() => fetchNotifications());
      setShowNotifications(false);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-4 md:px-10 z-[100]">
      <div className="flex items-center gap-5">
        <button onClick={onToggleSidebar} className="lg:hidden p-2.5 text-slate-400 hover:text-white rounded-xl"><Menu size={24} /></button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center font-black text-xl">W</div>
          <span className="text-xl font-black text-white hidden xs:block uppercase">Wexo</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }} 
                className={`p-2.5 rounded-xl relative ${showNotifications ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center"><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notifications</h3></div>
                  <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => handleNotificationClick(n)}>
                        {n.type === 'friend_request' ? (
                          <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                              <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                                  <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10 text-white">
                                  <UserPlus size={10} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[11px] font-bold text-white truncate">{n.sender_name}</span>
                                  <span className="text-slate-500 text-[10px]">•</span>
                                  <span className="text-slate-400 text-[10px] font-medium">ami</span>
                                </div>
                                <p className="text-[11px] text-white/90 leading-tight">
                                  Veut être votre ami !
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleFriendAction(n.id, n.sender_id, 'accept'); }} className="flex-1 bg-white text-black text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-slate-200 transition-all"><Check size={14} /> Accepter</button>
                              <button onClick={(e) => { e.stopPropagation(); handleFriendAction(n.id, n.sender_id, 'refuse'); }} className="flex-1 bg-white/10 text-white text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-white/20 transition-all"><Trash2 size={14} /> Refuser</button>
                            </div>
                          </div>
                        ) : n.type === 'message' ? (
                          <div className="flex gap-4 items-start">
                            <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                                <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10 text-indigo-400">
                                <MessageCircle size={10} fill="currentColor" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-bold text-indigo-400 truncate">{n.sender_name}</span>
                                <span className="text-slate-500 text-[10px]">•</span>
                                <span className="text-slate-400 text-[10px] font-medium">message</span>
                              </div>
                              <p className="text-[11px] text-white/90 line-clamp-1 leading-tight">
                                {n.content || "Vous a envoyé un message !"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 items-start">
                            <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                                <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10 text-emerald-400">
                                <Check size={10} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-bold text-emerald-400 truncate">{n.sender_name}</span>
                                <span className="text-slate-500 text-[10px]">•</span>
                                <span className="text-slate-400 text-[10px] font-medium">ami</span>
                              </div>
                              <p className="text-[11px] text-white/90 leading-tight">
                                A accepté votre demande d'ami !
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )) : <div className="p-10 text-center text-[10px] text-slate-500 font-black uppercase tracking-widest">Aucune alerte</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center hover:border-white/30 transition-all active:scale-95"
              >
                <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
              </button>

              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-4 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-[110]">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                        <img src={profile?.avatar_url || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white truncate tracking-tight">
                          {profile?.username || user.email?.split('@')[0]}
                        </h3>
                        <button className="text-sky-400 text-[11px] font-bold hover:underline text-left">
                          Afficher votre profil (pas encore dispo)
                        </button>
                      </div>
                    </div>

                    <div className="h-px bg-white/10 my-4" />

                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        onOpenLogout();
                      }}
                      className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group"
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                        <LogOut size={20} />
                      </div>
                      <span className="text-sm font-bold text-white">Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => onOpenAuth('login')} className="text-slate-400 hover:text-white text-[11px] font-black uppercase tracking-widest px-6 py-3 transition-colors">Connexion</button>
            <button onClick={() => onOpenAuth('signup')} className="bg-white text-black text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-all">S'inscrire</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
