import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Palette, 
  Smartphone, 
  Camera, 
  Check, 
  Moon, 
  Sun, 
  ChevronRight,
  LogOut,
  Lock
} from 'lucide-react';
import { pb } from '@/services/pocketbaseService';
import { useTheme } from '@/src/context/ThemeContext';
import { isMobileDevice } from '@/src/utils/device';

interface SettingsTabProps {
  user: any;
  profile: any;
  onLogout: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ user, profile, onLogout }) => {
  const { mode, setMode, primaryColor, setPrimaryColor } = useTheme();
  const [activeSection, setActiveSection] = useState<'main' | 'compte' | 'profil' | 'theme' | 'onglets'>( 'main' );
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Couleurs prédéfinies
  const presetColors = [
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Vert', value: '#10b981' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Rose', value: '#ec4899' },
  ];

  const handleUpdateProfile = async () => {
    if (!pb.authStore.model?.id) return;
    setLoading(true);
    try {
      await pb.collection('users').update(pb.authStore.model.id, {
        name: displayName
      });
      setSuccess('Profil mis à jour !');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#0f0f0f]/80 backdrop-blur-md z-10 py-2">
      <button 
        onClick={() => setActiveSection('main')}
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <ChevronRight className="rotate-180" />
      </button>
      <h2 className="text-xl font-black tracking-tight">{title}</h2>
    </div>
  );

  const SectionButton = ({ icon: Icon, label, description, onClick, color = "text-white" }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors ${color}`}>
          <Icon size={24} />
        </div>
        <div className="text-left">
          <div className="font-bold text-white tracking-tight">{label}</div>
          <div className="text-xs text-white/40">{description}</div>
        </div>
      </div>
      <ChevronRight size={20} className="text-white/20 group-hover:text-white/60 transition-all" />
    </button>
  );

  if (activeSection === 'compte') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
        {renderHeader('Compte')}
        <div className="space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4">Sécurité</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-2 px-1">Changer le mot de passe</label>
                <button 
                  onClick={() => alert("Fonctionnalité en cours de déploiement via PocketBase")}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left flex items-center justify-between transition-all"
                >
                  <span className="text-sm font-bold">Réinitialiser via email</span>
                  <Lock size={18} className="text-white/40" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/10">
            <h3 className="text-sm font-black text-red-500/60 uppercase tracking-widest mb-4">Zone de danger</h3>
            <button 
               onClick={onLogout}
               className="w-full flex items-center gap-3 p-4 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-2xl font-black transition-all"
            >
              <LogOut size={20} />
              DÉCONNEXION
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'profil') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
        {renderHeader('Profil')}
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <img 
                src={profile?.avatar_url || "https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff"} 
                className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl object-cover"
                alt="Avatar"
              />
              <button 
               className="absolute bottom-0 right-0 p-3 bg-primary rounded-full shadow-xl hover:scale-110 transition-transform text-white border-2 border-[#0f0f0f]"
               style={{ backgroundColor: primaryColor }}
              >
                <Camera size={20} />
              </button>
            </div>
            <div className="text-center">
              <div className="text-xl font-black tracking-tight">{profile?.username}</div>
              <div className="text-sm text-white/40">{profile?.email}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2 px-1">Nom d'affichage</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                placeholder="Ton pseudo..."
                style={{ '--tw-ring-color': primaryColor } as any}
              />
            </div>
            
            <button 
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full p-4 rounded-2xl font-black text-white shadow-xl hover:opacity-90 active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'MODIFICATION...' : 'SAUVEGARDER'}
            </button>

            {success && <div className="text-center text-green-500 font-bold text-sm animate-bounce">{success}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'theme') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
        {renderHeader('Apparence')}
        <div className="space-y-8">
          {/* Mode Sombre / Clair */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4">Mode d'affichage</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setMode('dark')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${mode === 'dark' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                style={{ borderColor: mode === 'dark' ? primaryColor : undefined }}
              >
                <Moon className={mode === 'dark' ? 'text-primary' : 'text-white/40'} style={{ color: mode === 'dark' ? primaryColor : undefined }} />
                <span className={`text-sm font-black tracking-tight ${mode === 'dark' ? 'text-white' : 'text-white/40'}`}>SOMBRE</span>
              </button>
              <button 
                onClick={() => setMode('light')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${mode === 'light' ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                style={{ borderColor: mode === 'light' ? primaryColor : undefined }}
              >
                <Sun className={mode === 'light' ? 'text-primary' : 'text-white/40'} style={{ color: mode === 'light' ? primaryColor : undefined }} />
                <span className={`text-sm font-black tracking-tight ${mode === 'light' ? 'text-white' : 'text-white/40'}`}>CLAIR</span>
              </button>
            </div>
          </div>

          {/* Couleur Principale */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-black text-white/40 uppercase tracking-widest mb-4">Couleur d'accentuation</h3>
            <div className="grid grid-cols-3 gap-3">
              {presetColors.map((color) => (
                <button 
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={`p-4 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all ${primaryColor === color.value ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5 border-transparent'}`}
                  style={{ borderColor: primaryColor === color.value ? color.value : 'transparent' }}
                >
                  <div 
                    className="w-6 h-6 rounded-full shadow-inner" 
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-[10px] font-black uppercase tracking-tighter text-white/80">{color.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'onglets') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
        {renderHeader('Onglets Navigation')}
        <div className="space-y-4">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-start gap-4" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15` }}>
            <Smartphone className="text-primary mt-1" style={{ color: primaryColor }} />
            <div>
              <div className="font-bold text-sm text-white">Personnalisation Mobile</div>
              <p className="text-xs text-white/60 mt-1">Choisissez les onglets qui apparaissent dans votre barre de navigation rapide sur smartphone.</p>
            </div>
          </div>
          
          <div className="space-y-2 opacity-50">
             {['Accueil', 'Shorts', 'Messages', 'Profil'].map((tab) => (
               <div key={tab} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                 <span className="font-bold text-sm">{tab}</span>
                 <div className="w-12 h-6 bg-primary/40 rounded-full relative" style={{ backgroundColor: primaryColor }}>
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                 </div>
               </div>
             ))}
             <p className="text-[10px] text-center text-white/30 font-bold uppercase tracking-widest mt-4 italic">Bientôt disponible</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f0f]">
      {/* Profil Header Card */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-white/10 to-white/5 p-6 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 rounded-full" style={{ backgroundColor: `${primaryColor}20` }} />
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <img 
                src={profile?.avatar_url || "https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff"} 
                className="w-20 h-20 rounded-3xl shadow-xl border-2 border-white/10 object-cover"
                alt="Avatar"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-[#1a1a1a] rounded-full shadow-lg" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">{profile?.display_name || profile?.username}</h2>
              <p className="text-sm text-white/40 font-medium">{profile?.email}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 bg-white/10 rounded-full border border-white/10">
                <Shield size={12} className="text-primary" style={{ color: primaryColor }} />
                <span className="text-[10px] font-bold uppercase text-white/60 tracking-wider">Compte Vérifié</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-24 space-y-2">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 px-2">Configuration Générale</h3>
        
        <SectionButton 
          icon={User} 
          label="Profil" 
          description="Avatar, pseudo et informations publiques"
          onClick={() => setActiveSection('profil')}
        />
        
        <SectionButton 
          icon={Palette} 
          label="Thème & Apparence" 
          description="Mode sombre, couleurs et interface"
          onClick={() => setActiveSection('theme')}
          color="text-primary"
          style={{ color: primaryColor }}
        />
        
        <SectionButton 
          icon={Shield} 
          label="Compte & Sécurité" 
          description="Mot de passe, email et confidentialité"
          onClick={() => setActiveSection('compte')}
        />

        {isMobileDevice() && (
          <SectionButton 
            icon={Smartphone} 
            label="Gestion des Onglets" 
            description="Personnaliser votre barre de nav"
            onClick={() => setActiveSection('onglets')}
          />
        )}

        <div className="pt-8 mb-4">
          <SectionButton 
            icon={LogOut} 
            label="Déconnexion" 
            description="Quitter votre session en toute sécurité"
            onClick={onLogout}
            color="text-red-500"
          />
        </div>

        <div className="text-center pt-8 opacity-20">
          <div className="text-[10px] font-black tracking-[0.3em] uppercase">Wexo v0.1.0</div>
          <div className="text-[8px] mt-1">Made with ❤️ for creativity</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
