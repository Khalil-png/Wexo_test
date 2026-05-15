
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Lock, User, Download, Loader2, ArrowRight, RefreshCw, RotateCcw, ArrowLeft, MoreVertical, ShieldCheck, MailCheck, ExternalLink, Camera, Upload, Eye, EyeOff } from 'lucide-react';
import { pb, getPocketBaseFileUrl } from '../services/pocketbaseService';
import { generateNumericId } from '../utils/idGenerator';
import { uploadToPocketBase } from '../services/pocketbaseService';
import { DEFAULT_AVATAR } from '../constants';
// Firebase retiré totalement suite à suppression du projet par l'utilisateur

interface AuthModalProps {
  type: 'login' | 'signup';
  onClose: () => void;
  onTriggerVerifyWarning?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ type, onClose, onTriggerVerifyWarning }) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loginStep, setLoginStep] = useState<'pseudo' | 'password'>('pseudo');
  const [identifiedUser, setIdentifiedUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isDummyEmail, setIsDummyEmail] = useState(false);
  const [loginPseudo, setLoginPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneStep, setShowPhoneStep] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

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
        stopCamera();
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        const passwordRegex = /[.\s-]/;
        const usernameRegex = /[.\s]/;

        if (username.length < 3) {
          throw new Error("Le pseudo doit faire au moins 3 caractères.");
        }
        if (usernameRegex.test(username)) {
          throw new Error("Le pseudo ne peut pas contenir d'espaces ou de points.");
        }
        
        // Stockage en minuscules pour ignorer la casse et nettoyage des espaces
        const cleanUsernameForNAS = (username || "").trim().toLowerCase();
        const cleanPassword = password || "";
        const cleanDisplayName = (displayName || username || "").trim();
        
        const finalEmail = email.trim() || `${cleanUsernameForNAS}${Date.now()}@wexo.app`;
        
        console.log("Signup debug:", {
          original_username: username,
          clean_username: cleanUsernameForNAS,
          password_length: cleanPassword.length,
          email: finalEmail
        });
        
        if (cleanPassword.length < 6) {
          throw new Error("Votre mot de passe doit contenir au moins 6 caractères.");
        }
        if (passwordRegex.test(cleanPassword)) {
          throw new Error("Le mot de passe ne peut pas contenir de points, d'espaces ou de tirets (-).");
        }
        if (cleanPassword !== confirmPassword.trim()) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        // Vérifier si le pseudo est déjà utilisé (insensible à la casse)
        try {
          const existing = await pb.collection('users').getList(1, 1, {
            filter: `username = "${cleanUsernameForNAS}"`
          });
          
          if (existing.totalItems > 0) {
            throw new Error("Ce pseudo est déjà utilisé. Essayez de vous connecter ou choisissez un autre pseudo.");
          }
        } catch (e: any) {
          if (e.message.includes("déjà utilisé")) throw e;
          console.warn("Erreur lors de la vérification du pseudo:", e);
        }

        setIsDummyEmail(!email.trim());

        try {
          let finalAvatarUrl = selectedAvatar;
          if (isCustomAvatar && selectedAvatar.startsWith('data:')) {
            try {
              const res = await fetch(selectedAvatar);
              const blob = await res.blob();
              finalAvatarUrl = await uploadToPocketBase(blob, `avatar_${cleanUsernameForNAS}.jpg`);
            } catch (pberr) {
              console.error("PocketBase upload error:", pberr);
            }
          }
          
          const pbData = {
            "username": cleanUsernameForNAS,
            "email": finalEmail,
            "emailVisibility": true,
            "password": cleanPassword,
            "passwordConfirm": cleanPassword,
            "name": cleanDisplayName,
            "avatar_url": finalAvatarUrl,
            "role": 'user',
            "display_id": String(generateNumericId())
          };

          console.log("Create record attempt...");
          const pbUser = await pb.collection('users').create(pbData);
          console.log("Inscription NAS réussie:", pbUser);
          
          console.log("Auth attempt with email:", {
            email: finalEmail,
            passLength: cleanPassword.length
          });
          await pb.collection('users').authWithPassword(finalEmail, cleanPassword);
          console.log("Auth successful!");
          
          // Au lieu de fermer, on passe au numéro de téléphone
          setShowPhoneStep(true);
        } catch (err: any) {
          console.error("Auth process error details:", err.data || err);
          let msg = err.message || "Erreur lors de la création du compte.";
          if (err.data && err.data.message) msg = `${msg} (${err.data.message})`;
          if (err.data && err.data.data) {
            const details = Object.entries(err.data.data).map(([k, v]: [string, any]) => `${k}: ${v.message}`).join(', ');
            if (details) msg = `${msg} - ${details}`;
          }
          setError(msg);
          setLoading(false);
          return;
        }

        onClose();
      } else {
        // --- CONNEXION ---
        if (loginStep === 'pseudo') {
          try {
            // Recherche en minuscules pour ignorer la casse du pseudo tapé
            const searchPseudo = loginPseudo.trim().toLowerCase();
            const pbUser = await pb.collection('users').getFirstListItem(`username="${searchPseudo}"`);
            setIdentifiedUser(pbUser);
            setLoginStep('password');
            setLoading(false);
            return;
          } catch (e) {
            throw new Error("Ce pseudo n'existe pas.");
          }
        }

        // Étape Mot de passe
        if (!identifiedUser) return;
        try {
          // On nettoie l'identité mais garde le mot de passe tel quel
          const cleanPassword = password || "";
          const identity = identifiedUser.email || identifiedUser.username;
          
          console.log("Tentative de connexion au NAS:", {
            identity,
            passLength: cleanPassword.length,
            passStart: cleanPassword.substring(0, 2) + "..."
          });
          
          // Authenticate on PocketBase (Email est plus fiable)
          await pb.collection('users').authWithPassword(identity, cleanPassword);
          console.log("Connexion NAS réussie");
        } catch (err: any) {
          console.error("Erreur détaillée connexion NAS:", err.data || err);
          setError("Mot de passe incorrect ou erreur de connexion au NAS.");
          setLoading(false);
          return;
        }
        
        onClose();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE CROPPING ---
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
      };
      reader.readAsDataURL(file);
    }
  };

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

  const applyCrop = () => {
    if (!tempImage || !imgRef.current || !maskRef.current) return;
    const canvas = document.createElement('canvas');
    // Réduction de la taille pour éviter de saturer la base de données (150x150 est idéal pour un avatar)
    canvas.width = 150; 
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fond blanc pour le JPEG (qui ne gère pas la transparence)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 150, 150);
    
    ctx.translate(75, 75);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Ajustement de l'échelle pour la nouvelle taille de 150px
    const displayToCanvasScale = 150 / maskRef.current.offsetWidth;
    ctx.scale(zoom * displayToCanvasScale, zoom * displayToCanvasScale);
    
    ctx.translate(offset.x / zoom, offset.y / zoom);
    ctx.drawImage(imgRef.current, -imgRef.current.clientWidth / 2, -imgRef.current.clientHeight / 2, imgRef.current.clientWidth, imgRef.current.clientHeight);
    
    // Utilisation de JPEG avec compression (0.7 = 70% de qualité) pour un poids plume
    setSelectedAvatar(canvas.toDataURL('image/jpeg', 0.7));
    setIsCustomAvatar(true);
    setShowCropper(false);
  };

  const handleUnderstand = () => {
    if (onTriggerVerifyWarning) {
      onTriggerVerifyWarning();
    }
    onClose();
  };

  const handleGoogleLogin = async () => {
    setError("La connexion Google est désactivée (Migration NAS).");
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  const handlePhoneStepSubmit = async (skip: boolean) => {
    if (!skip && phoneNumber.trim()) {
      setLoading(true);
      try {
        await pb.collection('users').update(pb.authStore.model.id, {
          phone: phoneNumber.trim()
        });
      } catch (err) {
        console.error("Error updating phone:", err);
      } finally {
        setLoading(false);
      }
    }
    onClose();
  };

  if (showPhoneStep) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1a1a1a] sm:bg-black/60 sm:backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full h-full sm:h-auto sm:max-w-md bg-[#1a1a1a] sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl p-8 relative animate-in slide-in-from-right duration-500 flex flex-col justify-center">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white/5 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
              <RefreshCw size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Une dernière étape</h2>
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Ajoutez votre numéro pour aider vos amis à vous trouver et passer des appels natifs.
            </p>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Numéro de téléphone <span className="text-white/40 ml-1">(recommandé)</span></label>
              </div>
              <input 
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-bold text-white placeholder:text-white/10 focus:ring-2 focus:ring-white/20 transition-all"
              />
              <p className="mt-4 text-[10px] text-slate-500 leading-relaxed text-center px-4 font-medium uppercase tracking-tighter">
                Votre numéro ne sera jamais partagé publiquement.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => handlePhoneStepSubmit(false)}
                disabled={loading}
                className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    Suivant
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
              <button 
                onClick={() => handlePhoneStepSubmit(true)}
                disabled={loading}
                className="w-full py-4 text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
              >
                Passer cette étape
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCamera) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black">
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
              className="w-full h-full object-cover mirror"
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
            <p className="mt-4 text-slate-500 text-[10px] font-black">Cliquez pour capturer</p>
          </div>
        </div>
      </div>
    );
  }

  if (showCropper && tempImage) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black select-none">
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
              <button onClick={applyCrop} className="min-w-[180px] bg-white text-slate-900 font-black uppercase text-xs tracking-widest py-4 px-10 rounded-2xl shadow-xl">Terminer</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:bg-black/60 sm:backdrop-blur-sm sm:p-4 overflow-y-auto bg-[#1a1a1a]">
      <div className="w-full h-full sm:h-auto sm:max-w-md bg-[#1a1a1a] sm:border sm:border-white/10 sm:rounded-2xl shadow-2xl p-8 relative animate-in zoom-in duration-300 flex flex-col justify-center overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10"><X size={24} /></button>
        
        {step === 'form' ? (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white tracking-tight">{type === 'signup' ? 'Créer un compte' : 'Bon retour'}</h2>
              <p className="text-slate-400 text-sm mt-2">{type === 'signup' ? 'Commencez l\'aventure avec nous.' : 'Utilisez votre pseudo pour vous connecter.'}</p>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-2xl mb-6 text-center animate-in fade-in slide-in-from-top-2">{error}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
              {type === 'signup' ? (
                <>
                  {/* Sélection de l'Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 group-hover:border-white/20 transition-all">
                        <img src={selectedAvatar} className="w-full h-full object-cover" alt="Avatar" />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-black rounded-xl border-4 border-[#1a1a1a] flex items-center justify-center hover:scale-110 transition-all shadow-xl"
                      >
                        <Camera size={18} />
                      </button>

                      {showAvatarMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#222] border border-white/10 rounded-2xl p-2 shadow-2xl z-50">
                          <button 
                            type="button" 
                            onClick={startCamera}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Camera size={16} />
                            Prendre une photo
                          </button>
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <Upload size={16} />
                            Choisir un fichier
                          </button>
                          <input 
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required 
                      type="text" 
                      placeholder="Pseudo" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-white/20" 
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      translate="no"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 px-4">Sans espaces ni points.</p>
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required 
                      type="text" 
                      placeholder="Pseudo d'affichage" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-white/20" 
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      translate="no"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="email" 
                      placeholder="Email (Optionnel)" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-white/20" 
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      translate="no"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Mot de passe" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white focus:ring-2 focus:ring-white/20" 
                      autoComplete="new-password"
                      translate="no"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} /> }
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1 px-4">Min. 6 caractères. Pas de points, espaces ou tirets.</p>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Confirmer le mot de passe" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white focus:ring-2 focus:ring-white/20" 
                      autoComplete="new-password"
                      translate="no"
                    />
                  </div>
                  <button disabled={loading} type="submit" className="w-full bg-white hover:bg-slate-200 text-black font-bold py-4 rounded-2xl shadow-lg shadow-white/5 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        S'inscrire
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {loginStep === 'pseudo' ? (
                    <>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                          required 
                          type="text" 
                          placeholder="Votre Pseudo" 
                          value={loginPseudo} 
                          onChange={(e) => setLoginPseudo(e.target.value)} 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-white/20" 
                          autoComplete="username"
                          autoCorrect="off"
                          spellCheck="false"
                          translate="no"
                        />
                      </div>
                      <button disabled={loading} type="submit" className="w-full bg-white hover:bg-slate-200 text-black font-bold py-4 rounded-2xl shadow-lg shadow-white/5 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                            Continuer
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="animate-in slide-in-from-right-4 duration-300 space-y-6">
                      <div className="flex flex-col items-center text-center">
                        {identifiedUser?.avatar_url && (
                          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 mb-3 shadow-xl">
                            <img 
                              src={identifiedUser.avatar_url.startsWith('http') ? identifiedUser.avatar_url : getPocketBaseFileUrl('users', identifiedUser.id, identifiedUser.avatar_url)} 
                              className="w-full h-full object-cover" 
                              alt="Profile" 
                            />
                          </div>
                        )}
                        <h3 className="text-white font-bold text-lg">{identifiedUser?.username}</h3>
                        <button 
                          type="button" 
                          onClick={() => {setLoginStep('pseudo'); setIdentifiedUser(null);}}
                          className="text-slate-500 hover:text-white text-[10px] font-bold mt-1"
                        >
                          Ce n'est pas vous ?
                        </button>
                      </div>

                      {identifiedUser?.auth_method === 'google' ? (
                        <div className="space-y-4">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                            <p className="text-amber-400 text-xs font-medium">Ce compte semble utiliser Google. Pour l'instant, seuls les comptes NAS sont supportés.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                              required 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Mot de passe" 
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-sm text-white focus:ring-2 focus:ring-white/20" 
                              autoComplete="current-password"
                              translate="no"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} /> }
                            </button>
                          </div>
                          <button disabled={loading} type="submit" className="w-full bg-white hover:bg-slate-200 text-black font-bold py-4 rounded-2xl shadow-lg shadow-white/5 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                              <>
                                Se connecter
                                <ArrowRight size={18} />
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {(type === 'login' && loginStep === 'pseudo') && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#1a1a1a] px-2 text-slate-500 font-bold tracking-widest">Ou continuer avec</span>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl shadow-sm border border-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </button>
                </>
              )}
            </form>
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-white/5">
                {isDummyEmail ? <ShieldCheck size={40} /> : <MailCheck size={40} />}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isDummyEmail ? 'Compte créé avec succès !' : 'Vérifiez votre boîte mail'}
              </h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                {isDummyEmail 
                  ? "Votre compte a été créé sans adresse email. Vous pouvez maintenant vous connecter avec votre pseudo."
                  : "Un email de confirmation vient d'être envoyé par Firebase Auth à l'adresse suivante :"}
              </p>
              {!isDummyEmail && (
                <div className="mt-2 py-2 px-4 bg-white/10 rounded-2xl inline-block border border-white/10">
                  <span className="text-white font-mono text-sm">{email}</span>
                </div>
              )}
            </div>

            {isDummyEmail ? (
              <div className="bg-amber-500/10 rounded-2xl p-6 border border-amber-500/20 space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500 flex-shrink-0">!</div>
                  <p className="text-xs text-amber-400 leading-relaxed">
                    <span className="font-bold">Attention :</span> Sans email, vous ne pourrez pas récupérer votre mot de passe en cas d'oubli.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">1</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Ouvrez l'email envoyé par <span className="text-white">Firebase Auth</span>.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">2</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Cliquez sur le lien <span className="text-white">"Confirm your email"</span> pour activer votre compte.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={handleUnderstand} 
                className="w-full bg-white text-black font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                J'ai compris
              </button>
              <button 
                onClick={() => setStep('form')}
                className="w-full py-2 text-slate-500 hover:text-white text-[10px] font-bold transition-colors"
              >
                Modifier mon adresse email
              </button>
            </div>
            
            <p className="text-center text-[9px] text-slate-500 mt-8">
              Propulsé par Firebase Security
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
