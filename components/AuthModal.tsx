
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
  const [loginPseudo, setLoginPseudo] = useState(''); // Nouveau state pour le pseudo à la connexion
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
    if (type === 'signup' && step === 'form') {
      generateRandomAvatar();
    }
  }, [type, step]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              avatar_url: selectedAvatar,
            },
            emailRedirectTo: window.location.origin
          }
        });

        if (signUpError) throw signUpError;
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
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(256, 256);
    ctx.rotate((rotation * Math.PI) / 180);
    const displayToCanvasScale = 512 / maskRef.current.offsetWidth;
    ctx.scale(zoom * displayToCanvasScale, zoom * displayToCanvasScale);
    ctx.translate(offset.x / zoom, offset.y / zoom);
    ctx.drawImage(imgRef.current, -imgRef.current.clientWidth / 2, -imgRef.current.clientHeight / 2, imgRef.current.clientWidth, imgRef.current.clientHeight);
    setSelectedAvatar(canvas.toDataURL('image/png'));
    setIsCustomAvatar(true);
    setShowCropper(false);
  };

  const handleUnderstand = () => {
    if (onTriggerVerifyWarning) {
      onTriggerVerifyWarning();
    }
    onClose();
  };

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
                        <img src={selectedAvatar} className="w-full h-full object-cover" alt="Avatar" />
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
                    <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-sky-500" />
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
            </form>
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-sky-500/10 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-sky-500/5">
                <MailCheck size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Vérifiez votre boîte mail</h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Un email de confirmation vient d'être envoyé par <span className="text-sky-400 font-bold">Supabase</span> à l'adresse suivante :
              </p>
              <div className="mt-2 py-2 px-4 bg-slate-800/50 rounded-xl inline-block border border-slate-700/50">
                <span className="text-sky-300 font-mono text-sm">{email}</span>
              </div>
            </div>

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
