
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  User,
  Video, 
  FileText, 
  TriangleAlert, 
  MessageSquare, 
  RefreshCw, 
  Shield, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  Search,
  MoreHorizontal,
  Zap,
  ChevronRight,
  Database,
  Mail,
  Calendar,
  ExternalLink,
  Check,
  Copy,
  AlertCircle,
  X,
  Monitor,
  Smartphone
} from 'lucide-react';
import { pb, uploadToPocketBase } from '../services/pocketbaseService';
// Firebase désactivé
import Username from './Username';
import { DEFAULT_AVATAR } from '../constants';
import { useClickOutside } from '../utils/hooks';

interface AdminActivity {
  id: string;
  type: 'signup' | 'video' | 'post';
  title: string;
  subtitle: string;
  timestamp: any;
  user_name: string;
  user_avatar: string;
}

const AdminPanel: React.FC<{ user: any; profile: any }> = ({ user, profile }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'reports' | 'comments' | 'access'>('dashboard');
  const [stats, setStats] = useState({
    users: 0,
    videos: 0,
    posts: 0,
    reports: 0,
    storageUsed: 0
  });
  const [users, setUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingUser, setVerifyingUser] = useState<any>(null);
  const [isConfirmingVerif, setIsConfirmingVerif] = useState(false);
  const [isConfirmingRole, setIsConfirmingRole] = useState(false);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(userMenuRef, () => setActiveUserMenu(null));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initSuccess, setInitSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploadingFile, setIsUploadingFile] = useState<{ [key: string]: boolean }>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'apk' | 'exe') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de taille (ex: 100MB pour éviter les timeouts excessifs sur le free tier)
    if (file.size > 100 * 1024 * 1024) {
      alert("Le fichier est trop lourd (max 100MB).");
      return;
    }

    try {
      setIsUploadingFile(prev => ({ ...prev, [type]: true }));
      setUploadProgress(prev => ({ ...prev, [type]: 50 })); // Simulé
      
      const url = await uploadToPocketBase(file);
      
      // Migration NAS
      console.log(`${type.toUpperCase()} URL: ${url}`);

      alert(`${type.toUpperCase()} mis à jour avec succès sur le NAS !`);
      setIsUploadingFile(prev => ({ ...prev, [type]: false }));
      setUploadProgress(prev => ({ ...prev, [type]: 100 }));
    } catch (error) {
      console.error(`Error initiating ${type} upload:`, error);
      setIsUploadingFile(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    // Migration NAS : Lecture config PocketBase
    setAppConfig(null);
  }, []);

  const triggerUpdate = async (platform: 'all' | 'pc' | 'mobile') => {
    setIsUpdating(true);
    try {
      // Migration NAS
      console.log("Update triggered on NAS");
    } catch (e) {
      console.error("Error triggering update:", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Migration NAS : Lecture stats PocketBase
      setStats({
        users: 0,
        videos: 0,
        posts: 0,
        reports: 0,
        storageUsed: 0
      });

      // Migration NAS : Lecture utilisateurs PocketBase
      setUsers([]);

      // Migration NAS : Lecture activités PocketBase
      setActivities([]);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleVerification = async () => {
    if (!verifyingUser) return;
    try {
      // Migration NAS
      setVerifyingUser(null);
      setIsConfirmingVerif(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error toggling verification:", error);
    }
  };

  const handleToggleRole = async () => {
    if (!verifyingUser) return;
    try {
      // Migration NAS
      setVerifyingUser(null);
      setIsConfirmingRole(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error toggling role:", error);
    }
  };

  const handleInitializeCollections = async () => {
    setIsInitializing(true);
    setInitSuccess(false);
    try {
      // Migration NAS : Initialisation collections PocketBase
      setInitSuccess(true);
      setTimeout(() => setInitSuccess(false), 5000);
      fetchData();
    } catch (err) {
      console.error("Error initializing collections:", err);
      alert("Erreur lors de l'initialisation : " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsInitializing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'users', label: 'Utilisateurs' },
    { id: 'content', label: 'Contenus' },
    { id: 'reports', label: 'Signalement' },
    { id: 'comments', label: 'Commentaire' },
    { id: 'access', label: 'Accès' },
  ];

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Tabs Navigation - Style "Ma chaîne" */}
      <div className="flex items-center gap-8 sm:gap-12 border-b border-white/5 px-6 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-5 text-lg font-bold transition-all relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white rounded-2xl animate-in fade-in zoom-in duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="px-2 sm:px-0">
        {activeTab === 'dashboard' ? (
          <div className="space-y-10">
            {/* Stats Grid - Priorité Y, pas de scroll X */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Utilisateurs', value: stats.users, icon: Users },
                { label: 'Vidéos', value: stats.videos, icon: Video },
                { label: 'Posts', value: stats.posts, icon: FileText },
                { label: 'Signalements', value: stats.reports, icon: TriangleAlert },
              ].map((stat, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.02] transition-all group relative overflow-hidden">
                  <div className="flex items-start justify-between mb-6">
                    <div className="text-white">
                      <stat.icon size={24} />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px] font-black mb-1">{stat.label}</p>
                    <p className="text-4xl font-black text-white tracking-tighter leading-none">
                      {loading ? '...' : stat.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Activité Récente */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#111] border border-white/5 rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                      <div className="text-white">
                        <Activity size={24} />
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Activité</h3>
                    </div>
                    <button className="text-slate-500 hover:text-white text-[10px] font-black transition-colors">Voir tout</button>
                  </div>

                  <div className="space-y-2">
                    {loading ? (
                      [1, 2, 3].map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                      ))
                    ) : activities.length > 0 ? (
                      activities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-full bg-white/5 overflow-hidden border-2 border-white/5">
                              <img src={activity.user_avatar || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{activity.title}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activity.subtitle}</p>
                              <p className="text-[9px] text-slate-600 font-black mt-1">
                                {activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString() : 'Récemment'}
                              </p>
                            </div>
                          </div>
                          <button className="w-10 h-10 flex items-center justify-center text-slate-600 group-hover:text-white transition-colors">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-slate-500 text-sm font-bold">Aucune activité récente</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Dashboard */}
              <div className="space-y-8">
                {/* Wexo Cloud Storage */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-8 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="text-white">
                        <Database size={24} />
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">Wexo Cloud</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-500">Utilisation</p>
                          <p className="text-2xl font-black text-white tracking-tighter">
                            {loading ? '...' : `${stats.storageUsed} GB`} <span className="text-slate-600 text-sm">/ 100 GB</span>
                          </p>
                        </div>
                        <p className="text-xl font-black text-white tracking-tighter">
                          {loading ? '...' : `${Math.min(100, Math.round((stats.storageUsed / 100) * 100))}%`}
                        </p>
                      </div>
                      
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
                          style={{ width: `${Math.min(100, (stats.storageUsed / 100) * 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance & Initialisation */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                  <Database size={24} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Maintenance Base de Données</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Initialisation & Santé</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                  <h4 className="text-white text-xs font-bold mb-2">Initialiser les Collections</h4>
                  <p className="text-slate-500 text-[10px] leading-relaxed mb-6">
                    Si vous ne voyez pas les collections <span className="text-white">posts</span>, <span className="text-white">videos</span> ou <span className="text-white">shorts</span> dans votre console Firebase, cliquez sur ce bouton pour créer des documents de bienvenue.
                  </p>
                  <button 
                    onClick={handleInitializeCollections}
                    disabled={isInitializing}
                    className={`w-full py-4 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                      initSuccess 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {isInitializing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Initialisation...
                      </>
                    ) : initSuccess ? (
                      <>
                        <Check size={14} />
                        Collections Initialisées !
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Initialiser Posts & Vidéos
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Rechercher un utilisateur..." 
                  className="w-full bg-[#111] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-white/20 transition-all"
                />
              </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black text-white">Utilisateur</th>
                      <th className="px-6 py-4 text-[10px] font-black text-white">Email</th>
                      <th className="px-6 py-4 text-[10px] font-black text-white">Rôle</th>
                      <th className="px-6 py-4 text-[10px] font-black text-white">Inscription</th>
                      <th className="px-6 py-4 text-[10px] font-black text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      [1, 2, 3, 4, 5].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-white/5 rounded-xl w-full" /></td>
                        </tr>
                      ))
                    ) : users.length > 0 ? (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                                <img src={u.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex flex-col">
                                <Username 
                                  username={u.username} 
                                  isVerified={u.is_verified} 
                                  isAdmin={u.role === 'admin'}
                                  email={u.email}
                                  className="text-sm font-bold text-white" 
                                  badgeSize={12} 
                                />
                                <div className="flex items-center gap-1 group/id">
                                  <span className="text-[10px] text-slate-500 font-medium">ID: {u.display_id || 'N/A'}</span>
                                  {u.display_id && (
                                    <button 
                                      onClick={() => copyToClipboard(u.display_id, u.id)}
                                      className={`transition-all ${copiedId === u.id ? 'text-emerald-500' : 'opacity-0 group-hover/id:opacity-100 text-slate-600 hover:text-white'}`}
                                      title="Copier l'ID"
                                    >
                                      {copiedId === u.id ? <Check size={10} /> : <Copy size={10} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                              <Mail size={14} />
                              {u.auth_method === 'anonymous' || u.email?.endsWith('@wexo.app') ? (
                                <span className="text-slate-600 italic">Compte sans e-mail</span>
                              ) : (
                                u.email || 'Non renseigné'
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${u.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'}`}>
                              {u.role === 'admin' ? 'ADMIN' : 'USER'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                              <Calendar size={14} />
                              {u.created_at?.toDate ? u.created_at.toDate().toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 relative">
                              {u.is_verified ? (
                                <button 
                                  onClick={() => { setVerifyingUser(u); setIsConfirmingVerif(true); }}
                                  className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                  title="Enlever le tag vérifié"
                                >
                                  <X size={16} />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => { setVerifyingUser(u); setIsConfirmingVerif(true); }}
                                  className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all"
                                  title="Vérifier l'utilisateur"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              
                              <div className="relative">
                                <button 
                                  onClick={() => setActiveUserMenu(activeUserMenu === u.id ? null : u.id)}
                                  className={`p-2 rounded-xl transition-all ${activeUserMenu === u.id ? 'bg-white text-black' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                >
                                  <MoreHorizontal size={16} />
                                </button>

                                {activeUserMenu === u.id && (
                                  <div 
                                    ref={userMenuRef}
                                    className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 shadow-2xl z-[101] animate-in fade-in slide-in-from-top-2"
                                  >
                                    <button 
                                      onClick={() => {
                                        if (u.email === 'ky.chaine@gmail.com') return;
                                        setVerifyingUser(u);
                                        setIsConfirmingRole(true);
                                        setActiveUserMenu(null);
                                      }}
                                      disabled={u.email === 'ky.chaine@gmail.com'}
                                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                                        u.email === 'ky.chaine@gmail.com' 
                                          ? 'text-slate-600 cursor-not-allowed' 
                                          : 'text-white hover:bg-white/5'
                                      }`}
                                    >
                                      <Shield size={16} className={u.role === 'admin' ? 'text-red-500' : 'text-slate-400'} />
                                      {u.role === 'admin' ? 'Enlever Administrateur' : 'Rendre Administrateur'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-slate-500 font-bold">Aucun utilisateur trouvé</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-[#111] rounded-2xl border border-white/5 border-dashed">
            <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/5">
              <Search size={40} className="text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-3">Section en développement</h3>
            <p className="text-slate-500 text-sm max-w-xs font-bold leading-relaxed">
              Le module <span className="text-white">"{tabs.find(t => t.id === activeTab)?.label}"</span> est en cours de déploiement sur Wexo Cloud.
            </p>
          </div>
        )}
      </div>
      {/* Modal de confirmation de vérification / dé-vérification */}
      {isConfirmingVerif && verifyingUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className={`w-16 h-16 ${verifyingUser.is_verified ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
              {verifyingUser.is_verified ? <AlertCircle size={32} /> : <Shield size={32} />}
            </div>
            <h3 className="text-xl font-black text-white text-center mb-2">
              {verifyingUser.is_verified ? 'Enlever le tag vérifié ?' : 'Attribuer le tag vérifié ?'}
            </h3>
            <p className="text-slate-400 text-sm font-medium text-center mb-8 leading-relaxed">
              {verifyingUser.is_verified 
                ? `Êtes-vous sûr de vouloir enlever le tag vérifié à `
                : `Êtes-vous sûr de vouloir attribuer le tag vérifié à `
              }
              <span className="text-white font-bold">{verifyingUser.username}</span> ?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleToggleVerification}
                className={`w-full py-4 ${verifyingUser.is_verified ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'} text-white text-xs font-black rounded-2xl transition-all active:scale-95 shadow-xl`}
              >
                {verifyingUser.is_verified ? 'Enlever le tag' : 'Confirmer la vérification'}
              </button>
              <button 
                onClick={() => { setIsConfirmingVerif(false); setVerifyingUser(null); }}
                className="w-full py-4 bg-white/5 text-slate-400 text-xs font-black rounded-2xl hover:bg-white/10 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de confirmation de rôle */}
      {isConfirmingRole && verifyingUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className={`w-16 h-16 ${verifyingUser.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-white text-center mb-2">
              {verifyingUser.role === 'admin' ? 'Enlever Administrateur ?' : 'Rendre Administrateur ?'}
            </h3>
            <p className="text-slate-400 text-sm font-medium text-center mb-8 leading-relaxed">
              {verifyingUser.role === 'admin' 
                ? `Êtes-vous sûr de vouloir enlever les droits d'administrateur à `
                : `Êtes-vous sûr de vouloir rendre `
              }
              <span className="text-white font-bold">{verifyingUser.username}</span>
              {verifyingUser.role !== 'admin' && " administrateur ? Il aura accès à tout l'espace admin."}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleToggleRole}
                className={`w-full py-4 ${verifyingUser.role === 'admin' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'} text-white text-xs font-black rounded-2xl transition-all active:scale-95 shadow-xl`}
              >
                {verifyingUser.role === 'admin' ? 'Enlever les droits' : 'Confirmer'}
              </button>
              <button 
                onClick={() => { setIsConfirmingRole(false); setVerifyingUser(null); }}
                className="w-full py-4 bg-white/5 text-slate-400 text-xs font-black rounded-2xl hover:bg-white/10 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
