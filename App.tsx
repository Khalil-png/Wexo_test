
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomeTab from './components/HomeTab';
import Workspace from './components/Workspace';
import PostsTab from './components/PostsTab';
import MessagesTab from './components/MessagesTab';
import GamesTab from './components/GamesTab';
import VideoTab from './components/VideoTab';
import ShortsTab from './components/ShortsTab';
import MyChannelTab from './components/MyChannelTab';
import CallsTab from './components/CallsTab';
import DownloadTab from './components/DownloadTab';
import AuthModal from './components/AuthModal';
import LogoutModal from './components/LogoutModal';
import BottomNav from './components/BottomNav';
import AdminPanel from './components/AdminPanel';
import IncomingCallOverlay from './components/IncomingCallOverlay';
import CameraOverlay from './components/CameraOverlay';
import { isMobileDevice } from './src/utils/device';
import { TabId, Workspace as WorkspaceType } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, limit, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { DEFAULT_AVATAR, NAV_ITEMS } from './constants';
import { HelpCircle, AlertTriangle, X, Construction } from 'lucide-react';
import { generateSnowflake } from './utils/snowflake';
import { AnimatePresence } from 'motion/react';

const CURRENT_VERSION = "0.0.1";

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>('accueil');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  
  const [notification, setNotification] = useState<{message: string, show: boolean}>({
    message: '',
    show: false
  });

  // Check for updates
  useEffect(() => {
    const isMobile = isMobileDevice();
    
    const unsub = onSnapshot(doc(db, 'settings', 'app_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const serverVersion = isMobile ? data.latest_version_mobile : data.latest_version_pc;
        
        if (serverVersion && typeof serverVersion === 'string' && serverVersion > CURRENT_VERSION) {
          setLatestVersion(serverVersion);
          // Mise à jour automatique : on recharge l'application pour récupérer la nouvelle version de Netlify
          console.log(`Nouvelle version détectée: ${serverVersion}. Mise à jour automatique...`);
          
          // On évite de recharger en boucle si la version ne change pas
          const lastReloadedVersion = localStorage.getItem('last_reloaded_version');
          if (lastReloadedVersion !== serverVersion) {
            localStorage.setItem('last_reloaded_version', serverVersion);
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        }
      }
    }, (error) => {
      console.error("Erreur App Config Snapshot:", error);
      // Ensure loader is removed even if config fails
      const loader = document.getElementById('initial-loader');
      if (loader) loader.remove();
    });

    return () => unsub();
  }, []);

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

  useEffect(() => {
    if (!user?.uid) return;

    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiver_id', '==', user.uid),
      where('status', '==', 'outgoing'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();
        
        // Si on est sur mobile, on ne reçoit pas l'appel mais on marque comme manqué et on notifie
        if (isMobileDevice()) {
          try {
            await updateDoc(doc(db, 'calls', callDoc.id), {
              status: 'missed'
            });
            
            // Notification d'appel manqué
            const profileRef = doc(db, 'profiles', callData.caller_id);
            const profileSnap = await getDoc(profileRef);
            const callerName = profileSnap.exists() ? profileSnap.data().username : 'Inconnu';
            
            setNotification({
              message: `Appel manqué de ${callerName}. Les appels ne sont pas disponibles sur mobile.`,
              show: true
            });
            setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
          } catch (err) {
            console.error("Error handling mobile missed call:", err);
          }
          return;
        }

        // Fetch caller profile
        const profileRef = doc(db, 'profiles', callData.caller_id);
        const profileSnap = await getDoc(profileRef);
        const callerProfile = profileSnap.exists() ? profileSnap.data() : { username: 'Inconnu', avatar_url: null };

        setIncomingCall({
          id: callDoc.id,
          ...callData,
          profiles: callerProfile
        });
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'completed'
      });
      setActiveCall(incomingCall);
      setIncomingCall(null);
      setActiveTab('appel');
      navigate('/appel');
    } catch (err) {
      console.error("Error accepting call:", err);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'missed'
      });
      setIncomingCall(null);
    } catch (err) {
      console.error("Error declining call:", err);
    }
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  const handleStartCall = (call: any) => {
    setActiveCall(call);
  };

  const handleSendQuickMessage = async (text: string) => {
    if (!incomingCall || !user) return;
    try {
      const messageId = generateSnowflake();
      await setDoc(doc(db, 'messages', messageId), {
        id: messageId,
        sender_id: user.uid,
        receiver_id: incomingCall.caller_id,
        text: text,
        created_at: new Date().toISOString(),
        status: 'sent'
      });
    } catch (err) {
      console.error("Error sending quick message:", err);
    }
  };

  const handleCameraShare = (image: string, destination: 'story' | 'message' | 'short' | 'video') => {
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

    // In a real app, we would upload the image here.
    // For now, we just show a success message.
    setNotification({
      message: `Photo partagée avec succès sur ${destination} !`,
      show: true
    });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  // Sync activeTab with URL path
  useEffect(() => {
    const path = location.pathname.substring(1); // remove leading slash
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        // Create profile if it doesn't exist (e.g. first login)
        const newProfile = {
          id: userId,
          username: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Utilisateur',
          display_name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Utilisateur',
          avatar_url: auth.currentUser?.photoURL || DEFAULT_AVATAR,
          email: auth.currentUser?.email || '',
          auth_method: auth.currentUser?.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
    }
  };

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
        return <PostsTab />;
      case 'video':
        return <VideoTab onBecomeCreator={() => handleTabChange('ma-chaine')} user={user} profile={profile} />;
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
            activeCall={activeCall} 
            callTimer={callTimer} 
            onEndCall={handleEndCall}
            onStartCall={handleStartCall}
          />
        );
      case 'telecharger':
        return <DownloadTab />;
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
          return <AdminPanel />;
        }
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mb-8 border border-red-500/20 shadow-lg">
                <AlertTriangle size={40} />
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
        <div className="bg-[#1a1a1a] border border-red-500/30 px-6 py-4 rounded-xl shadow-xl flex items-center gap-4 max-w-md w-full">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 flex-shrink-0"><AlertTriangle size={20} /></div>
          <p className="text-xs font-bold text-red-200 flex-1 leading-tight">{notification.message}</p>
          <button onClick={() => setNotification(prev => ({ ...prev, show: false }))} className="text-red-500/50 hover:text-red-500 transition-colors p-1"><X size={18} /></button>
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
            ? `p-0 pt-20 h-screen h-[100dvh] overflow-hidden bg-[#0f0f0f] ${isMobileDevice() ? 'pb-24' : ''}` 
            : `p-4 sm:p-10 md:p-14 pt-[125px] lg:pt-[105px] ${isMobileDevice() ? 'pb-28' : 'pb-10'}`
        }`}>
          <div className={`${
            (activeTab === 'message' || activeTab === 'shorts' || activeTab === 'appel')
              ? 'w-full h-full' 
              : activeTab === 'video'
                ? 'max-w-[1600px] mx-auto w-full'
                : 'max-w-7xl mx-auto w-full'
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
      {isMobileDevice() && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
      
      {isMobileDevice() && incomingCall && (
        <IncomingCallOverlay 
          caller={incomingCall.profiles}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onSendMessage={handleSendQuickMessage}
        />
      )}

      <AnimatePresence>
        {showCamera && (
          <CameraOverlay 
            onClose={() => setShowCamera(false)}
            onShare={handleCameraShare}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
