
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

  const capturePhoto = () => {
    if (videoRef.current) {
      if (flashOn) {
        setShowFlashOverlay(true);
        setTimeout(() => setShowFlashOverlay(false), 200);
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
      className="fixed inset-0 z-[200] bg-black flex flex-col font-sans"
    >
      {/* Flash Overlay */}
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

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pt-10">
        <button 
          onClick={onClose}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
        >
          <X size={24} />
        </button>

        {!capturedImage && !capturedVideo && !loading && (
          <button 
            onClick={toggleFlash}
            className={`p-3 backdrop-blur-md rounded-full transition-all border border-white/10 ${flashOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            <Zap size={24} fill={flashOn ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-[40px] mt-4 mb-4 mx-2">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="animate-spin" size={40} />
            <p className="text-sm font-bold">Initialisation...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-white max-w-xs">
            <p className="text-sm font-bold mb-4">{error}</p>
            <button 
              onClick={startCamera}
              className="px-6 py-3 bg-white text-black rounded-2xl font-bold text-xs"
            >
              Réessayer
            </button>
          </div>
        )}

        {!capturedImage && !capturedVideo ? (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transition-all duration-500"
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
          <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-full flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Enregistrement</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black flex flex-col items-center gap-4 pb-12">
        {!capturedImage && !capturedVideo ? (
          <div className="flex flex-col items-center gap-6 w-full">
            
            {/* Filters row if open */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-full py-2 flex justify-center gap-4 overflow-x-auto no-scrollbar"
                >
                  {['none', 'chrome', 'sepia', 'mono', 'warm', 'cool'].map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedFilter(f)}
                      className={`flex-shrink-0 w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center font-black text-[8px] uppercase tracking-tighter ${selectedFilter === f ? 'border-primary bg-primary/20 text-white' : 'border-white/10 bg-white/5 text-white/40'}`}
                    >
                      {f}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gallery Preview */}
            <div className="w-full overflow-x-auto no-scrollbar py-2">
              <div className="flex gap-2 px-4 h-16">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/10 border border-white/5 overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/${i + 10}/200`} 
                      className="w-full h-full object-cover opacity-60 grayscale hover:grayscale-0 transition-all" 
                      alt="Gallery" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Main Action Bar */}
            <div className="flex items-center justify-center w-full max-w-sm px-6">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all mr-auto ${showFilters ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/10 text-white active:scale-95'}`}
              >
                <Wand2 size={24} fill={showFilters ? 'currentColor' : 'none'} />
              </button>

              <div className="relative flex items-center justify-center mx-12">
                {mode === 'photo' ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-[6px] border-white/20 active:scale-90 transition-all shadow-2xl"
                  >
                    <div className="w-[66px] h-[66px] rounded-full border-2 border-black/10" />
                  </button>
                ) : (
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-[6px] border-white/20 active:scale-90 transition-all shadow-2xl ${isRecording ? 'bg-red-500' : 'bg-white'}`}
                  >
                    {isRecording ? (
                      <StopCircle size={32} className="text-white" />
                    ) : (
                      <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center">
                        <Video size={24} className="text-black" />
                      </div>
                    )}
                  </button>
                )}
              </div>

              <button 
                onClick={switchCamera}
                className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all ml-auto"
              >
                <RefreshCw size={24} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-full border border-white/5 mt-2">
              <button 
                onClick={() => setMode('photo')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${mode === 'photo' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                <Camera size={14} fill={mode === 'photo' ? 'currentColor' : 'none'} />
                <span>Photo</span>
              </button>
              <button 
                onClick={() => setMode('video')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${mode === 'video' ? 'bg-[#2a2a2a] text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                <Video size={14} fill={mode === 'video' ? 'currentColor' : 'none'} />
                <span>Vidéo</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-between items-center max-w-sm pt-4">
            <div className="flex items-center gap-3">
              <button 
                className="p-4 bg-white/10 backdrop-blur-md text-white rounded-2xl border border-white/10"
              >
                <Settings2 size={24} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={resetCapture}
                className="px-6 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-xs border border-white/10 active:scale-95 transition-all"
              >
                Reprendre
              </button>

              {initialDestination === 'message' ? (
                <button 
                  onClick={handleQuickSend}
                  className="px-8 py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-95 transition-all font-bold"
                >
                  Envoyer
                </button>
              ) : (
                <button 
                  onClick={() => setShowShareMenu(true)}
                  className="p-5 bg-white text-black rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all"
                >
                  <Share2 size={24} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-[32px] p-8 z-[220] border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-black text-white mb-6 text-center tracking-tight">Partager sur Wexo</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleShare('story')}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-14 h-14 bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Layout size={28} />
                  </div>
                  <span className="text-xs font-bold text-white">Story</span>
                </button>

                <button 
                  onClick={() => handleShare('short')}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Flame size={28} />
                  </div>
                  <span className="text-xs font-bold text-white">Short</span>
                </button>

                <button 
                  onClick={() => handleShare('video')}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play size={28} />
                  </div>
                  <span className="text-xs font-bold text-white">Vidéo</span>
                </button>

                <button 
                  onClick={() => handleShare('message')}
                  className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare size={28} />
                  </div>
                  <span className="text-xs font-bold text-white">Message</span>
                </button>
              </div>

              <button 
                onClick={() => setShowShareMenu(false)}
                className="w-full mt-8 py-4 text-slate-500 font-bold text-xs uppercase tracking-widest"
              >
                Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CameraOverlay;
