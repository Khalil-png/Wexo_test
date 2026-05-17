
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Share2, MessageSquare, Flame, Play, Layout, Loader2, RefreshCw, Video, StopCircle, Zap, Wand2, Image as ImageIcon, Settings2, Download, Crop, Smile, Type, Pencil, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pb } from '@/services/pocketbaseService';
import { Media } from '@capacitor-community/media';
import { isNative } from '@/utils/api';

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

  // Editor states
  const [editorMode, setEditorMode] = useState<'none' | 'draw' | 'text' | 'sticker'>('none');
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [stickers, setStickers] = useState<{id: string, emoji: string, x: number, y: number}[]>([]);
  const [texts, setTexts] = useState<{id: string, text: string, x: number, y: number}[]>([]);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [isDrawing, setIsDrawing] = useState(false);

  const editorCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    fetchGallery();
    return () => {
      stopStream();
    };
  }, [facingMode]);

  const fetchGallery = async () => {
    try {
      if (isNative()) {
        const media = Media as any;
        // Request permissions (using any to avoid type issues if not in interface)
        if (media.requestPermissions) {
          await media.requestPermissions();
        }

        // Get all medias (photos and videos)
        // Note: quantity 50 is safer for performance with base64 data
        const result = await media.getMedias({
          quantity: 50,
          types: 'all'
        });

        const assets = result.medias.map((m: any) => ({
          id: m.identifier,
          // data is the base64 thumbnail
          url: m.data ? `data:image/jpeg;base64,${m.data}` : m.identifier,
          type: m.duration ? 'video' : 'image'
        }));

        setGalleryImages(assets);
      } else {
        // Web fallback (PocketBase)
        const records = await pb.collection('media').getList(1, 10, {
          sort: '-created',
        });
        
        const images = records.items.map(item => ({
          id: item.id,
          url: pb.files.getUrl(item, item.file),
          type: item.type
        }));
        
        setGalleryImages(images);
      }
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

  const getEditedImage = async (): Promise<string | null> => {
    if (!capturedImage) return null;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = capturedImage;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return capturedImage;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0);

    // 2. Draw paths (drawing)
    // We need to scale paths to canvas size
    const scaleX = canvas.width / (editorCanvasRef.current?.clientWidth || canvas.width);
    const scaleY = canvas.height / (editorCanvasRef.current?.clientHeight || canvas.height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4 * scaleX;

    paths.forEach(path => {
      ctx.strokeStyle = path.color;
      ctx.beginPath();
      path.points.forEach((p: any, i: number) => {
        if (i === 0) ctx.moveTo(p.x * scaleX, p.y * scaleY);
        else ctx.lineTo(p.x * scaleX, p.y * scaleY);
      });
      ctx.stroke();
    });

    // 3. Draw Stickers/Texts (Simplified for now as emojis)
    ctx.font = `${60 * scaleX}px sans-serif`;
    stickers.forEach(s => {
      ctx.fillText(s.emoji, s.x * scaleX, s.y * scaleY + 50 * scaleY);
    });

    ctx.font = `bold ${24 * scaleX}px sans-serif`;
    ctx.fillStyle = 'white';
    texts.forEach(t => {
      ctx.fillText(t.text, t.x * scaleX, t.y * scaleY + 30 * scaleY);
    });

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleShare = async (destination: 'story' | 'message' | 'short' | 'video') => {
    let finalMedia = capturedImage;
    if (capturedImage && (paths.length > 0 || stickers.length > 0 || texts.length > 0)) {
      finalMedia = await getEditedImage();
    }

    if (finalMedia) {
      onShare(finalMedia, destination, 'image');
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

  const handleDownload = async () => {
    if (!capturedImage) return;
    try {
      let finalMedia = capturedImage;
      if (paths.length > 0 || stickers.length > 0 || texts.length > 0) {
        const edited = await getEditedImage();
        if (edited) finalMedia = edited;
      }

      if (isNative()) {
        const media = Media as any;
        // Prefix stripping for base64 if needed by the plugin
        const base64Data = finalMedia.includes('base64,') ? finalMedia.split('base64,')[1] : finalMedia;
        await media.savePhoto({ path: base64Data });
        // Optional: show a toast or feedback
      } else {
        const link = document.createElement('a');
        link.href = finalMedia;
        link.download = `wexo_${Date.now()}.jpg`;
        link.click();
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const addSticker = (emoji: string) => {
    setStickers([...stickers, { id: Math.random().toString(), emoji, x: 100, y: 100 }]);
    setEditorMode('none');
  };

  const addText = (text: string) => {
    setTexts([...texts, { id: Math.random().toString(), text, x: 100, y: 100 }]);
    setEditorMode('none');
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (editorMode !== 'draw') return;
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentPath({ points: [pos], color: selectedColor });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentPath) return;
    const pos = getPos(e);
    setCurrentPath({ ...currentPath, points: [...currentPath.points, pos] });
  };

  const stopDrawing = () => {
    if (currentPath) {
      setPaths([...paths, currentPath]);
    }
    setCurrentPath(null);
    setIsDrawing(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
    const rect = editorCanvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
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
      <div className="absolute top-12 left-0 right-0 px-6 flex justify-between items-center z-50">
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full text-white flex items-center justify-center active:scale-95 transition-all"
        >
          <X size={28} strokeWidth={2.5} />
        </button>
        
        {(!capturedImage && !capturedVideo && !loading) && (
          <button 
            onClick={toggleFlash}
            className={`w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center transition-all ${flashOn ? 'text-white shadow-[0_0_20px_rgba(255,255,255,0.6)]' : 'text-white'}`}
          >
            <Zap size={24} fill={flashOn ? 'white' : 'none'} strokeWidth={2.5} />
          </button>
        )}

        {(capturedImage || capturedVideo) && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownload}
              className="w-10 h-10 bg-black/40 backdrop-blur-xl rounded-full text-white flex items-center justify-center active:scale-95 transition-all"
            >
              <Download size={20} />
            </button>
            <div className="w-10 h-10 bg-black/40 backdrop-blur-xl rounded-full text-white flex items-center justify-center font-bold text-xs">
              HD
            </div>
            <button 
              className="w-10 h-10 bg-black/40 backdrop-blur-xl rounded-full text-white flex items-center justify-center active:scale-95 transition-all"
            >
              <Crop size={20} />
            </button>
            <button 
              onClick={() => setEditorMode(editorMode === 'sticker' ? 'none' : 'sticker')}
              className={`w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center active:scale-95 transition-all ${editorMode === 'sticker' ? 'bg-white text-black' : 'bg-black/40 text-white'}`}
            >
              <Smile size={20} />
            </button>
            <button 
              onClick={() => setEditorMode(editorMode === 'text' ? 'none' : 'text')}
              className={`w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center active:scale-95 transition-all ${editorMode === 'text' ? 'bg-white text-black' : 'bg-black/40 text-white'}`}
            >
              <span className="font-bold text-lg leading-none">Aa</span>
            </button>
            <button 
              onClick={() => setEditorMode(editorMode === 'draw' ? 'none' : 'draw')}
              className={`w-10 h-10 backdrop-blur-xl rounded-full flex items-center justify-center active:scale-95 transition-all ${editorMode === 'draw' ? 'bg-white text-black' : 'bg-black/40 text-white'}`}
            >
              <Pencil size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-20">
            <Loader2 className="animate-spin" size={48} />
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
          <div className="relative w-full h-full overflow-hidden">
            {capturedImage ? (
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
            )}

            {/* Drawing/Editing Canvas Overlay */}
            <div className="absolute inset-0 pointer-events-auto">
              {/* Paths */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {paths.map((path, i) => (
                  <polyline
                    key={i}
                    points={path.points.map((p: any) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={path.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath && (
                  <polyline
                    points={currentPath.points.map((p: any) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={currentPath.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>

              {/* Stickers and Texts */}
              {stickers.map((sticker) => (
                <motion.div
                  key={sticker.id}
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    setStickers(prev => prev.map(s => 
                      s.id === sticker.id ? { ...s, x: s.x + info.delta.x, y: s.y + info.delta.y } : s
                    ));
                  }}
                  className="absolute text-6xl cursor-move select-none"
                  initial={{ x: sticker.x, y: sticker.y }}
                >
                  {sticker.emoji}
                </motion.div>
              ))}

              {texts.map((textItem) => (
                <motion.div
                  key={textItem.id}
                  drag
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    setTexts(prev => prev.map(t => 
                      t.id === textItem.id ? { ...t, x: t.x + info.delta.x, y: t.y + info.delta.y } : t
                    ));
                  }}
                  className="absolute text-white font-bold p-2 text-2xl border border-white/20 bg-black/20 rounded cursor-move select-none"
                  initial={{ x: textItem.x, y: textItem.y }}
                >
                  {textItem.text}
                </motion.div>
              ))}

              {/* Interaction Layer for Drawing */}
              {editorMode === 'draw' && (
                <div 
                  ref={editorCanvasRef as any}
                  className="absolute inset-0 z-10 touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              )}
            </div>

            {/* Color Picker / Modal Overlays */}
            <AnimatePresence>
              {editorMode === 'draw' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-6 top-40 flex flex-col gap-3 z-[60]"
                >
                  {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${selectedColor === color ? 'border-white scale-125' : 'border-black/20'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </motion.div>
              )}
              {editorMode === 'sticker' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-20 left-0 right-0 bg-black/60 backdrop-blur-xl p-4 flex gap-4 overflow-x-auto z-[60]"
                >
                  {['🔥', '❤️', '😂', '✨', '🚀', '💯', '💀', '👀', '🥺', '🙏', '⚡', '🌈'].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => addSticker(emoji)}
                      className="text-4xl p-2 active:scale-90 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
              {editorMode === 'text' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-[60]"
                >
                  <div className="w-full max-w-md bg-zinc-900 rounded-[32px] p-6 border border-white/10 shadow-3xl">
                    <h4 className="text-white font-black uppercase text-sm tracking-widest mb-4">Ajouter du texte</h4>
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Votre texte..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white font-bold mb-6 focus:outline-none focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addText((e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setEditorMode('none')}
                        className="flex-1 py-4 bg-white/5 text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {isRecording && (
          <div className="absolute top-32 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500 text-white rounded-full flex items-center gap-2 animate-pulse z-40">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Recording</span>
          </div>
        )}
      </div>

      {/* Interface Overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-10 z-50">
        
        {!capturedImage && !capturedVideo ? (
          <div className="flex flex-col items-center gap-6 w-full">
            
              {/* 1. Gallery Preview Row (Square thumbnails like WhatsApp) */}
            <div className="w-full flex gap-1 overflow-x-auto no-scrollbar px-1 shrink-0 scroll-smooth mb-2">
              {galleryImages.length > 0 ? (
                galleryImages.map((img, idx) => (
                  <div key={img.id} className="flex-shrink-0 w-20 h-20 bg-zinc-800 overflow-hidden relative group active:scale-95 transition-transform border border-white/10">
                    <img 
                      src={img.url} 
                      className="w-full h-full object-cover" 
                      alt="Gallery" 
                    />
                    {img.type === 'video' && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-white/10">
                        <Video size={10} className="text-white" />
                        <span className="text-[9px] font-bold text-white">0</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Mock Gallery placeholders */
                [1,2,3,4,5,6,7,8].map(i => (
                   <div key={i} className="flex-shrink-0 w-20 h-20 bg-zinc-900 border border-white/5 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                     <ImageIcon size={18} className="absolute inset-0 m-auto text-white/5" />
                   </div>
                ))
              )}
            </div>

            {/* 2. Main Action Bar (Wand | Capture | Refresh) */}
            <div className="flex items-center justify-between w-full max-w-[360px] px-8 z-10 mb-4">
              {/* Filter Button */}
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-zinc-900/40 backdrop-blur-3xl border border-white/10 active:scale-90"
              >
                <Wand2 size={26} className="text-white" />
              </button>

              {/* CENTER CAPTURE */}
              <div className="relative flex items-center justify-center">
                {mode === 'photo' ? (
                  <button 
                    onClick={capturePhoto}
                    className="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center p-1 shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-90 transition-all border-[1.5px] border-black/5"
                  >
                    <div className="w-full h-full rounded-full border-[2px] border-black/10" />
                  </button>
                ) : (
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-[72px] h-[72px] rounded-full flex items-center justify-center p-1 active:scale-90 transition-all ${isRecording ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}
                  >
                    {isRecording ? <div className="w-5 h-5 bg-white rounded-sm" /> : <div className="w-full h-full rounded-full border-[2px] border-black/10" />}
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button 
                onClick={switchCamera}
                className="w-14 h-14 rounded-full bg-zinc-900/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white active:scale-90"
              >
                <RefreshCw size={26} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* 3. Bottom Row (Mode Switcher) */}
            <div className="flex items-center justify-center w-full px-8 mt-2 z-10">
              <div className="flex items-center bg-zinc-900/80 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 gap-1 shadow-2xl">
                <button 
                  onClick={() => setMode('photo')}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'photo' ? 'bg-white text-black shadow-xl scale-105' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Camera size={14} fill={mode === 'photo' ? 'black' : 'none'} />
                  <span>Photo</span>
                </button>
                <button 
                  onClick={() => setMode('video')}
                  className={`flex items-center gap-2 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${mode === 'video' ? 'bg-white text-black shadow-xl scale-105' : 'text-white/40 hover:text-white/60'}`}
                >
                  <Video size={14} fill={mode === 'video' ? 'black' : 'none'} />
                  <span>Vidéo</span>
                </button>
              </div>
            </div>

            {/* Black background zone for controls (Zone noire sous les boutons de mode uniquement) */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-black -z-10" />
          </div>
        ) : (
          /* Captured Actions Menu */
          <div className="w-full flex justify-center pb-6">
            <button 
              onClick={handleQuickSend}
              className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] active:scale-90 transition-all border-4 border-white/10"
            >
              <Check size={40} className="text-white" strokeWidth={3} />
            </button>
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
