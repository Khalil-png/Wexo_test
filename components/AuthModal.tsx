
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Lock, User, Download, Loader2, ArrowRight, RefreshCw, RotateCcw, ArrowLeft, MoreVertical, ShieldCheck, MailCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  type: 'login' | 'signup';
  onClose: () => void;
  onTriggerVerifyWarning?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ type, onClose, onTriggerVerifyWarning }) => {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isDummyEmail, setIsDummyEmail] = useState(false);
  const [loginPseudo, setLoginPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const generateRandomAvatar = () => {
    if (isCustomAvatar) return;
    const randomSeed = Math.random().toString(36).substring(7);
    setSelectedAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
  };

  useEffect(() => {
    if (step === 'form') {
      generateRandomAvatar();
    }
  }, [step]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        // Utilisation d'un timestamp pour rendre l'email unique à chaque milliseconde
        const finalEmail = email.trim() || `${cleanUsername}${Date.now()}@gmail.com`;
        const usingDummy = !email.trim();
        setIsDummyEmail(usingDummy);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: finalEmail,
          password,
          options: {
            data: {
              username: username,
              // On ne met PLUS l'avatar ici pour éviter de faire exploser la taille du jeton JWT
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('rate limit')) {
            throw new Error("Trop de tentatives d'inscription. Veuillez désactiver 'Confirm Email' dans votre console Supabase ou attendre une heure.");
          }
          throw signUpError;
        }

        // --- CRÉATION DU PROFIL DANS LA TABLE 'profiles' ---
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{
              id: data.user.id,
              username: username,
              avatar_url: selectedAvatar,
              email: finalEmail,
              updated_at: new Date().toISOString()
            }]);
          
          if (profileError) {
            console.error("Erreur lors de la création du profil:", profileError);
            // On ne bloque pas l'utilisateur ici car le compte Auth est créé
          }
        }

        setStep('verify');
      } else {
        // --- CONNEXION PAR PSEUDO ---
        const { data: userData, error: userEmailError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', loginPseudo)
          .single();

        if (userEmailError || !userData?.email) {
          throw new Error("Impossible de récupérer l'email associé à ce pseudo. Vérifiez vos accès.");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userData.email,
          password,
        });
        
        if (signInError) throw signInError;
        onClose();
      }
    } catch (err: any) {
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
    setLoading(true);
    setError(null);
    try {
      // Stocker l'avatar actuel comme fallback si Google n'en a pas
      if (selectedAvatar) {
        localStorage.setItem('wexo_google_fallback_avatar', selectedAvatar);
      }
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;

      if (data?.url) {
        const authWindow = window.open(
          data.url,
          'oauth_popup',
          'width=600,height=700'
        );

        if (!authWindow) {
          throw new Error('Le bloqueur de fenêtres surgissantes a empêché la connexion. Veuillez autoriser les popups.');
        }
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue avec Google.");
    } finally {
      setLoading(false);
    }
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

  if (showCropper && tempImage) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black select-none">
        <div className="w-full max-w-2xl bg-[#0a0a0a] md:rounded-[2.5rem] overflow-hidden flex flex-col h-full md:h-[90vh]">
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#111111]">
            <button onClick={() => setShowCropper(false)} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"><ArrowLeft size={24} /></button>
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
            <input type="range" min={minZoom} max={minZoom + 3} step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full max-w-sm h-1 bg-white/20 rounded-full appearance-none accent-sky-400" />
            <div className="flex gap-12">
              <button onClick={() => setRotation(r => (r - 90) % 360)} className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all"><RotateCcw size={24} className="text-white" /></button>
              <button onClick={applyCrop} className="min-w-[180px] bg-sky-400 text-slate-900 font-black uppercase text-xs tracking-widest py-4 px-10 rounded-full shadow-xl">Terminer</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 relative animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        
        {step === 'form' ? (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-lg shadow-sky-500/20 mb-4">W</div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{type === 'signup' ? 'Créer un compte' : 'Bon retour sur Wexo'}</h2>
              <p className="text-slate-500 text-sm mt-2">{type === 'signup' ? 'Commencez l\'aventure avec nous.' : 'Utilisez votre pseudo pour vous connecter.'}</p>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 text-center animate-in fade-in slide-in-from-top-2">{error}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
              {type === 'signup' ? (
                <>
                  <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group">
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      <div onClick={generateRandomAvatar} className={`relative w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-800 p-1 overflow-hidden transition-all ${!isCustomAvatar ? 'cursor-pointer hover:scale-105' : ''}`}>
                        <img src={selectedAvatar || undefined} className="w-full h-full object-cover" alt="Avatar" />
                        {!isCustomAvatar && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><RefreshCw size={24} className="text-white" /></div>}
                      </div>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full border-4 border-slate-900 shadow-lg hover:bg-sky-400 transition-colors"><Download size={14} className="text-white" /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input required type="text" placeholder="Pseudo" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" placeholder="Email (Optionnel)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input required type="text" placeholder="Votre Pseudo" value={loginPseudo} onChange={(e) => setLoginPseudo(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                </div>
              )}
              
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input required type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
              </div>

              {type === 'signup' && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input required type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
                </div>
              )}

              <button disabled={loading} type="submit" className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 mt-4 active:scale-95">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {type === 'signup' ? "S'inscrire" : "Se connecter"}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500 font-bold tracking-widest">Ou continuer avec</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
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
            </form>
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-sky-500/5">
                {isDummyEmail ? <ShieldCheck size={40} /> : <MailCheck size={40} />}
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {isDummyEmail ? 'Compte créé avec succès !' : 'Vérifiez votre boîte mail'}
              </h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                {isDummyEmail 
                  ? "Votre compte a été créé sans adresse email. Vous pouvez maintenant vous connecter avec votre pseudo."
                  : "Un email de confirmation vient d'être envoyé par Supabase à l'adresse suivante :"}
              </p>
              {!isDummyEmail && (
                <div className="mt-2 py-2 px-4 bg-slate-800/50 rounded-xl inline-block border border-slate-700/50">
                  <span className="text-sky-300 font-mono text-sm">{email}</span>
                </div>
              )}
            </div>

            {isDummyEmail ? (
              <div className="bg-amber-500/10 rounded-[2rem] p-6 border border-amber-500/20 space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500 flex-shrink-0">!</div>
                  <p className="text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold">Attention :</span> Sans email, vous ne pourrez pas récupérer votre mot de passe en cas d'oubli.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-[2rem] p-6 border border-slate-700/50 space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">1</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Ouvrez l'email envoyé par <span className="text-slate-200">Supabase Auth</span>.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">2</div>
                  <p className="text-xs text-slate-400 leading-relaxed">Cliquez sur le lien <span className="text-slate-200">"Confirm your email"</span> pour activer votre compte Wexo.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={handleUnderstand} 
                className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                J'ai compris
              </button>
              <button 
                onClick={() => setStep('form')}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                Modifier mon adresse email
              </button>
            </div>
            
            <p className="text-center text-[9px] text-slate-600 mt-8 uppercase tracking-[0.2em]">
              Propulsé par Supabase Security
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
