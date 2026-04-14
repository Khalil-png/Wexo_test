
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Share2, MessageSquare, Flame, Play, Layout, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraOverlayProps {
  onClose: () => void;
  onShare: (image: string, destination: 'story' | 'message' | 'short' | 'video') => void;
}

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onClose, onShare }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setLoading(false);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image if using front camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleShare = (destination: 'story' | 'message' | 'short' | 'video') => {
    if (capturedImage) {
      onShare(capturedImage, destination);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
        <button 
          onClick={onClose}
          className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
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

        {!capturedImage ? (
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <img 
            src={capturedImage} 
            className="w-full h-full object-cover"
            alt="Captured"
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-10 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-8">
        {!capturedImage ? (
          <button 
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-white/30 active:scale-90 transition-all"
          >
            <div className="w-16 h-16 border-2 border-black rounded-full" />
          </button>
        ) : (
          <div className="w-full flex justify-between items-center max-w-sm">
            <button 
              onClick={() => setShowShareMenu(true)}
              className="p-5 bg-white text-black rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all"
            >
              <Share2 size={24} />
            </button>

            <button 
              onClick={() => setCapturedImage(null)}
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-2xl font-bold text-xs border border-white/10 active:scale-95 transition-all"
            >
              Reprendre
            </button>
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
