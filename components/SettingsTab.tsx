import React, { useState, useRef } from 'react';
import { 
  User, 
  Shield, 
  Palette, 
  Smartphone, 
  Camera, 
  Moon, 
  Sun, 
  ChevronRight,
  LogOut,
  Lock,
  Upload
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
  const [activeSection, setActiveSection] = useState<'main' | 'compte' | 'profil' | 'theme' | 'onglets'>('main');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetColors = [
    { name: 'Bleu', value: '#0b57ff' },
    { name: 'Rouge', value: '#fc0944' },
    { name: 'Vert', value: '#03bf54' },
    { name: 'Vert Foncé', value: '#0da300' },
    { name: 'Orange', value: '#bc5617' },
    { name: 'Violet', value: '#8b5cf6' },
  ];

  const handleUpdateProfile = async () => {
    if (!pb.authStore.model?.id) return;
    setLoading(true);
    try {
      await pb.collection('users').update(pb.authStore.model.id, {
        display_name: displayName
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pb.authStore.model?.id) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await pb.collection('users').update(pb.authStore.model.id, formData);
      setSuccess('Photo de profil mise à jour !');
      setShowAvatarMenu(false);
      setTimeout(() => setSuccess(null), 3000);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = (title: string) => (
    <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#0f0f0f]/80 backdrop-blur-md z-10 py-4">
      <button 
        onClick={() => setActiveSection('main')}
        className="p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <ChevronRight className="rotate-180" />
      </button>
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
    </div>
  );

  const SectionButton = ({ icon: Icon, label, description, onClick }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors text-white">
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
            <h3 className="text-sm font-bold text-white/40 mb-4">Sécurité</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/30 mb-2 px-1">Changer le mot de passe</label>
                <button 
                  onClick={() => alert("Fonctionnalité en cours de déploiement")}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-left flex items-center justify-between transition-all"
                >
                  <span className="text-sm font-bold">Réinitialiser via email</span>
                  <Lock size={18} className="text-white/40" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'profil') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto pb-32">
        {renderHeader('Profil')}
        <div className="space-y-12">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <img 
                src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}&background=0040ff&color=fff`} 
                className="w-40 h-40 rounded-full border-4 border-white/10 shadow-2xl object-cover"
                alt="Avatar"
              />
              <button 
                onClick={() => setShowAvatarMenu(true)}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm border-4 border-[#0f0f0f] hover:scale-105 active:scale-95 transition-all text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Camera size={16} />
                Modifier
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/40 mb-3 px-1">Pseudo d'affichage</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none transition-all font-bold text-lg text-white"
                placeholder="Ex: Mon Pseudo..."
                style={{ focusRing: primaryColor } as any}
              />
            </div>
            
            <button 
              onClick={handleUpdateProfile}
              disabled={loading}
              className="w-full p-5 rounded-2xl font-black text-white shadow-xl hover:opacity-90 active:scale-95 transition-all text-sm tracking-widest uppercase disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'MODIFICATION...' : 'SAUVEGARDER'}
            </button>

            {success && <div className="text-center text-green-500 font-bold text-sm animate-bounce">{success}</div>}
          </div>
        </div>

        {showAvatarMenu && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-[#1a1a1a] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in duration-300">
              <div className="p-6">
                <h3 className="text-lg font-black mb-6 text-center text-white">Modifier la photo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"
                  >
                    <Upload size={32} style={{ color: primaryColor }} />
                    <span className="font-bold text-sm text-white">Importer</span>
                  </button>
                  <button 
                    className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-3xl transition-all opacity-50"
                    disabled
                  >
                    <Camera size={32} style={{ color: primaryColor }} />
                    <span className="font-bold text-sm text-white">Caméra</span>
                  </button>
                </div>
                <button 
                  onClick={() => setShowAvatarMenu(false)}
                  className="w-full mt-6 p-4 text-white/40 font-bold hover:text-white transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
        )}
      </div>
    );
  }

  if (activeSection === 'theme') {
    return (
      <div className="p-6 max-w-2xl mx-auto h-full overflow-y-auto">
        {renderHeader('Apparence')}
        <div className="space-y-8">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-bold text-white/40 mb-4">Mode d'affichage</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setMode('dark')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${mode === 'dark' ? 'bg-white/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                style={{ borderColor: mode === 'dark' ? primaryColor : 'transparent' }}
              >
                <Moon className={mode === 'dark' ? '' : 'text-white/40'} style={{ color: mode === 'dark' ? primaryColor : undefined }} />
                <span className={`text-sm font-black tracking-tight ${mode === 'dark' ? 'text-white' : 'text-white/40'}`}>SOMBRE</span>
              </button>
              <button 
                onClick={() => setMode('light')}
                className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${mode === 'light' ? 'bg-white/5' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                style={{ borderColor: mode === 'light' ? primaryColor : 'transparent' }}
              >
                <Sun className={mode === 'light' ? '' : 'text-white/40'} style={{ color: mode === 'light' ? primaryColor : undefined }} />
                <span className={`text-sm font-black tracking-tight ${mode === 'light' ? 'text-white' : 'text-white/40'}`}>CLAIR</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-bold text-white/40 mb-6">Couleur d'accentuation</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {presetColors.map((color) => (
                <button 
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={`aspect-square rounded-2xl transition-all relative ${primaryColor === color.value ? 'scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {primaryColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f0f0f]">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}&background=0040ff&color=fff`} 
              className="w-24 h-24 rounded-full shadow-2xl object-cover ring-4 ring-white/5"
              alt="Avatar"
            />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white mb-1">{profile?.display_name || profile?.username}</h2>
            <p className="text-base text-white/30 font-medium">{profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-24 space-y-1">
        <div className="h-px bg-white/5 mx-2 my-6" />
        
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

        <div className="pt-12">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <LogOut size={24} className="text-white" />
              </div>
              <span className="font-bold">Déconnexion</span>
            </div>
            <ChevronRight size={20} className="text-white/20" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
