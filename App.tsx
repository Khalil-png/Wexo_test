
import React, { useState, useEffect } from 'react';
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
import AuthModal from './components/AuthModal';
import LogoutModal from './components/LogoutModal';
import { TabId, Workspace as WorkspaceType } from './types';
import { supabase } from './services/supabase';
import { HelpCircle, AlertTriangle, X, Construction } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('accueil');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [notification, setNotification] = useState<{message: string, show: boolean}>({
    message: '',
    show: false
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    // Tentative de récupération du profil existant
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profil inexistant : on tente de le créer à partir des métadonnées
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const metadata = user.user_metadata;
        const fallbackAvatar = localStorage.getItem('wexo_google_fallback_avatar');
        
        // Récupérer le pseudo depuis les métadonnées ou l'email
        const metaUsername = metadata.username || metadata.given_name || metadata.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Utilisateur';
        
        // Récupérer l'avatar
        const metaAvatar = metadata.avatar_url || metadata.picture || fallbackAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

        const newProfile = {
          id: userId,
          username: metaUsername,
          avatar_url: metaAvatar,
          email: user.email,
          updated_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();
        
        if (!createError) {
          setProfile(createdProfile);
          localStorage.removeItem('wexo_google_fallback_avatar');
        } else {
          console.error("Erreur lors de la création automatique du profil:", createError);
        }
      }
    } else if (!error) {
      setProfile(data);
    }
  };

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
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
      case 'jeux':
        return <GamesTab />;
      case 'aide':
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
             <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mb-8 border border-amber-500/20 shadow-xl shadow-amber-500/5">
                <Construction size={40} />
             </div>
             <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">Bientôt disponible</h2>
             <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">
                Cette section est encore en construction. Nos équipes travaillent dur pour vous offrir le meilleur service d'assistance.
             </p>
             <div className="mt-12 flex gap-4">
                <button onClick={() => handleTabChange('accueil')} className="px-8 py-4 bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-colors">
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
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-slate-600 bg-slate-900/10 rounded-[3rem] border-2 border-slate-800 border-dashed animate-in fade-in duration-700">
            <h2 className="text-xl font-black text-slate-400 mb-2 uppercase tracking-tighter capitalize">{activeTab.replace('-', ' ')}</h2>
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Section en développement</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30 overflow-x-hidden">
      <div className={`fixed top-0 left-0 right-0 z-[200] flex justify-center p-4 transition-all duration-700 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-md w-full">
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
      />
      
      <div className="flex flex-1 w-full relative">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main className={`flex-1 w-full lg:ml-72 transition-all duration-500 ${
          (activeTab === 'message' || activeTab === 'shorts')
            ? 'p-0 pt-20 h-screen overflow-hidden' 
            : 'p-4 sm:p-10 md:p-14 pt-[125px] lg:pt-[105px] pb-10'
        }`}>
          <div className={`${
            (activeTab === 'message' || activeTab === 'shorts')
              ? 'w-full h-full' 
              : activeTab === 'video'
                ? 'max-w-[1600px] mx-auto w-full'
                : 'max-w-7xl mx-auto w-full'
          }`}>
            {(!activeWorkspace && activeTab !== 'message' && activeTab !== 'video' && activeTab !== 'shorts') && (
              <div className="mb-4 sm:mb-5 animate-in slide-in-from-left duration-700">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-[0.5em] text-sky-500">Flux Wexo</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black capitalize text-white tracking-tighter leading-none mb-3">
                  {activeTab.replace('-', ' ')}
                </h1>
                <div className="h-1.5 w-14 bg-sky-500 rounded-full shadow-[0_5px_15px_rgba(56,189,248,0.4)]"></div>
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
    </div>
  );
};

export default App;
