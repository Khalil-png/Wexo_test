
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

  const [galleryImages, setGalleryImages] = useState<any[]>([]);

  useEffect(() => {
    startCamera();
    fetchGallery();
    return () => {
      stopStream();
    };
  }, [facingMode]);

  const fetchGallery = async () => {
    try {
      // On récupère les 10 derniers médias (images/vidéos)
      const records = await pb.collection('media').getList(1, 10, {
        sort: '-created',
        expand: 'profile_id'
      });
      
      const images = records.items.map(item => ({
        id: item.id,
        url: pb.files.getUrl(item, item.file),
        type: item.type
      }));
      
      setGalleryImages(images);
    } catch (err) {
      console.error("Error fetching gallery:", err);
    }
  };

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

      {/* Header Controls */}
      <div className="absolute top-16 left-0 right-0 px-6 flex justify-between items-center z-50">
        <button 
          onClick={onClose}
          className="w-11 h-11 bg-black/30 backdrop-blur-3xl rounded-full text-white flex items-center justify-center active:scale-95 transition-all border border-white/5"
        >
          <X size={22} strokeWidth={3} />
        </button>
        
        {!capturedImage && !capturedVideo && !loading && (
          <button 
            onClick={toggleFlash}
            className={`w-11 h-11 backdrop-blur-3xl rounded-full flex items-center justify-center transition-all border border-white/5 ${flashOn ? 'bg-yellow-400 text-black' : 'bg-black/30 text-white'}`}
          >
            <Zap size={22} fill={flashOn ? 'currentColor' : 'none'} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-20">
            <Loader2 className="animate-spin" size={48} />
            <span className="text-sm font-bold uppercase tracking-widest opacity-50">Loading...</span>
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
                      selectedFilter === 'sepia' ? 'sepia(0.8) contrast(1.1)' : 
                      selectedFilter === 'mono' ? 'grayscale(1) contrast(1.2)' : 
                      selectedFilter === 'warm' ? 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' : 
                      selectedFilter === 'cool' ? 'contrast(1.1) saturate(1.2) hue-rotate(10deg) brightness(1.1)' : 'none'
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

        {/* Bottom gradient for thumbnails row */}
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

        {isRecording && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-full flex items-center gap-2 animate-pulse z-40">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Recording</span>
          </div>
        )}
      </div>

      {/* Interface Overlay (Mirroring Screenshot precisely) */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-6 pb-12 z-50">
        
        {!capturedImage && !capturedVideo ? (
          <div className="flex flex-col items-center gap-6 w-full">
            
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
            <div className="w-full flex gap-1 overflow-x-auto no-scrollbar px-0.5 shrink-0 scroll-smooth">
              {galleryImages.length > 0 ? (
                galleryImages.map((img, idx) => (
                  <div key={img.id} className="flex-shrink-0 w-24 h-36 bg-zinc-800 overflow-hidden relative first:rounded-l-2xl last:rounded-r-2xl border-x-[0.5px] border-black/20 group active:scale-95 transition-transform">
                    <img 
                      src={img.url} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt="Gallery" 
                    />
                    {img.type === 'video' && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-lg">
                        <ImageIcon size={10} className="text-white" />
                        <span className="text-[9px] font-bold text-white">0</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Fallback si pas encore d'images
                [1,2,3,4,5,6].map(i => (
                   <div key={i} className="flex-shrink-0 w-24 h-36 bg-zinc-900 overflow-hidden relative first:rounded-l-2xl last:rounded-r-2xl border-r border-black/20 animate-pulse" />
                ))
              )}
            </div>

            {/* 3. Main Action Bar (Wand | Capture | Refresh) */}
            <div className="flex items-center justify-between w-full max-w-[340px] px-2">
              {/* Filter Button */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all bg-zinc-900/60 border border-white/10 backdrop-blur-3xl active:scale-90 ${showFilters ? 'ring-2 ring-white scale-110' : ''}`}
              >
                <Wand2 size={28} className="text-white" />
              </button>

              {/* CENTER CAPTURE */}
              <div className="relative group">
                <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full scale-150 group-active:scale-110 transition-transform" />
                {mode === 'photo' ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-22 h-22 bg-white rounded-full flex items-center justify-center p-1.5 shadow-[0_0_50px_rgba(255,255,255,0.3)] active:scale-90 transition-all z-10 relative overflow-hidden"
                  >
                    <div className="w-full h-full rounded-full border-[8px] border-black/10" />
                  </button>
                ) : (
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-22 h-22 rounded-full flex items-center justify-center p-1.5 active:scale-90 transition-all z-10 relative border-[8px] border-black/10 ${isRecording ? 'bg-red-500 scale-110' : 'bg-white shadow-[0_0_50px_rgba(255,255,255,0.3)]'}`}
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

              {/* Refresh Button */}
              <button 
                onClick={switchCamera}
                className="w-14 h-14 rounded-full bg-zinc-900/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-3xl active:scale-90 transition-all"
              >
                <RefreshCw size={28} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 4. Bottom Mode Switcher & Tools */}
            <div className="flex items-center gap-6 w-full px-6">
              <button className="w-12 h-12 rounded-full bg-zinc-900/80 flex items-center justify-center border border-white/10 active:scale-90 transition-opacity">
                <Layout size={24} className="text-white/80" />
              </button>

              <div className="flex-1 flex items-center justify-center">
                <div className="bg-zinc-900/80 backdrop-blur-3xl p-1 rounded-full border border-white/10 flex gap-1 shadow-2xl">
                  <button 
                    onClick={() => setMode('photo')}
                    className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-[12px] font-black uppercase tracking-tight transition-all ${mode === 'photo' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40'}`}
                  >
                    <Camera size={16} fill={mode === 'photo' ? 'currentColor' : 'none'} />
                    <span>Photo</span>
                  </button>
                  <button 
                    onClick={() => setMode('video')}
                    className={`flex items-center gap-3 px-8 py-3.5 rounded-full text-[12px] font-black uppercase tracking-tight transition-all ${mode === 'video' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40'}`}
                  >
                    <Video size={16} fill={mode === 'video' ? 'currentColor' : 'none'} />
                    <span>Vidéo</span>
                  </button>
                </div>
              </div>

              <button className="w-12 h-12 rounded-full bg-zinc-900/80 flex items-center justify-center border border-white/10 active:scale-90">
                <Settings2 size={24} className="text-white/80" />
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
