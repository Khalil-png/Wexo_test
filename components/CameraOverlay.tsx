
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Share2, MessageSquare, Flame, Play, Layout, Loader2, RefreshCw, Video, StopCircle, Zap, Wand2, Image as ImageIcon, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraOverlayProps {
  onClose: () => void;
  onShare: (media: string, destination: 'story' | 'message' | 'short' | 'video', type: 'image' | 'video') => void;
  initialDestination?: 'story' | 'message' | 'short' | 'video';
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onClose, onShare, initialDestination }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [facingMode]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      stopStream();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: mode === 'video'
      });
      
      setStream(mediaStream);
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("L'accès à la caméra a été refusé. Veuillez autoriser l'appareil photo dans les paramètres de votre navigateur ou de l'application.");
      } else {
        setError("Impossible d'accéder à la caméra. Vérifiez qu'elle n'est pas déjà utilisée par une autre application.");
      }
      setLoading(false);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      // 1. Handling actual device flash (torch)
      let torchWasOn = false;
      if (flashOn && stream && facingMode === 'environment') {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          try {
            await track.applyConstraints({
              advanced: [{ torch: true }]
            } as any);
            torchWasOn = true;
          } catch (e) {
            console.error("Capture torch error:", e);
          }
        }
      }

      // 2. Screen Flash overlay
      if (flashOn) {
        setShowFlashOverlay(true);
        // Wait a tiny bit for the torch/screen flash to be visible
        await new Promise(r => setTimeout(r, 150));
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
      }

      // 3. Reset states
      if (flashOn) {
        setShowFlashOverlay(false);
        // If we turned torch ON just for the photo, turn it OFF (unless it was already ON)
        if (torchWasOn && !flashOn) { // flashOn check might be redundant but safe
             const track = stream!.getVideoTracks()[0];
             await track.applyConstraints({ advanced: [{ torch: false }] } as any);
        }
      }
    }
  };

  const startRecording = () => {
    if (stream) {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setCapturedVideo(url);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleShare = (destination: 'story' | 'message' | 'short' | 'video') => {
    if (capturedImage) {
      onShare(capturedImage, destination, 'image');
    } else if (capturedVideo) {
      onShare(capturedVideo, destination, 'video');
    }
  };

  const handleQuickSend = () => {
    if (initialDestination) {
      handleShare(initialDestination);
    } else {
      setShowShareMenu(true);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setCapturedVideo(null);
    setShowShareMenu(false);
  };

  const toggleFlash = async () => {
    const newFlashState = !flashOn;
    setFlashOn(newFlashState);
    
    if (stream && facingMode === 'environment') {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: newFlashState }]
          } as any);
        } catch (e) {
          console.error("Torch error:", e);
        }
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col font-sans select-none touch-none"
    >
      {/* Flash Overlay (Screen Flash) */}
      <AnimatePresence>
        {showFlashOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[300]"
          />
        )}
      </AnimatePresence>

      {/* Header Controls - Lowered as requested to match screenshot */}
      <div className="absolute top-16 left-0 right-0 px-6 flex justify-between items-center z-50">
        <button 
          onClick={onClose}
          className="p-3.5 bg-black/40 backdrop-blur-3xl rounded-full text-white active:scale-90 transition-all border border-white/15"
        >
          <X size={28} strokeWidth={2.5} />
        </button>
        
        {!capturedImage && !capturedVideo && !loading && (
          <button 
            onClick={toggleFlash}
            className={`p-3.5 backdrop-blur-3xl rounded-full transition-all border border-white/15 ${flashOn ? 'bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.8)]' : 'bg-black/40 text-white'}`}
          >
            <Zap size={28} fill={flashOn ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Camera View - FULL SCREEN, NO MARGINS, NO ROUNDED CORNERS */}
      <div className="flex-1 relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-20">
            <Loader2 className="animate-spin" size={48} />
            <span className="text-sm font-bold uppercase tracking-widest opacity-50">Démarrage...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center gap-6 z-20">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
              <X size={32} className="text-red-500" />
            </div>
            <p className="text-white font-medium text-lg leading-relaxed">{error}</p>
            <button onClick={startCamera} className="px-8 py-3 bg-white text-black rounded-2xl font-black uppercase text-sm tracking-widest">Réessayer</button>
          </div>
        )}

        {!capturedImage && !capturedVideo ? (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              filter: selectedFilter === 'chrome' ? 'contrast(1.2) brightness(1.1) saturate(1.1)' : 
                      selectedFilter === 'sepia' ? 'sepia(0.8)' :
                      selectedFilter === 'mono' ? 'grayscale(1)' :
                      selectedFilter === 'warm' ? 'sepia(0.3) saturate(1.4)' :
                      selectedFilter === 'cool' ? 'hue-rotate(180deg) saturate(0.8)' : 'none'
            }}
          />
        ) : (
          capturedImage ? (
            <img 
              src={capturedImage} 
              className="w-full h-full object-cover"
              alt="Captured"
            />
          ) : (
            <video 
              src={capturedVideo!} 
              autoPlay 
              loop 
              playsInline 
              className="w-full h-full object-cover"
            />
          )
        )}

        {isRecording && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-full flex items-center gap-2 animate-pulse z-40">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Recording</span>
          </div>
        )}
      </div>

      {/* Interface Overlay (Mirroring Screenshot precisely) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-6 pb-12 z-50 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
        
        {!capturedImage && !capturedVideo ? (
          <div className="flex flex-col items-center gap-8 w-full">
            
            {/* 1. Filter Options (if Wand clicked) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  className="w-full flex justify-center gap-4 overflow-x-auto no-scrollbar pb-2"
                >
                  {['none', 'chrome', 'sepia', 'mono', 'warm', 'cool'].map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFilter(f)}
                      className={`flex-shrink-0 w-16 h-16 rounded-full border-2 transition-all flex items-center justify-center font-black text-[10px] uppercase tracking-tighter ${selectedFilter === f ? 'border-white bg-white/20 text-white' : 'border-white/20 bg-black/60 text-white/50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Gallery Preview Row (Above Capture Button) */}
            <div className="w-full flex gap-2 overflow-x-auto no-scrollbar px-2 shrink-0">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex-shrink-0 w-24 h-32 rounded-xl bg-white/20 border border-white/20 overflow-hidden relative shadow-2xl">
                  <img 
                    src={`https://picsum.photos/seed/${i + 88}/300/400`} 
                    className="w-full h-full object-cover opacity-80" 
                    alt="Sample" 
                  />
                  {i > 3 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                      <ImageIcon size={12} className="text-white" />
                      <span className="text-[10px] font-black text-white">0</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 3. Main Action Bar (Wand | Capture | Refresh) */}
            <div className="flex items-center justify-between w-full max-w-sm px-6">
              {/* Wand / Filter Button */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all bg-black/40 border border-white/20 backdrop-blur-2xl ${showFilters ? 'ring-2 ring-white scale-110' : 'active:scale-95'}`}
              >
                <Wand2 size={32} className="text-white" strokeWidth={2} />
              </button>

              {/* CENTER CAPTURE BUTTON - White Circle with subtle Ring */}
              <div className="relative flex items-center justify-center">
                {mode === 'photo' ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-1.5 shadow-[0_0_50px_rgba(255,255,255,0.4)] active:scale-90 transition-all border-[8px] border-black/10"
                  >
                    <div className="w-full h-full rounded-full border-2 border-black/5" />
                  </button>
                ) : (
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center p-1.5 active:scale-90 transition-all border-[8px] border-black/10 ${isRecording ? 'bg-red-500 scale-110' : 'bg-white shadow-[0_0_50px_rgba(255,255,255,0.4)]'}`}
                  >
                    {isRecording ? (
                      <StopCircle size={40} className="text-white" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center">
                        <Video size={36} className="text-black" />
                      </div>
                    )}
                  </button>
                )}
              </div>

              {/* CAMERA SWITCH BUTTON */}
              <button 
                onClick={switchCamera}
                className="w-16 h-16 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white backdrop-blur-2xl active:scale-95 transition-all"
              >
                <RefreshCw size={32} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 4. Bottom Mode Switcher Pill */}
            <div className="flex items-center gap-1 bg-[#121212]/80 p-1.5 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl">
              <button 
                onClick={() => setMode('photo')}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-[12px] font-black uppercase tracking-tighter transition-all ${mode === 'photo' ? 'bg-[#222222] text-white shadow-xl border border-white/5' : 'text-white/40 hover:text-white/60'}`}
              >
                <Camera size={16} fill={mode === 'photo' ? 'currentColor' : 'none'} />
                <span>Photo</span>
              </button>
              <button 
                onClick={() => setMode('video')}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-[12px] font-black uppercase tracking-tighter transition-all ${mode === 'video' ? 'bg-[#222222] text-white shadow-xl border border-white/5' : 'text-white/40 hover:text-white/60'}`}
              >
                <Video size={16} fill={mode === 'video' ? 'currentColor' : 'none'} />
                <span>Vidéo</span>
              </button>
            </div>
          </div>
        ) : (
          /* Captured Actions Menu */
          <div className="w-full flex justify-between items-center max-w-md bg-[#121212]/90 backdrop-blur-3xl p-6 rounded-[32px] border border-white/10 shadow-3xl">
            <button 
              onClick={resetCapture}
              className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all border border-white/10"
            >
              Back
            </button>

            {initialDestination === 'message' ? (
              <button 
                onClick={handleQuickSend}
                className="px-10 py-4 bg-[#0055ff] text-white rounded-2xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/40 active:scale-95 transition-all font-black uppercase text-xs tracking-widest"
              >
                Send it
              </button>
            ) : (
              <button 
                onClick={() => setShowShareMenu(true)}
                className="p-5 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all"
              >
                <Share2 size={24} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share Menu Modal */}
      <AnimatePresence>
        {showShareMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[210]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] rounded-t-[40px] p-10 z-[220] border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10" />
              <h3 className="text-2xl font-black text-white mb-10 text-center tracking-tight uppercase">Share on Wexo</h3>
              
              <div className="grid grid-cols-2 gap-6">
                {[
                  { id: 'story', label: 'Story', icon: <Layout />, color: 'text-sky-400', bg: 'bg-sky-400/10' },
                  { id: 'short', label: 'Short', icon: <Flame />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                  { id: 'video', label: 'Vidéo', icon: <Play />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { id: 'message', label: 'Message', icon: <MessageSquare />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' }
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => handleShare(item.id as any)}
                    className="flex flex-col items-center gap-4 p-8 bg-white/5 rounded-[32px] hover:bg-white/10 transition-all group border border-white/5"
                  >
                    <div className={`w-16 h-16 ${item.bg} ${item.color} rounded-[20px] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl`}>
                      {React.isValidElement(item.icon) && React.cloneElement(item.icon as React.ReactElement<{size?: number}>, { size: 32 })}
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowShareMenu(false)}
                className="w-full mt-10 py-4 text-white/30 font-black text-xs uppercase tracking-[0.2em] hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CameraOverlay;
