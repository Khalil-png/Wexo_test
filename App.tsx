
import React, { useState, useEffect } from 'react';
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
import CallsTab from '@/components/CallsTab';
import DownloadTab from '@/components/DownloadTab';
import AuthModal from '@/components/AuthModal';
import LogoutModal from '@/components/LogoutModal';
import BottomNav from '@/components/BottomNav';
import AdminPanel from '@/components/AdminPanel';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';
import CameraOverlay from '@/components/CameraOverlay';
import PocketBaseStatus from '@/components/PocketBaseStatus';
import { isMobileDevice } from '@/src/utils/device';
import { TabId, Workspace as WorkspaceType } from '@/types';
import { DEFAULT_AVATAR, NAV_ITEMS } from '@/constants';
import { HelpCircle, TriangleAlert, X, Construction, CheckCircle } from 'lucide-react';
import { generateSnowflake } from '@/utils/snowflake';
import { AnimatePresence } from 'motion/react';
import { testPocketBaseConnection, pb } from '@/services/pocketbaseService';
import { LocalNotifications } from '@capacitor/local-notifications';
// Firebase désactivé

const CURRENT_VERSION = "0.0.1";

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
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

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
  
  const [notification, setNotification] = useState<{message: string, show: boolean, type?: 'error' | 'success'}>({
    message: '',
    show: false,
    type: 'error'
  });

  // Check Permissions on Startup (Mobile)
  useEffect(() => {
    const requestPermissions = async () => {
      if (!isMobileDevice()) return;

      try {
        // Request Notification Permissions (Android 13+)
        const perm = await LocalNotifications.requestPermissions();
        console.log('Notification permissions status:', perm.display);

        // Create specialized notification channels for Android
        try {
          // General messages channel
          await LocalNotifications.createChannel({
            id: 'messages',
            name: 'Messages',
            description: 'Notifications pour les nouveaux messages',
            importance: 5, 
            visibility: 1, 
            sound: 'default',
            vibration: true
          });

          // High priority calls channel
          await LocalNotifications.createChannel({
            id: 'calls',
            name: 'Appels entrants',
            description: 'Alertes lors d\'un appel entrant',
            importance: 5, // High importance
            visibility: 1, // Public/Lockscreen
            sound: 'ringtone.mp3', // Note: Needs to be in res/raw to work, otherwise default
            vibration: true,
            lights: true,
            lightColor: '#10b981'
          });
          
          // Default channel for backward compatibility
          await LocalNotifications.createChannel({
            id: 'default',
            name: 'Général',
            description: 'Autres notifications',
            importance: 3,
            visibility: 1
          });

          console.log('Notification channels created');

          // Register Action Types (Buttons in notifications)
          await LocalNotifications.registerActionTypes({
            types: [
              {
                id: 'INCOMING_CALL',
                actions: [
                  {
                    id: 'accept',
                    title: 'Répondre',
                    foreground: true
                  },
                  {
                    id: 'decline',
                    title: 'Décliner',
                    destructive: true,
                    foreground: false
                  }
                ]
              }
            ]
          });
        } catch (err) {
          console.error('Failed to create notification channels:', err);
        }

        // Standard browser/webview permission request as fallback/complement
        // Use window.Notification to avoid ReferenceError
        if (typeof window !== 'undefined' && 'Notification' in window) {
           const winNotif = (window as any).Notification;
           if (winNotif && winNotif.permission !== 'granted') {
             try {
               await winNotif.requestPermission();
             } catch (e) {
               console.warn('Fallback Notification.requestPermission failed', e);
             }
           }
        }

        // Proactive Camera/Mic permission request
        // This ensures the OS sees the app as "using" these features
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(track => track.stop());
            console.log('Camera/Mic permissions granted proactively');
          } catch (err) {
            console.warn('Initial camera/mic permission request failed or was denied:', err);
          }
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
      }
    };

    requestPermissions();
  }, []);

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
      if (model) {
        setProfile({
          id: model.id,
          username: model.username,
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

  useEffect(() => {
    if (!pbUser?.id) return;

    // Écouter les actions sur les notifications (clic sur les boutons Répondre/Décliner)
    const setupNotificationListeners = async () => {
      await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const { notification, actionId } = action;
        if (notification.extra?.type === 'call') {
          if (actionId === 'accept') {
            handleAcceptCallFromNotification(notification.extra.callId);
          } else if (actionId === 'decline') {
            handleDeclineCallFromNotification(notification.extra.callId);
          }
        }
      });
    };
    setupNotificationListeners();

    // Écouter les appels entrants
    pb.collection('calls').subscribe('*', async ({ action, record }) => {
      if (action === 'create' && record.receiver_id === pbUser.id && record.status === 'incoming') {
        const caller = record.expand?.caller_id;
        let callerName = "Utilisateur inconnu";
        let avatar = DEFAULT_AVATAR;

        if (caller) {
          callerName = caller.username;
          avatar = caller.avatar ? pb.files.getUrl(caller, caller.avatar) : (caller.avatar_url || DEFAULT_AVATAR);
        }

        // 1. Déclencher le Overlay React (si l'app est au premier plan)
        setIncomingCall({
          id: record.id,
          caller_id: record.caller_id,
          receiver_id: record.receiver_id,
          profiles: {
            username: callerName,
            avatar_url: avatar
          }
        });

        // 2. Déclencher une notification système (style appel natif)
        if (isMobileDevice()) {
          LocalNotifications.schedule({
            notifications: [
              {
                title: `APPEL ENTRANT: ${callerName}`,
                body: "Appuyez pour répondre",
                id: 999,
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'default',
                channelId: 'calls',
                ongoing: true,
                autoCancel: false,
                smallIcon: 'ic_stat_name', // Needs to exist in android/res/drawable
                extra: {
                  type: 'call',
                  callId: record.id
                },
                actionTypeId: 'INCOMING_CALL'
              }
            ]
          });
          
          // Vibrer le téléphone
          if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
        }
      }

      // Si l'appelant annule ou si le statut change (ex: décliné par un autre appareil)
      if (action === 'update' && (record.receiver_id === pbUser.id || record.caller_id === pbUser.id)) {
        if (record.status === 'completed' || record.status === 'missed') {
          if (incomingCall?.id === record.id) {
            // Trigger local notification for missed call if it was an incoming call for us
            if (record.status === 'missed' && record.receiver_id === pbUser.id) {
              // Cancel incoming notification if it existed
              LocalNotifications.cancel({ notifications: [{ id: 999 }] });
              
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: "Appel manqué",
                    body: `Vous avez manqué un appel de ${incomingCall?.profiles.username || 'un utilisateur'}`,
                    id: Math.floor(Math.random() * 10000),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'default',
                    channelId: 'default'
                  }
                ]
              });
            } else if (record.status === 'completed') {
               // Cancel call notification on completion
               LocalNotifications.cancel({ notifications: [{ id: 999 }] });
            }
            setIncomingCall(null);
          }
          if (activeCall?.id === record.id) setActiveCall(null);
        }
      }
      
      if (action === 'delete') {
        if (incomingCall?.id === record.id) setIncomingCall(null);
        if (activeCall?.id === record.id) setActiveCall(null);
      }
    }, { expand: 'caller_id' });

    return () => {
      pb.collection('calls').unsubscribe('*');
    };
  }, [pbUser?.id, incomingCall?.id, activeCall?.id]);

  // Global Messages Subscription for Notifications
  useEffect(() => {
    if (!pbUser?.id) return;

    const setupMessageSubscription = async () => {
      await pb.collection('messages').subscribe('*', async ({ action, record }) => {
        if (action === 'create' && record.receiver_id === pbUser.id) {
          // New message received
          try {
            const sender = await pb.collection('users').getOne(record.sender_id);
            
            // Only show notification if we're not currently on the message tab for this sender
            // (Simple version: always show if it's a mobile app and we're receiving a message)
            if (isMobileDevice()) {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: `Message de ${sender.username}`,
                    body: record.text || (record.media ? "Média reçu" : "Nouveau message"),
                    id: Math.floor(Math.random() * 10000),
                    schedule: { at: new Date(Date.now() + 100) },
                    sound: 'default',
                    channelId: 'messages',
                    extra: {
                      senderId: record.sender_id
                    }
                  }
                ]
              });
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
    handleAcceptCallFromNotification(incomingCall.id);
  };

  const handleAcceptCallFromNotification = async (callId: string) => {
    try {
      await pb.collection('calls').update(callId, { status: 'completed' });
      const record = await pb.collection('calls').getOne(callId, { expand: 'caller_id' });
      const caller = record.expand?.caller_id;
      
      setActiveCall({
        id: record.id,
        caller_id: record.caller_id,
        receiver_id: record.receiver_id,
        profiles: {
          username: caller?.username || 'Utilisateur',
          avatar_url: caller?.avatar ? pb.files.getUrl(caller, caller.avatar) : (caller?.avatar_url || DEFAULT_AVATAR)
        }
      });
      setIncomingCall(null);
      setActiveTab('appel');
      navigate('/appel');
      LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch (err) {
      console.error("Error accepting call:", err);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    handleDeclineCallFromNotification(incomingCall.id);
  };

  const handleDeclineCallFromNotification = async (callId: string) => {
    try {
      await pb.collection('calls').update(callId, { status: 'missed' });
      setIncomingCall(null);
      LocalNotifications.cancel({ notifications: [{ id: 999 }] });
    } catch (err) {
      console.error("Error declining call:", err);
    }
  };

  const handleEndCall = async () => {
    if (activeCall) {
      try {
        await pb.collection('calls').update(activeCall.id, { status: 'completed' });
      } catch (err) {
        console.error("Error ending call:", err);
      }
    }
    setActiveCall(null);
  };

  const handleStartCall = (call: any) => {
    setActiveCall(call);
  };

  const handleSendQuickMessage = async (text: string) => {
    // Désactivé (Migration NAS requise pour les messages)
    setNotification({
      message: "Messagerie en cours de migration sur le NAS",
      show: true
    });
  };

  const handleCameraShare = (media: string, destination: 'story' | 'message' | 'short' | 'video', type: 'image' | 'video') => {
    setShowCamera(false);
    
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
        'admin-panel': 'admin-panel'
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
      'telecharger': '/telecharger'
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
        return <MessagesTab user={user} profile={profile} />;
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
      
      <div className="flex flex-1 w-full relative">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          profile={profile}
        />
        
        <main className={`flex-1 w-full lg:ml-72 transition-all duration-500 ${
          (activeTab === 'message' || activeTab === 'shorts' || activeTab === 'appel')
            ? `p-0 ${isMobileDevice() ? 'pt-32' : 'pt-20'} h-screen h-[100dvh] overflow-hidden bg-[#0f0f0f] ${isMobileDevice() && !(activeTab === 'message' && location.search.includes('chat=')) ? 'pb-24' : ''}` 
            : `p-4 sm:p-10 md:p-14 ${isMobileDevice() ? 'pt-[145px]' : 'pt-[125px]'} lg:pt-[105px] ${isMobileDevice() ? 'pb-28' : 'pb-10'}`
        }`}>
          <div className={`${
            (activeTab === 'message' || activeTab === 'shorts' || activeTab === 'appel')
              ? 'w-full h-full' 
              : activeTab === 'video'
                ? 'max-w-[1800px] mx-auto w-full'
                : 'max-w-[1400px] mx-auto w-full'
          }`}>
            {(!activeWorkspace && activeTab !== 'message' && activeTab !== 'video' && activeTab !== 'shorts' && activeTab !== 'appel') && (
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
      {isMobileDevice() && !isKeyboardActive && !(activeTab === 'message' && location.search.includes('chat=')) && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
      
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallOverlay 
            caller={incomingCall.profiles}
            onAccept={handleAcceptCall}
            onDecline={handleDeclineCall}
            onSendMessage={handleSendQuickMessage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <CameraOverlay 
            onClose={() => setShowCamera(false)}
            onShare={handleCameraShare}
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
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
