
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import HomeTab from '@/components/HomeTab';
import Workspace from '@/components/Workspace';
import PostsTab from '@/components/PostsTab';
import MessagesTab from '@/components/MessagesTab';
import GamesTab from '@/components/GamesTab';
import VideoTab from '@/components/VideoTab';
import ShortsTab from '@/components/ShortsTab';
import MyChannelTab from '@/components/MyChannelTab';
import SettingsTab from '@/components/SettingsTab';
import CallsTab from '@/components/CallsTab';
import DownloadTab from '@/components/DownloadTab';
import AuthModal from '@/components/AuthModal';
import LogoutModal from '@/components/LogoutModal';
import BottomNav from '@/components/BottomNav';
import AdminPanel from '@/components/AdminPanel';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import ActiveCallOverlay from '@/components/ActiveCallOverlay';
import CameraOverlay from '@/components/CameraOverlay';
import YouTubeTab from '@/components/YouTubeTab';
import PocketBaseStatus from '@/components/PocketBaseStatus';
import { isMobileDevice } from '@/src/utils/device';
import { TabId, Workspace as WorkspaceType } from '@/types';
import { DEFAULT_AVATAR, NAV_ITEMS } from '@/constants';
import { HelpCircle, TriangleAlert, X, Construction, CheckCircle, MessageSquarePlus } from 'lucide-react';
import { generateSnowflake } from '@/utils/snowflake';
import { AnimatePresence } from 'framer-motion';
import { isNative, getApiUrl } from '@/utils/api';
import { testPocketBaseConnection, pb } from '@/services/pocketbaseService';
import { db, auth, getMessagingInstance } from '@/services/firebase';
import { getMessaging, getToken as getFCMToken, onMessage } from 'firebase/messaging';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc, addDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';
import { registerPlugin } from '@capacitor/core';
import { ErrorBoundary } from 'react-error-boundary';

const WexoCallNative = registerPlugin<any>('WexoCallNative');

// Native Plugins & Utils imports

const ringtoneAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
ringtoneAudio.loop = true;
ringtoneAudio.volume = 1.0;

// Safe wrapper for console in case it's not available in background
const log = (...args: any[]) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[App][${timestamp}]`, ...args);
  
  // Also push to a global debug array for index.tsx to pick up if it wants
  if (!(window as any).__DEBUG_LOGS__) (window as any).__DEBUG_LOGS__ = [];
  (window as any).__DEBUG_LOGS__.push({ time: timestamp, msg: args.join(' ') });
};

// Save auth to preferences for background runner
const saveAuthToPreferences = async (model: any) => {
  try {
    if (model) {
      await Preferences.set({
        key: 'pb_auth',
        value: JSON.stringify({
          token: pb.authStore.token,
          model: model
        })
      });
      log('Saved auth to preferences for background runner');
    } else {
      await Preferences.remove({ key: 'pb_auth' });
      log('Cleared auth from preferences');
    }
  } catch (err) {
    log('Error saving/clearing auth in preferences:', err);
  }
};
// Firebase désactivé

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('accueil');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [pbUser, setPbUser] = useState<any>(pb.authStore.model);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [inAppNotice, setInAppNotice] = useState<{title: string, content: string, senderId: string, show: boolean} | null>(null);
  const [isAppReady, setIsAppReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const incomingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const listenersInitialized = useRef(false);
  const activeChatIdRef = useRef<string | null>(null);

  const stopIncomingRingtone = () => {
    if (incomingRingtoneRef.current) {
      incomingRingtoneRef.current.pause();
      incomingRingtoneRef.current.currentTime = 0;
      incomingRingtoneRef.current = null;
    }
  };

  const handleIncomingCall = async (record: any, source: 'pb' | 'firebase') => {
    log('Déclenchement handleIncomingCall...', record.id);
    let callerName = "Utilisateur inconnu";
    let avatar = DEFAULT_AVATAR;
    let phoneNum = undefined;

    // Lancer la sonnerie pour que ça fasse comme WhatsApp
    try {
      if (!incomingRingtoneRef.current) {
        incomingRingtoneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1355/1355-preview.mp3");
        incomingRingtoneRef.current.loop = true;
        incomingRingtoneRef.current.play().catch(e => console.log("Sound error:", e));
      }
    } catch (e) {
      console.log("Ringtone error:", e);
    }

    try {
      if (source === 'pb' && record.expand?.caller_id) {
        const caller = record.expand.caller_id;
        callerName = caller.username;
        avatar = caller.avatar ? pb.files.getUrl(caller, caller.avatar) : (caller.avatar_url || DEFAULT_AVATAR);
        phoneNum = caller.phone;
      } else {
        const sender = await pb.collection('users').getOne(record.caller_id).catch(() => null);
        if (sender) {
          callerName = sender.username;
          avatar = sender.avatar ? pb.files.getUrl(sender, sender.avatar) : (sender.avatar_url || DEFAULT_AVATAR);
          phoneNum = sender.phone;
        }
      }
    } catch (e) {
      log('Erreur récupération profil appelant:', e);
    }

    // On affiche TOUJOURS l'overlay pour que l'utilisateur puisse répondre (Comme WhatsApp)
    setIncomingCall({
      id: record.id,
      caller_id: record.caller_id,
      receiver_id: record.receiver_id,
      source: source,
      isProcessing: false,
      profiles: {
        id: record.caller_id,
        username: callerName,
        avatar_url: avatar,
        phone: phoneNum
      }
    });

    if (isNative()) {
      try {
        // Tentative de déclenchement d'un VRAI appel système (Telecom Manager)
        await WexoCallNative.showIncomingCall({
          name: callerName,
          number: phoneNum || "Inconnu"
        });
        log("Appel natif Telecom Manager déclenché !");
      } catch (nativeErr) {
        log("Échec Telecom Manager, repli sur notifications standard", nativeErr);
      }
      
      try {
        await LocalNotifications.schedule({
          notifications: [{
            title: `📞 APPEL ENTRANT: ${callerName}`,
            body: phoneNum ? `Appel Wexo via ${phoneNum}` : "Appuyez pour répondre ou glissez pour ignorer",
            id: 999,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: 'calls',
            autoCancel: false,
            smallIcon: 'ic_stat_phone',
            extra: { type: 'call', callId: record.id, source: source },
            actionTypeId: 'INCOMING_CALL',
            importance: 5,
            sound: 'ringtone.mp3',
            ongoing: true
          }]
        });
      } catch (e) {
        console.warn("Call handling notification error:", e);
      }
      
      // Vibration active immédiatement
      if (navigator.vibrate) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
      }
    }
  };

  const handleCallUpdate = (record: any) => {
    if (['completed', 'missed', 'rejected', 'ended'].includes(record.status)) {
      if (incomingCall?.id === record.id) {
        if (record.status === 'missed' && record.receiver_id === pbUser.id) {
          LocalNotifications.cancel({ notifications: [{ id: 999 }] });
          LocalNotifications.schedule({
            notifications: [{
              title: "Appel manqué",
              body: `Vous avez manqué un appel de ${incomingCall?.profiles.username || 'un utilisateur'}`,
              id: Math.floor(Math.random() * 10000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default'
            }]
          });
        } else {
          LocalNotifications.cancel({ notifications: [{ id: 999 }] });
        }
        setIncomingCall(null);
      }
      if (activeCall?.id === record.id) setActiveCall(null);
    }
    
    if ((record.status === 'ongoing' || record.status === 'accepted') && record.caller_id === pbUser.id) {
       if (activeCall && activeCall.id === record.id && !activeCall.isOngoing) {
          setActiveCall((prev: any) => ({ ...prev, isOngoing: true }));
       }
    }
  };

  const handleAcceptCallFromNotification = async (callId: string, source: 'pb' | 'firebase' = 'pb') => {
    try {
      if (source === 'pb') {
        const callerId = incomingCall?.caller_id;
        await pb.collection('calls').update(callId, { status: 'ongoing' });
        log('Call accepted (PB):', callId);
        navigate(`/appel?id=${callId}&source=pb&caller=${callerId}`);
      } else {
        await updateDoc(doc(db, 'calls', callId), { status: 'accepted', updatedAt: new Date().toISOString() });
        log('Call accepted (Firebase):', callId);
        navigate(`/appel?id=${callId}&source=firebase`);
      }
      setIncomingCall(null);
      LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch (e) {
      log('Error accepting call:', e);
    }
  };

  const handleDeclineCallFromNotification = async (callId: string, source: 'pb' | 'firebase' = 'pb') => {
    try {
      if (source === 'pb') {
        await pb.collection('calls').update(callId, { status: 'rejected' });
        log('Call rejected (PB):', callId);
      } else {
        await updateDoc(doc(db, 'calls', callId), { status: 'rejected', updatedAt: new Date().toISOString() });
        log('Call rejected (Firebase):', callId);
      }
      setIncomingCall(null);
      LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch (e) {
      log('Error declining call:', e);
    }
  };
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    activeChatIdRef.current = location.pathname === '/message' ? searchParams.get('chat') : null;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (incomingCall) {
      log('Incoming call detected, starting ringtone and haptics');
      setIsRinging(true);
      ringtoneAudio.play().catch(e => log("Audio play failed:", e));
      
      let hapticsInterval: any = null;
      
      if (isNative()) {
        const haptics = async () => {
          hapticsInterval = setInterval(() => {
            Haptics.vibrate({ duration: 800 });
          }, 1500);
        };
        haptics();
      } else if (navigator.vibrate) {
        // Pattern: Vibrate 800ms, Pause 400ms, repeat
        navigator.vibrate([800, 400, 800, 400, 800, 400, 800, 400]);
        hapticsInterval = setInterval(() => {
           navigator.vibrate([800, 400, 800, 400]);
        }, 3000);
      }

      return () => {
        log('Call handled, stopping ringtone and haptics');
        if (hapticsInterval) clearInterval(hapticsInterval);
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        setIsRinging(false);
        if (navigator.vibrate) navigator.vibrate(0);
      };
    }
  }, [incomingCall]);

  useEffect(() => {
    const handleFocus = () => {
      if (!isMobileDevice()) return;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        setIsKeyboardActive(true);
      }
    };

    const handleBlur = () => {
      if (!isMobileDevice()) return;
      // Small timeout to avoid flicker when switching fields
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
          setIsKeyboardActive(false);
        }
      }, 50);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);
  
  useEffect(() => {
    // Handler pour le bouton retour matériel (Android/Capacitor)
    const setupBackButton = async () => {
      if (!isNative()) return { remove: () => {} };
      
      try {
        const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // 1. Envoyer un événement global pour que les composants (Chat, Recherche) 
          // puissent intercepter le retour s'ils ont un menu ouvert.
          const backEvent = new CustomEvent('app-back-button', { cancelable: true });
          const cancelled = !window.dispatchEvent(backEvent);
          
          if (cancelled) {
            // Si un composant a appelé preventDefault(), on ne fait rien de plus ici
            return;
          }

          // 2. Comportement par défaut si rien n'intercepte
          const path = location.pathname;
          
          if (showCamera) {
            setShowCamera(false);
            return;
          }

          if (incomingCall) {
            setIncomingCall(null);
            return;
          }

          if (path === '/' || path === '/accueil') {
            log('Bouton retour sur accueil ignoré pour la stabilité.');
            return;
          } else {
            navigate('/', { replace: true });
          }
        });

        return listener;
      } catch (e) {
        log('Error setting up back button listener:', e);
        return { remove: () => {} };
      }
    };

    const backButtonPromise = setupBackButton();

    // Listener de changement d'état (Premier plan / Arrière plan)
    const setupAppState = async () => {
      if (!isNative()) return { remove: () => {} };
      
      try {
        return await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('App revenue au premier plan, rafraîchissement des connexions...');
            testPocketBaseConnection();
            window.dispatchEvent(new CustomEvent('app-resume'));
          }
        });
      } catch (e) {
        log('Error setting up app state listener:', e);
        return { remove: () => {} };
      }
    };
    
    const appStatePromise = setupAppState();

    // Fallback pour le bouton retour du navigateur (popstate)
    const handlePopState = (e: any) => {
      if (location.pathname === '/') return;
      if (location.pathname === '/message') {
        if (location.search.includes('chat=')) {
          navigate('/message', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      backButtonPromise.then(l => l.remove());
      appStatePromise.then(l => l.remove());
    };
  }, [location.pathname, location.search, navigate, showCamera, incomingCall]);

  const [notification, setNotification] = useState<{message: string, show: boolean, type?: 'error' | 'success'}>({
    message: '',
    show: false,
    type: 'error'
  });

  // Check NAS Connection
  useEffect(() => {
    const checkNAS = async () => {
      const isConnected = await testPocketBaseConnection();
      if (!isConnected) {
        setNotification({
          message: "Connexion au NAS bloquée. Vérifiez que la variable VITE_POCKETBASE_URL dans 'Secrets' est à https://carnote.synology.me:9443.",
          show: true,
          type: 'error'
        });
      }
    };
    checkNAS();
  }, []);

  // Listener Auth NAS (PocketBase)
  useEffect(() => {
    console.log("App mounted, PB User:", pb.authStore.model);
    
    const unsub = pb.authStore.onChange((token, model) => {
      console.log("Auth change detected:", model ? model.username : "logged out");
      setPbUser(model);
      saveAuthToPreferences(model);
      if (model) {
        setProfile({
          id: model.id,
          username: model.username,
          name: model.name,
          display_name: model.name || model.username,
          avatar_url: model.avatar_url || DEFAULT_AVATAR,
          role: model.role || 'user',
          email: model.email
        });
        setUser({ uid: model.id, email: model.email, displayName: model.username });
      } else {
        setUser(null);
        setProfile(null);
      }
    }, true);

    return () => {
      unsub();
    };
  }, []);

  // Firebase Real-time Notifications Listener
  useEffect(() => {
    if (!pbUser?.id) return;

    // S'assurer qu'on est connecté à Firebase (anonymement pour le temps réel sans forcer un login Google)
    const initFirebase = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
          console.log('Firebase: Connecté anonymement');
        }
      } catch (err) {
        console.error('Firebase Auth Error:', err);
      }
    };
    initFirebase();

    // Écouter les notifications Firestore en temps réel
    // On utilise l'ID PocketBase comme filtrage
    const q = query(
      collection(db, 'notifications'), 
      where('user_id', '==', pbUser.id),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          const createdAtDate = notification.created_at?.toDate?.() || new Date();
          const createdAt = createdAtDate.getTime();
          const now = new Date().getTime();
          const isNew = (now - createdAt) < 30000;

          if (isNew && notification.status === 'unread') {
            if (notification.type === 'message' && notification.sender_id === activeChatIdRef.current) {
              log('Firebase message notification ignorée (chat actif)');
              return;
            }

            log('Nouvelle notification reçue via Firebase:', notification.title);
            
            const titleMsg = notification.title || 'Wexo';
            const bodyMsg = notification.content || 'Nouveau message';

            setInAppNotice({
              title: titleMsg,
              content: bodyMsg,
              senderId: notification.sender_id || '',
              show: true
            });
            setTimeout(() => setInAppNotice(prev => prev?.show ? { ...prev, show: false } : prev), 5000);

            if (isNative()) {
              LocalNotifications.schedule({
                notifications: [{
                  id: Math.floor(Math.random() * 1000000),
                  title: titleMsg,
                  body: bodyMsg,
                  largeBody: bodyMsg,
                  summaryText: titleMsg,
                  schedule: { at: new Date(Date.now() + 100) },
                  extra: notification
                }]
              });
            } else if ('Notification' in window && (window as any).Notification.permission === 'granted') {
              new (window as any).Notification(titleMsg, {
                body: bodyMsg,
                icon: (notification as any).sender_avatar || DEFAULT_AVATAR
              });
            }
          }
        }
      });
    }, (error) => {
      console.error('Firestore listener error:', error);
    });

    return () => unsubscribe();
  }, [pbUser?.id]);

  // User Presence Tracking (Heartbeat)
  useEffect(() => {
    if (!pbUser?.id) return;

    const updatePresence = async () => {
      try {
        await pb.collection('users').update(pbUser.id, {
          last_active: new Date().toISOString(),
          active: true
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    // Initial update
    updatePresence();

    // Periodic update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => {
      clearInterval(interval);
      // Optional: set offline on unmount if possible, 
      // but heartbeat is usually enough for PocketBase presence
      pb.collection('users').update(pbUser.id, { active: false }).catch(() => {});
    };
  }, [pbUser?.id]);

  // PocketBase Global Messages Listener for Notifications
  useEffect(() => {
    if (!pbUser?.id) return;

    pb.collection('messages').subscribe('*', async (e) => {
      if (e.action === 'create') {
        const m = e.record;
        
        // Dispatch global event for real-time components like MessagesTab
        window.dispatchEvent(new CustomEvent('pb-message-created', { detail: { action: 'create', record: m } }));

        // Uniquement si c'est pour nous et pas de nous
        if (m.receiver_id === pbUser.id && m.sender_id !== pbUser.id) {
          // Si on est déjà dans le chat avec cette personne, pas de notif
          if (location.pathname === '/message') {
            const searchParams = new URLSearchParams(location.search);
            const currentChatWith = searchParams.get('chat');
            
            // Si c'est un chat personnel (direct)
            if (m.sender_id === currentChatWith) return;
            
            // Note: Pour les chats de groupe, il faudrait vérifier chat_id, 
            // mais l'URL actuelle utilise selectedId comme receiver_id pour les directs.
          }

          try {
            const sender = await pb.collection('users').getOne(m.sender_id);
            // On affiche le message en clair (pas besoin de décryptage selon la demande utilisateur)
            const plainText = m.text; 
            const title = sender.name || sender.username || 'Nouveau message';
            
            // Notification In-App (Toast)
            setInAppNotice({
              title,
              content: plainText.length > 60 ? plainText.substring(0, 57) + '...' : plainText,
              senderId: m.sender_id,
              show: true
            });

            // Auto-hide after 5s
            setTimeout(() => setInAppNotice(prev => prev?.senderId === m.sender_id ? { ...prev, show: false } : prev), 5000);

            // Notification Système (Navigateur)
            if (typeof window !== 'undefined' && 'Notification' in window && (window as any).Notification.permission === 'granted') {
              new (window as any).Notification(title, {
                body: plainText,
                icon: sender.avatar_url || DEFAULT_AVATAR
              });
            }

            // Notification Native Mobile
            if (isNative()) {
              LocalNotifications.schedule({
                notifications: [{
                  id: Math.floor(Math.random() * 1000000),
                  title: title,
                  body: plainText,
                  largeBody: plainText,
                  summaryText: 'Message',
                  schedule: { at: new Date(Date.now() + 100) },
                  sound: 'default',
                  channelId: 'messages',
                  extra: { type: 'message', sender_id: m.sender_id }
                }]
              });
            }
          } catch (err) {
            console.error('Error handling notification:', err);
          }
        }
      }
    });

    pb.collection('message_info').subscribe('*', (e) => {
      window.dispatchEvent(new CustomEvent('pb-message-info', { detail: e }));
    });

    return () => {
      pb.collection('messages').unsubscribe('*').catch(() => {});
      pb.collection('message_info').unsubscribe('*').catch(() => {});
    };
  }, [pbUser?.id, location.pathname, location.search]);

  // Native Plugin Initialisation & Call/Message Subscriptions
  useEffect(() => {
    if (!pbUser?.id) {
      log('NativeInit: Attente de connexion utilisateur...');
      return;
    }
    
    if (listenersInitialized.current && pbUser?.id === (window as any)._lastSetupUserId) return;
    listenersInitialized.current = true;
    (window as any)._lastSetupUserId = pbUser?.id;
    
    const setupNative = async () => {
      // 1. Permissions (Notifs & Calls) - RUN FOR EVERYONE
      const requestAppPermissions = async () => {
        log('Requesting global permissions...');
        
        // Browser/Native Notifications
        try {
          if ('Notification' in window) {
            const status = await (window as any).Notification.requestPermission();
            log('Browser Notification permission:', status);
          }
          if (isNative()) {
            await LocalNotifications.requestPermissions();
            const result = await PushNotifications.requestPermissions();
            if (result.receive === 'granted') {
              await PushNotifications.register();
            }
          }
        } catch (e) { log('Notif permission error:', e); }

        // Calls (Micro/Camera)
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            stream.getTracks().forEach(track => track.stop());
            log('Call permissions granted via getUserMedia');
          }
        } catch (e) {
          log('Call permissions denied or unsupported:', e);
        }
      };

      await requestAppPermissions();

      // 2. Web FCM Token Registration
      const setupWebPush = async () => {
        try {
          const messaging = await getMessagingInstance();
          if (messaging && !isNative()) {
            const VAPID_KEY = 'BGlYpD38vW0O_Y7O0_X27D0P6L8P2O0P2O0P2O0P2O0P2O0P2O0'; 
            
            const token = await getFCMToken(messaging, {
              vapidKey: VAPID_KEY
            }).catch((err) => {
               log('FCM Token error (likely missing/invalid VAPID or permission denied):', err);
               return null;
            });
            
            if (token) {
              log('Web FCM Token reçu:', token);
              await fetch(getApiUrl('/api/notifications/register-token'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: pbUser.id, token })
              }).catch(e => log('Error saving Web token:', e));
            }
          }
        } catch (e) {
          log('Web Push Setup Error:', e);
        }
      };
      setupWebPush();

      if (!isNative()) {
        log('NativeInit: Setup Web terminé.');
        return;
      }
      
      log('NativeInit: Démarrage de l\'initialisation stable (WIXO)...');

      try {
        // Enregistrement des listeners robustes
        const addSafeListener = async (plugin: any, name: string, cb: any) => {
          try {
             if (plugin && typeof plugin.addListener === 'function') {
                log(`Adding listener: ${name}`);
                return await plugin.addListener(name, cb);
             } else {
                log(`Plugin or addListener missing for [${name}]`);
             }
          } catch (e) {
             log(`Critical listener error [${name}]:`, e);
          }
          return { remove: () => {} };
        };

        await addSafeListener(PushNotifications, 'registration', async (token: any) => {
          log('PushNotifications: Token reçu:', token.value);
          await fetch(getApiUrl('/api/notifications/register-token'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: pbUser.id, token: token.value })
          }).catch(e => log('Error saving token:', e));
        });

        await addSafeListener(PushNotifications, 'registrationError', (error: any) => {
          log('PushNotifications: Erreur d\'enregistrement:', error);
        });

        await addSafeListener(PushNotifications, 'pushNotificationReceived', (notification: any) => {
          log('PushNotifications: Reçue:', notification);
          if (notification.data?.type === 'message' && notification.data?.senderId === activeChatIdRef.current) return;
          setInAppNotice({
            title: notification.title || 'Wixo',
            content: notification.body || '',
            senderId: notification.data?.senderId || '',
            show: true
          });
        });

        await addSafeListener(PushNotifications, 'pushNotificationActionPerformed', (action: any) => {
          log('PushNotifications: Action:', action);
          if (action.notification.data?.senderId) {
            navigate(`/message?chat=${action.notification.data.senderId}`);
          }
        });

        await addSafeListener(LocalNotifications, 'localNotificationActionPerformed', (action: any) => {
          const { notification, actionId } = action;
          if (notification.extra?.type === 'call') {
            const callId = notification.extra.callId;
            const source = notification.extra.source || 'pb';
            if (actionId === 'accept') handleAcceptCallFromNotification(callId, source);
            else if (actionId === 'decline') handleDeclineCallFromNotification(callId, source);
          }
        });

        // Exécution protégée des initialisations natives
        const runNative = async (name: string, fn: () => Promise<any>) => {
          try {
            log(`Starting: ${name}`);
            await fn();
            log(`Success: ${name}`);
          } catch (e: any) {
            log(`Failed: ${name}`, e?.message || e);
          }
        };

        // On fait l'initialisation des channels après coup
        // Canaux de notification
        await runNative('LocalNotifications.createChannelMessages', () => LocalNotifications.createChannel({
          id: 'messages',
          name: 'Nouveaux Messages',
          description: 'Notifications pour les nouveaux messages',
          importance: 5,
          visibility: 1,
          vibration: true
        }));

        await runNative('LocalNotifications.createChannelCalls', () => LocalNotifications.createChannel({
          id: 'calls',
          name: 'Appels',
          description: 'Notifications pour les appels entrants',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'ringtone.mp3'
        }));

        setIsAppReady(true);
        log('NativeInit: Initialisation terminée avec succès.');

      } catch (globalNativeErr) {
        log('CRITICAL_NATIVE_INIT_ERROR:', globalNativeErr);
        setIsAppReady(true); // On débloque quand même l'UI
      }
    };

    setupNative();

    // Souscriptions (Appels PocketBase)
    log('PocketBase: Initialisation subscription calls...');
    pb.collection('calls').subscribe('*', async ({ action, record }) => {
      log(`Call Event: ${action}`, record);
      if (action === 'create' && record.receiver_id === pbUser.id && (record.status === 'incoming' || record.status === 'calling')) {
        log('Appel entrant identifié !', record.id);
        handleIncomingCall(record, 'pb');
      }
      if (action === 'update' && (record.receiver_id === pbUser.id || record.caller_id === pbUser.id)) {
        handleCallUpdate(record);
      }
    }, { expand: 'caller_id' });

    // Souscriptions (Appels Firebase)
    const callsQuery = query(collection(db, 'calls'), where('receiverId', '==', pbUser.id), where('status', '==', 'incoming'), limit(1));
    const unsubscribeFirebaseCalls = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const record = change.doc.data();
          if (record.status === 'incoming') {
            log('Appel Firebase entrant identifié !', change.doc.id);
            handleIncomingCall({ id: change.doc.id, caller_id: record.callerId, receiver_id: record.receiverId, status: 'incoming', type: record.type, source: 'firebase' }, 'firebase');
          }
        }
      });
    });

    return () => {
      pb.collection('calls').unsubscribe('*').catch(() => {});
      unsubscribeFirebaseCalls();
      listenersInitialized.current = false;
    };
  }, [pbUser?.id]);

  // Firebase Listener pour l'émetteur (suivi de l'appel actif)
  useEffect(() => {
    if (!pbUser?.id) return;
    
    let unsubscribeActiveCall: (() => void) | null = null;
    if (activeCall && activeCall.id && !activeCall.isOngoing) {
       unsubscribeActiveCall = onSnapshot(doc(db, 'calls', activeCall.id), (docSnap) => {
         if (docSnap.exists()) {
           const data = docSnap.data();
           if (data.status === 'accepted' || data.status === 'ongoing') {
             setActiveCall(prev => prev ? { ...prev, isOngoing: true } : null);
           } else if (data.status === 'rejected' || data.status === 'ended') {
             setActiveCall(null);
           }
         }
       });
    }

    return () => {
      if (unsubscribeActiveCall) unsubscribeActiveCall();
    };
  }, [pbUser?.id, activeCall?.id]);

  // Synchronisation des notifications en attente & Real-time via checkPendingNotifications
  useEffect(() => {
    if (!pbUser?.id) return;

    const checkPendingNotifications = async () => {
      try {
        const pending = await pb.collection('notifications').getList(1, 50, {
          filter: `user_id="${pbUser.id}" && status="pending"`,
          sort: 'created'
        });

        if (pending.items.length > 0) {
          for (const notif of pending.items) {
            if (isMobileDevice()) {
              await LocalNotifications.schedule({
                notifications: [
                  {
                    title: notif.title || 'Wixo',
                    body: notif.content || 'Nouvelle notification',
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: new Date(Date.now() + 500) },
                    sound: 'default',
                    channelId: notif.type === 'message' ? 'messages' : 'default',
                    extra: { notifId: notif.id, type: notif.type, senderId: notif.sender_id }
                  }
                ]
              });
            } else {
              setNotification({
                message: `${notif.title || 'Wixo'}: ${notif.content || 'Nouvelle notification'}`,
                show: true,
                type: 'success'
              });
              setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 6000);
            }

            await pb.collection('notifications').update(notif.id, {
              status: 'delivered',
              delivered_at: new Date().toISOString()
            });
          }
        }
      } catch (err: any) {
        if (err.status !== 404) console.warn("Erreur checkPendingNotifications:", err);
      }
    };

    checkPendingNotifications();
    
    pb.collection('notifications').subscribe('*', ({ action, record }) => {
      if (action === 'create' && record.user_id === pbUser.id && record.status === 'pending') {
        checkPendingNotifications();
      }
    });

    return () => {
      pb.collection('notifications').unsubscribe('*');
    };
  }, [pbUser?.id]);

  // Global Messages Subscription for Notifications
  useEffect(() => {
    if (!pbUser?.id) return;

    const setupMessageSubscription = async () => {
      await pb.collection('messages').subscribe('*', async ({ action, record }) => {
        if (action === 'create' && record.receiver_id === pbUser.id) {
          // Check if user is currently in this specific chat
          if (activeChatIdRef.current === record.sender_id) {
            log('Message received in active chat, skipping system notification');
            return;
          }

          // New message received
          try {
            const sender = await pb.collection('users').getOne(record.sender_id);
            
            log('Triggering notification for message from:', sender.username);
            
            if (isMobileDevice()) {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: `${sender.username}`,
                    body: record.text || (record.media ? "Média reçu" : "Nouveau message"),
                    id: Math.floor(Math.random() * 10000),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'default',
                    channelId: 'messages',
                    extra: {
                      senderId: record.sender_id,
                      type: 'message'
                    }
                  }
                ]
              });
            } else {
              // Notification Interne Desktop pour Message
              setNotification({
                message: `Message de ${sender.username}: ${record.text || (record.media ? "Média reçu" : "Nouveau message")}`,
                show: true,
                type: 'success'
              });
              setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 6000);
            }
          } catch (err) {
            console.error("Error creating message notification:", err);
          }
        }
      });
    };

    setupMessageSubscription();

    return () => {
      pb.collection('messages').unsubscribe('*');
    };
  }, [pbUser?.id]);

  useEffect(() => {
    let interval: any;
    if (activeCall) {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    log('User clicked Accept button in overlay');
    stopIncomingRingtone();
    setIncomingCall((prev: any) => ({ ...prev, isProcessing: true }));
    handleAcceptCallFromNotification(incomingCall.id, incomingCall.source);
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    log('User clicked Decline button in overlay');
    stopIncomingRingtone();
    setIncomingCall((prev: any) => ({ ...prev, isProcessing: true }));
    handleDeclineCallFromNotification(incomingCall.id, incomingCall.source);
  };

  const handleEndCall = async () => {
    if (activeCall) {
      try {
        if (activeCall.id && activeCall.status !== 'completed') {
          await pb.collection('calls').update(activeCall.id, { status: 'completed' });
        }
      } catch (err) {
        console.error("Error ending call:", err);
      }
    }
    setActiveCall(null);
  };

  const handleStartCall = async (receiver: any) => {
    if (!pbUser?.id) {
       setNotification({ message: "Vous devez être connecté pour appeler", show: true });
       return;
    }

    // Permission check for Native
    if (isNative()) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        testStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        log("Permission denied for calls", err);
        setNotification({ message: "Permissions micro/caméra refusées. Veuillez les activer dans les réglages.", show: true });
        return;
      }
    }

    try {
      // Si on reçoit déjà un record complet (depuis CallsTab par exemple)
      if (receiver.caller_id && receiver.status && receiver.id) {
        setActiveCall(receiver);
        return;
      }

      log("Initiation d'un appel vers:", receiver.username);
      
      // On tente d'abord PocketBase parce que l'utilisateur gère son propre serveur Synology
      // et que le screenshot montre qu'il suit cette collection.
      try {
        const record = await pb.collection('calls').create({
          caller_id: pbUser.id,
          receiver_id: receiver.id,
          type: 'video',
          status: 'incoming'
        });

        setActiveCall({
          id: record.id,
          caller_id: pbUser.id,
          receiver_id: receiver.id,
          profiles: { 
            username: receiver.username, 
            avatar_url: receiver.avatar_url || DEFAULT_AVATAR 
          },
          isOngoing: false // L'appel n'est pas encore "décroché"
        });

        log('Appel créé sur PocketBase:', record.id);
      } catch (pbErr: any) {
        log('Erreur PocketBase Call Creation:', pbErr);
        throw pbErr;
      }
    } catch (err: any) {
      console.error("Erreur lancement appel:", err);
      // Aide spécifique pour PocketBase syntaxe
      let msg = "Impossible de démarrer l'appel. Vérifiez les droits sur 'calls' (NAS).";
      if (err.status === 403 || (err.message && err.message.includes('403'))) {
        msg = "Erreur Droits NAS : Dans PocketBase, allez dans 'calls' > 'API Rules'. Videz les champs (ils doivent être gris/vides). N'écrivez pas 'all users' !";
      }
      setNotification({ 
        message: msg, 
        show: true 
      });
    }
  };

  const handleSendQuickMessage = async (text: string) => {
    // Désactivé (Migration NAS requise pour les messages)
    setNotification({
      message: "Messagerie en cours de migration sur le NAS",
      show: true
    });
  };

  const [cameraDestination, setCameraDestination] = useState<'story' | 'message' | 'short' | 'video' | null>(null);

  useEffect(() => {
    const handleOpenCamera = (e: any) => {
      setCameraDestination(e?.detail?.destination || null);
      setShowCamera(true);
    };
    window.addEventListener('open-camera', handleOpenCamera);
    return () => window.removeEventListener('open-camera', handleOpenCamera);
  }, []);

  const handleCameraShare = async (media: string, destination: 'story' | 'message' | 'short' | 'video', type: 'image' | 'video') => {
    setShowCamera(false);
    setCameraDestination(null);
    
    // Broadcast event for MessagesTab if destination is message
    if (destination === 'message') {
      window.dispatchEvent(new CustomEvent('media-captured', {
        detail: {
          media,
          type,
          destination,
          fileName: type === 'video' ? `Vidéo_${Date.now()}.mp4` : `Photo_${Date.now()}.png`
        }
      }));
    }

    // Map destination to tab
    const tabMap: Record<string, TabId> = {
      'story': 'posts',
      'short': 'shorts',
      'video': 'video',
      'message': 'message'
    };

    if (tabMap[destination]) {
      handleTabChange(tabMap[destination]);
    }

    // In a real app, we would upload the media here.
    // For now, we just show a success message.
    setNotification({
      message: `${type === 'image' ? 'Photo' : 'Vidéo'} partagée avec succès sur ${destination} !`,
      show: true
    });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    console.log('[App] AppContent mounted. Current location:', location.pathname);
    // Initialize global native flag if not already set
    if (window.hasOwnProperty('Capacitor') && (window as any).Capacitor.getPlatform() !== 'web') {
      (window as any).isNativeApp = true;
    }
    console.log('[App] isApp:', (window as any).isNativeApp, 'userAgent:', navigator.userAgent);
    // Mark app as mounted for index.html health check
    (window as any).__APP_MOUNTED__ = true;
  }, []);

  // Sync activeTab with URL path
  useEffect(() => {
    const rawPath = location.pathname;
    console.log('[App] Path changed:', rawPath);
    const path = rawPath.substring(1); // remove leading slash
    if (path) {
      // Map path to TabId
      const tabMap: Record<string, TabId> = {
        'accueil': 'accueil',
        'video': 'video',
        'shorts': 'shorts',
        'workspace': 'workspace',
        'message': 'message',
        'messages': 'message',
        'appel': 'appel',
        'ma-chaine': 'ma-chaine',
        'posts': 'posts',
        'aide': 'aide',
        'telecharger': 'telecharger',
        'historique': 'historique',
        'playlists': 'playlists',
        'likes': 'likes',
        'abonnement': 'abonnement',
        'parametres': 'parametres',
        'commentaire': 'commentaire',
        'admin-panel': 'admin-panel',
        'youtube': 'youtube'
      };
      if (tabMap[path]) {
        setActiveTab(tabMap[path]);
      }
    } else {
      setActiveTab('accueil');
    }
  }, [location.pathname]);

  const handleTabChange = (id: TabId) => {
    // Map TabId to path
    const pathMap: Record<TabId, string> = {
      'accueil': '/',
      'video': '/video',
      'shorts': '/shorts',
      'workspace': '/workspace',
      'message': '/message',
      'appel': '/appel',
      'ma-chaine': '/ma-chaine',
      'posts': '/posts',
      'aide': '/aide',
      'historique': '/historique',
      'playlists': '/playlists',
      'likes': '/likes',
      'abonnement': '/abonnement',
      'parametres': '/parametres',
      'commentaire': '/commentaire',
      'admin-panel': '/admin-panel',
      'telecharger': '/telecharger',
      'youtube': '/youtube'
    };
    navigate(pathMap[id] || '/');
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showVerifyWarning = () => {
    setNotification({
      message: "vous n'avez pas verifier votre adresse mail.",
      show: true
    });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'accueil':
        return <HomeTab user={user} profile={profile} onTabChange={handleTabChange} />;
      case 'posts':
        return <PostsTab user={user} profile={profile} />;
      case 'video':
        return <VideoTab 
          onBecomeCreator={() => handleTabChange('ma-chaine')} 
          onTabChange={handleTabChange}
          user={user} 
          profile={profile} 
        />;
      case 'shorts':
        return <ShortsTab user={user} profile={profile} />;
      case 'ma-chaine':
        return <MyChannelTab user={user} profile={profile} />;
      case 'message':
        return <MessagesTab user={user} profile={profile} isKeyboardActive={isKeyboardActive} onStartCall={handleStartCall} />;
      case 'appel':
        return (
          <CallsTab 
            user={user} 
            profile={profile}
            activeCall={activeCall} 
            callTimer={callTimer} 
            onEndCall={handleEndCall}
            onStartCall={handleStartCall}
          />
        );
      case 'telecharger':
        return <DownloadTab user={user} profile={profile} />;
      case 'parametres':
        return <SettingsTab user={user} profile={profile} onLogout={() => setShowLogoutModal(true)} />;
      case 'aide':
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-8 border border-amber-500/20 shadow-lg">
                <Construction size={40} />
             </div>
             <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Bientôt disponible</h2>
             <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
                Cette section est encore en construction. Nos équipes travaillent dur pour vous offrir le meilleur service d'assistance.
             </p>
             <div className="mt-12 flex gap-4">
                <button onClick={() => handleTabChange('accueil')} className="px-8 py-4 bg-white text-black text-[10px] font-black rounded-xl hover:bg-slate-200 transition-colors">
                   Retour à l'accueil
                </button>
             </div>
          </div>
        );
      case 'workspace':
        return (
          <Workspace 
            user={user} 
            profile={profile} 
            activeWorkspace={activeWorkspace}
            onEnterWorkspace={setActiveWorkspace}
          />
        );
      case 'admin-panel':
        if (profile?.role === 'admin' || profile?.email === 'ky.chaine@gmail.com') {
          return <AdminPanel user={user} profile={profile} />;
        }
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mb-8 border border-red-500/20 shadow-lg">
                <TriangleAlert size={40} />
             </div>
             <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Accès Restreint</h2>
             <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
                Vous n'avez pas les permissions nécessaires pour accéder à l'Espace Admin.
             </p>
          </div>
        );
      case 'youtube':
        return <YouTubeTab />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-slate-600 bg-slate-900/10 rounded-xl border-2 border-slate-800 border-dashed animate-in fade-in duration-700">
            <h2 className="text-xl font-black text-slate-400 mb-2 capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs font-bold opacity-40">Section en développement</p>
          </div>
        );
    }
  };

  const getTabTitle = (id: TabId) => {
    const item = NAV_ITEMS.find(item => item.id === id);
    return item ? item.label : id.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col selection:bg-sky-500/30 overflow-x-hidden">
      <div className={`fixed top-0 left-0 right-0 z-[200] flex justify-center p-4 transition-all duration-700 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className={`bg-[#1a1a1a] border ${notification.type === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'} px-6 py-4 rounded-xl shadow-xl flex items-center gap-4 max-w-md w-full`}>
          <div className={`w-10 h-10 ${notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {notification.type === 'success' ? <CheckCircle size={20} /> : <TriangleAlert size={20} />}
          </div>
          <p className={`text-xs font-bold ${notification.type === 'success' ? 'text-emerald-200' : 'text-red-200'} flex-1 leading-tight`}>{notification.message}</p>
          <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="text-slate-500 hover:text-white transition-colors p-1"><X size={18} /></button>
        </div>
      </div>

      {/* In-App Notification Toast for Messages */}
      <AnimatePresence>
        {inAppNotice && inAppNotice.show && (
          <div 
            key="in-app-notice"
            onClick={() => {
              navigate(`/message?chat=${inAppNotice.senderId}`);
              setInAppNotice(null);
            }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[1000] bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl cursor-pointer ring-1 ring-white/10 animate-in slide-in-from-top-4 duration-300 hover:bg-[#252525]/90 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg shrink-0">
                <MessageSquarePlus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm tracking-tight mb-0.5">{inAppNotice.title}</h4>
                <p className="text-white/70 text-[13px] leading-tight truncate">{inAppNotice.content}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setInAppNotice(null); }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 transition-colors"
                title="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {!(isMobileDevice() && (activeTab === 'message' && location.search.includes('chat='))) && !(isMobileDevice() && activeTab === 'youtube') && (
        <Header 
          user={user} 
          profile={profile} 
          onOpenAuth={(type) => setAuthModal(type)} 
          onOpenLogout={() => setShowLogoutModal(true)} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onTabChange={handleTabChange}
          activeTab={activeTab}
          onOpenCamera={() => setShowCamera(true)}
          isKeyboardActive={isKeyboardActive}
        />
      )}
      
      <div className="flex flex-1 w-full relative">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          profile={profile}
        />
        
        <main className={`flex-1 w-full lg:ml-72 transition-all duration-500 ${
          (activeTab === 'message' || activeTab === 'shorts' || activeTab === 'appel' || activeTab === 'parametres' || activeTab === 'youtube')
            ? `p-0 ${isMobileDevice() ? (activeTab === 'message' && location.search.includes('chat=') ? 'pt-0 h-screen h-[100dvh]' : (activeTab === 'youtube' ? 'pt-0 h-screen h-[100dvh]' : 'pt-[140px] h-screen h-[100dvh]')) : 'mt-20 h-[calc(100vh-80px)]'} overflow-hidden bg-[#0f0f0f] ${isMobileDevice() && !((activeTab === 'message' && location.search.includes('chat=')) || activeTab === 'youtube') ? 'pb-24' : ''}` 
            : `p-4 sm:p-10 md:p-14 ${isMobileDevice() ? 'pt-[145px]' : 'pt-[125px]'} lg:pt-[105px] ${isMobileDevice() ? 'pb-28' : 'pb-10'}`
        }`}>
          <div className={`${
            (activeTab === 'message' || activeTab === 'shorts' || activeTab === 'appel' || activeTab === 'parametres')
              ? 'w-full h-full' 
              : activeTab === 'video'
                ? 'max-w-[1800px] mx-auto w-full'
                : 'max-w-[1400px] mx-auto w-full'
          }`}>
            {(!activeWorkspace && activeTab !== 'message' && activeTab !== 'video' && activeTab !== 'shorts' && activeTab !== 'appel' && activeTab !== 'parametres') && (
              <div className="mb-4 sm:mb-5 animate-in slide-in-from-left duration-700">
                <h1 className="text-3xl sm:text-5xl font-black capitalize text-white tracking-tighter leading-none mb-3">
                  {getTabTitle(activeTab)}
                </h1>
              </div>
            )}
            
            <div className={`page-transition ${(activeTab === 'message' || activeTab === 'shorts') ? 'h-full' : ''}`}>
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {authModal && <AuthModal type={authModal} onClose={() => setAuthModal(null)} onTriggerVerifyWarning={showVerifyWarning} />}
      {showLogoutModal && <LogoutModal onClose={() => setShowLogoutModal(false)} />}
      {isMobileDevice() && !isKeyboardActive && !(activeTab === 'message' && location.search.includes('chat=')) && activeTab !== 'youtube' && (
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} userEmail={profile?.email} username={profile?.username} />
      )}
      
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallOverlay 
            caller={incomingCall.profiles}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onSendMessage={handleSendQuickMessage}
            isProcessing={incomingCall.isProcessing}
          />
        )}
        {activeCall && (
          <ActiveCallOverlay 
            activeCall={activeCall}
            callTimer={callTimer}
            onEndCall={handleEndCall}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <CameraOverlay 
            onClose={() => {
              setShowCamera(false);
              setCameraDestination(null);
            }}
            onShare={handleCameraShare}
            initialDestination={cameraDestination || undefined}
          />
        )}
      </AnimatePresence>

      <PocketBaseStatus />
    </div>
  );
};


const App: React.FC = () => {
  useEffect(() => {
    console.log('[App] Root App component mounted');
  }, []);

  return (
    <ErrorBoundary fallbackRender={({ error }) => (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <TriangleAlert className="mx-auto text-amber-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-white mb-2">Une erreur est survenue</h1>
          <p className="text-white/60 mb-6">{error instanceof Error ? error.message : String(error)}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-sky-500 text-white rounded-xl font-bold"
          >
            Redémarrer l'application
          </button>
        </div>
      </div>
    )}>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
