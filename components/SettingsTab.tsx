import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Upload,
  ArrowLeft,
  RotateCcw,
  MoreVertical,
  Loader2
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
  const [displayName, setDisplayName] = useState(profile?.name || profile?.display_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // States for interactive cropping
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setShowAvatarMenu(false);
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setTempImage(dataUrl);
        setShowCropper(true);
        setRotation(0);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setShowCropper(true);
        setRotation(0);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setShowAvatarMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateMinZoom = useCallback(() => {
    if (!imgRef.current || !maskRef.current) return;
    const img = imgRef.current;
    const maskSize = maskRef.current.offsetWidth;
    const isRotated = (rotation / 90) % 2 !== 0;
    const scaleX = maskSize / (isRotated ? img.clientHeight : img.clientWidth);
    const scaleY = maskSize / (isRotated ? img.clientWidth : img.clientHeight);
    const mZoom = Math.max(scaleX, scaleY);
    setMinZoom(mZoom);
    if (zoom < mZoom) setZoom(mZoom);
  }, [rotation, zoom]);

  const constrainOffset = useCallback((x: number, y: number, currentZoom: number) => {
    if (!imgRef.current || !maskRef.current) return { x, y };
    const maskSize = maskRef.current.offsetWidth;
    const img = imgRef.current;
    const isRotated = (rotation / 90) % 2 !== 0;
    const displayedW = (isRotated ? img.clientHeight : img.clientWidth) * currentZoom;
    const displayedH = (isRotated ? img.clientWidth : img.clientHeight) * currentZoom;
    const limitX = Math.max(0, (displayedW - maskSize) / 2);
    const limitY = Math.max(0, (displayedH - maskSize) / 2);
    return {
      x: Math.min(Math.max(x, -limitX), limitX),
      y: Math.min(Math.max(y, -limitY), limitY)
    };
  }, [rotation]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    setOffset(constrainOffset(clientX - dragStart.x, clientY - dragStart.y, zoom));
  }, [isDragging, dragStart, constrainOffset, zoom]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
    };
  }, [isDragging, handleMouseMove]);

  const applyCrop = async () => {
    if (!tempImage || !imgRef.current || !maskRef.current || !pb.authStore.model?.id) return;
    
    setLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 150; 
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 150, 150);
      
      ctx.translate(75, 75);
      ctx.rotate((rotation * Math.PI) / 180);
      
      const displayToCanvasScale = 150 / maskRef.current.offsetWidth;
      ctx.scale(zoom * displayToCanvasScale, zoom * displayToCanvasScale);
      
      ctx.translate(offset.x / zoom, offset.y / zoom);
      ctx.drawImage(imgRef.current, -imgRef.current.clientWidth / 2, -imgRef.current.clientHeight / 2, imgRef.current.clientWidth, imgRef.current.clientHeight);
      
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      
      // Conversion dataURL en Blob
      const res = await fetch(croppedDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // 1. Créer une entrée dans la collection 'media'
      const mediaFormData = new FormData();
      mediaFormData.append('file', file);
      mediaFormData.append('name', `avatar_${Date.now()}`);
      
      const mediaRecord = await pb.collection('media').create(mediaFormData);
      
      // 2. Récupérer l'URL permanente du média
      const newAvatarUrl = pb.files.getUrl(mediaRecord, mediaRecord.file);
      
      // 3. Mettre à jour 'avatar_url' and native 'avatar'
      const userFormData = new FormData();
      userFormData.append('avatar', file);
      userFormData.append('avatar_url', newAvatarUrl);

      const updatedRecord = await pb.collection('users').update(pb.authStore.model.id, userFormData);

      pb.authStore.save(pb.authStore.token, updatedRecord);

      setSuccess('Photo de profil mise à jour !');
      setShowCropper(false);
      setShowAvatarMenu(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const presetColors = [
    { name: 'bleu', value: '#0b57ff' },
    { name: 'rouge', value: '#fc0944' },
    { name: 'rose', value: '#ec4899' },
    { name: 'vert', value: '#03bf54' },
    { name: 'vert foncé', value: '#0da300' },
    { name: 'orange', value: '#bc5617' },
    { name: 'violet', value: '#8b5cf6' },
  ];

  const handleUpdateProfile = async () => {
    if (!pb.authStore.model?.id) return;
    setLoading(true);
    try {
      const updatedRecord = await pb.collection('users').update(pb.authStore.model.id, {
        name: displayName,
        phone: phoneNumber
      });
      
      // Update local auth store to trigger onChange in App.tsx
      pb.authStore.save(pb.authStore.token, updatedRecord);
      
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
                className="w-40 h-40 rounded-full object-cover ring-8 ring-white/5 shadow-2xl transition-all duration-500 group-hover:scale-105"
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
              <label className="block text-sm font-bold text-white mb-2 px-1">Pseudo D'affichage</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full py-4 bg-transparent border-none outline-none transition-all font-bold text-3xl text-white placeholder:text-white/20"
                placeholder="Ex: Mon Pseudo..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 px-1 uppercase tracking-widest text-white/40">Numéro de téléphone</label>
              <input 
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl outline-none transition-all font-bold text-xl text-white placeholder:text-white/10"
                placeholder="+33 6 12 34 56 78"
              />
              <p className="mt-2 text-[10px] text-white/20 font-medium px-1 uppercase tracking-tighter">Utilisé par le téléphone pour identifier les appels (style WhatsApp).</p>
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
            {error && <div className="text-center text-red-500 font-bold text-sm">{error}</div>}
          </div>
        </div>

        {showCamera && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black">
            <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-2xl overflow-hidden flex flex-col h-full md:h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#111111]">
                <button onClick={stopCamera} className="text-white hover:bg-white/10 p-2 rounded-2xl transition-colors"><ArrowLeft size={24} /></button>
                <h2 className="text-white font-medium text-lg">Prendre une photo</h2>
                <div className="w-10"></div>
              </div>
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[min(70vw,380px)] aspect-square rounded-full border-2 border-white/30 shadow-[0_0_0_2000px_rgba(0,0,0,0.5)]"></div>
                </div>
              </div>
              <div className="p-8 bg-[#111111] border-t border-white/5 flex flex-col items-center">
                <button 
                  onClick={capturePhoto} 
                  className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                >
                  <div className="w-16 h-16 border-4 border-black rounded-full"></div>
                </button>
                <p className="mt-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">Cliquez pour capturer</p>
              </div>
            </div>
          </div>
        )}

        {showCropper && tempImage && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black select-none">
            <div className="w-full max-w-2xl bg-[#0a0a0a] rounded-2xl overflow-hidden flex flex-col h-full md:h-[90vh]">
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#111111]">
                <button onClick={() => setShowCropper(false)} className="text-white hover:bg-white/10 p-2 rounded-2xl transition-colors"><ArrowLeft size={24} /></button>
                <h2 className="text-white font-medium text-lg">Ajuster la photo</h2>
                <button className="text-white/60 hover:text-white transition-colors"><MoreVertical size={24} /></button>
              </div>
              <div className="flex-1 relative bg-black overflow-hidden cursor-move touch-none" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)` }}>
                  <img ref={imgRef} src={tempImage} className="max-w-none w-[80%] h-auto" alt="Original" onLoad={calculateMinZoom} />
                </div>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div ref={maskRef} className="relative w-[min(70vw,380px)] aspect-square rounded-full border-2 border-white/30 shadow-[0_0_0_2000px_rgba(0,0,0,0.8)]"></div>
                </div>
              </div>
              <div className="p-8 bg-[#111111] border-t border-white/5 space-y-8 flex flex-col items-center">
                <input type="range" min={minZoom} max={minZoom + 3} step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full max-w-sm h-1 bg-white/20 rounded-full appearance-none accent-white" />
                <div className="flex gap-12">
                  <button onClick={() => setRotation(r => (r - 90) % 360)} className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all"><RotateCcw size={24} className="text-white" /></button>
                  <button disabled={loading} onClick={applyCrop} className="min-w-[180px] bg-white text-slate-900 font-black uppercase text-xs tracking-widest py-4 px-10 rounded-2xl shadow-xl flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Terminer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    onClick={startCamera}
                    className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-3xl transition-all"
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
                    className={`aspect-square rounded-md transition-all relative ${primaryColor === color.value ? 'scale-110 shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                    style={{ backgroundColor: color.value }}
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
            className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/5">
                <LogOut size={20} className="text-white/40" />
              </div>
              <span className="font-bold text-sm">Déconnexion</span>
            </div>
            <ChevronRight size={18} className="text-white/10" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
