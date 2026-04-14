
import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, X, Circle, Menu, UserPlus, Check, Trash2, MessageCircle, User, Camera } from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { generateSnowflake } from '../utils/snowflake';
import { useClickOutside } from '../utils/hooks';
import { DEFAULT_AVATAR } from '../constants';
import Username from './Username';
import { Copy } from 'lucide-react';
import { TabId } from '../types';
import { isMobileDevice } from '../src/utils/device';

interface Notification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'message';
  sender_id: string;
  sender_name?: string;
  sender_avatar?: string;
  content?: string;
  status: 'unread' | 'read';
  created_at: any;
}

interface HeaderProps {
  user: any;
  profile: any;
  onOpenAuth: (type: 'login' | 'signup') => void;
  onOpenLogout: () => void;
  onToggleSidebar: () => void;
  onTabChange: (id: any) => void;
  activeTab: TabId;
  onOpenCamera?: () => void;
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

const Header: React.FC<HeaderProps> = ({ user, profile, onOpenAuth, onOpenLogout, onToggleSidebar, onTabChange, activeTab, onOpenCamera }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [copiedId, setCopiedId] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useClickOutside(notificationRef, () => setShowNotifications(false));
  useClickOutside(profileRef, () => setShowProfileMenu(false));

  useEffect(() => {
    if (!user?.uid) return;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Realtime subscription for notifications
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const enrichedNotifs = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
        const n = docSnapshot.data() as Notification;
        
        // Fetch sender info
        const senderRef = doc(db, 'profiles', n.sender_id);
        const senderSnap = await getDoc(senderRef);
        const senderData = senderSnap.exists() ? senderSnap.data() : null;

        let content = n.content;
        if (n.type === 'message' && !content) {
          try {
            const messagesRef = collection(db, 'messages');
            const mq = query(
              messagesRef,
              where('sender_id', '==', n.sender_id),
              where('receiver_id', '==', user.uid),
              orderBy('created_at', 'desc'),
              limit(1)
            );
            const mSnap = await getDocs(mq);
            if (!mSnap.empty) {
              content = mSnap.docs[0].data().text;
            }
          } catch (e) { /* Erreur silencieuse */ }
        }

        return {
          ...n,
          id: docSnapshot.id,
          sender_name: senderData?.username || 'Utilisateur Wexo',
          sender_avatar: senderData?.avatar_url || DEFAULT_AVATAR,
          content
        };
      }));

      // Check for new notifications to trigger sound/browser notif
      const newNotifs = enrichedNotifs.filter(n => 
        n.status === 'unread' && 
        !notifications.find(old => old.id === n.id)
      );

      newNotifs.forEach(n => handleNewNotification(n));

      setNotifications(enrichedNotifs);
    });

    return () => unsubscribe();
  }, [user?.uid, activeTab]);

  const handleNewNotification = async (notif: Notification) => {
    // Play notification sound
    const audio = new Audio(NOTIF_SOUND_URL);
    audio.play().catch(e => console.log('Audio play failed:', e));

    // Browser notification
    if (Notification.permission === 'granted') {
      const isMessageTab = notif.type === 'message' && activeTab === 'message';
      const isTabVisible = document.visibilityState === 'visible';

      if (isMessageTab && isTabVisible) return;

      let title = 'Wexo Social';
      let body = '';
      
      if (notif.type === 'message') {
        title = notif.sender_name || 'Nouveau message';
        body = notif.content || 'Vous a envoyé un message';
      } else if (notif.type === 'friend_request') {
        title = `Demande d'ami`;
        body = `${notif.sender_name} veut être votre ami !`;
      } else if (notif.type === 'friend_accepted') {
        title = `Demande acceptée`;
        body = `${notif.sender_name} a accepté votre demande !`;
      }

      const composedIcon = await composeNotificationIcon(notif.sender_avatar || DEFAULT_AVATAR);
      
      const browserNotif = new Notification(title, { 
        body, 
        icon: composedIcon,
        badge: NOTIF_BADGE_URL,
        tag: notif.id,
        silent: false,
        requireInteraction: false
      });

      browserNotif.onclick = () => {
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
    }
  };

  const handleFriendAction = async (notifId: string, senderId: string, action: 'accept' | 'refuse') => {
    if (!user?.uid) return;
    
    if (action === 'accept') {
      // Update friendship status
      const friendshipId = [senderId, user.uid].sort().join('_');
      await updateDoc(doc(db, 'friendships', friendshipId), {
        status: 'accepted'
      });

      // Create notification for sender
      await setDoc(doc(db, 'notifications', generateSnowflake()), {
        id: generateSnowflake(),
        user_id: senderId, 
        type: 'friend_accepted', 
        sender_id: user.uid,
        status: 'unread',
        created_at: serverTimestamp()
      });
    } else {
      const friendshipId = [senderId, user.uid].sort().join('_');
      await deleteDoc(doc(db, 'friendships', friendshipId));
    }

    // Delete the notification
    await deleteDoc(doc(db, 'notifications', notifId));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!user?.uid) return;

    if (notif.type === 'message') {
      onTabChange('message');
      const url = new URL(window.location.href);
      url.searchParams.set('chat', notif.sender_id);
      window.history.pushState({}, '', url);
      window.dispatchEvent(new CustomEvent('select-chat', { detail: notif.sender_id }));
      
      // Delete all message notifications from this sender
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', user.uid),
        where('sender_id', '==', notif.sender_id),
        where('type', '==', 'message')
      );
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      
      setShowNotifications(false);
    } else {
      await deleteDoc(doc(db, 'notifications', notif.id));
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!user?.uid) return;
    const q = query(collection(db, 'notifications'), where('user_id', '==', user.uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profile?.display_id) {
      navigator.clipboard.writeText(profile.display_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0f0f0f] border-b border-white/10 flex items-center justify-between px-4 md:px-10 z-[100]">
      <div className="flex items-center gap-5">
        <button onClick={onToggleSidebar} className="lg:hidden p-2.5 text-slate-400 hover:text-white rounded-2xl"><Menu size={24} /></button>
        <div 
          onClick={() => onTabChange('accueil')}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://n.uguu.se/ETulZagh.png" 
            className="w-10 h-10 object-cover" 
            style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
            alt="Wexo" 
            referrerPolicy="no-referrer" 
          />
          <span className="text-xl font-bold text-white hidden xs:block uppercase">Wexo</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobileDevice() && (
              <button 
                onClick={onOpenCamera}
                className="p-2.5 text-slate-400 hover:text-white rounded-2xl active:scale-95 transition-all"
              >
                <Camera size={22} />
              </button>
            )}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (Notification.permission === 'default') {
                    Notification.requestPermission();
                  }
                }} 
                className={`p-2.5 rounded-2xl relative ${showNotifications ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full border-2 border-[#0f0f0f] flex items-center justify-center">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute top-full right-0 mt-4 w-72 sm:w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-400">Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteAllNotifications(); }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                      >
                        Tout supprimer
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                    {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => handleNotificationClick(n)}>
                        {n.type === 'friend_request' ? (
                          <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                              <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                                  <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
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
                              <button onClick={(e) => { e.stopPropagation(); handleFriendAction(n.id, n.sender_id, 'accept'); }} className="flex-1 bg-white text-black text-xs font-bold py-2 rounded-2xl flex items-center justify-center gap-1 hover:bg-slate-200 transition-all"><Check size={14} /> Accepter</button>
                              <button onClick={(e) => { e.stopPropagation(); handleFriendAction(n.id, n.sender_id, 'refuse'); }} className="flex-1 bg-white/10 text-white text-xs font-bold py-2 rounded-2xl flex items-center justify-center gap-1 hover:bg-white/20 transition-all"><Trash2 size={14} /> Refuser</button>
                            </div>
                          </div>
                        ) : n.type === 'message' ? (
                          <div className="flex gap-4 items-start">
                            <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10">
                                <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
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
                                <img src={n.sender_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
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
                    )) : <div className="p-10 text-center text-xs text-slate-500 font-bold">Aucune alerte</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex items-center justify-center hover:border-white/30 transition-all active:scale-95"
              >
                <img src={profile?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
              </button>

              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-4 w-72 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-[110]">
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                        <img src={profile?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Username 
                          username={profile?.username || user.email?.split('@')[0]} 
                          displayName={profile?.display_name}
                          isVerified={profile?.is_verified} 
                          isAdmin={profile?.role === 'admin'}
                          email={profile?.email}
                          className="text-lg font-bold text-white truncate" 
                          badgeSize={18} 
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            ID: {profile?.display_id || 'N/A'}
                          </span>
                          {profile?.display_id && (
                            <button 
                              onClick={copyId}
                              className="p-1 hover:bg-white/10 rounded-md text-slate-500 hover:text-white transition-all"
                              title="Copier l'ID"
                            >
                              {copiedId ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                            </button>
                          )}
                        </div>
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
                      <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
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
            <button onClick={() => onOpenAuth('login')} className="text-slate-400 hover:text-white text-xs font-bold px-6 py-3 transition-colors">Connexion</button>
            <button onClick={() => onOpenAuth('signup')} className="bg-white text-black text-xs font-bold px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-all">S'inscrire</button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
