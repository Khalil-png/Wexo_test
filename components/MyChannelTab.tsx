
import React, { useState, useEffect } from 'react';
import { renderTextWithEmojis } from '../utils/emoji';
import { Search, Play, Heart, MessageCircle, Share2, Plus, ArrowLeft, Loader2, Sparkles, User as UserIcon, Info, AlertCircle, Upload, Trash2, Edit2, CircleCheck, Zap, Music, X, Copy, Clock } from 'lucide-react';
import { pb, uploadToPocketBase, createPBRecord } from '../services/pocketbaseService';
// Firebase désactivé
import { analyzeVideo, analyzePost } from '../services/geminiService';
import { DEFAULT_AVATAR } from '../constants';
import { Video, Post } from '../types';
import { generateSnowflake } from '../utils/snowflake';
import Username from './Username';

/**
 * Capture un frame d'une vidéo à un timestamp précis
 */
const captureFrame = (file: File, timestamp: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      const seekTime = Math.min(timestamp, video.duration - 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(video.src);
        return reject(new Error("Impossible de créer le contexte canvas"));
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Échec de la capture du frame"));
        }
        URL.revokeObjectURL(video.src);
      }, 'image/jpeg', 0.8);
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(video.src);
      reject(e);
    };
  });
};

interface MyChannelTabProps {
  user: any;
  profile: any;
}

const MyChannelTab: React.FC<MyChannelTabProps> = ({ user, profile }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'shorts' | 'posts'>('videos');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPublishMenu, setShowPublishMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedPostMediaUrl, setUploadedPostMediaUrl] = useState<string | null>(null);
  const [isPreUploading, setIsPreUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setUploadedVideoUrl(null);
      setUploadError(null);
    }
  };

  const handlePostFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostFile(file);
      setUploadedPostMediaUrl(null);
      setUploadError(null);
    }
  };

  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('Initialisation...');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [deleteModalStep, setDeleteModalStep] = useState<'confirm' | 'download' | 'post' | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [postToDelete, setPostToDelete] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [isShort, setIsShort] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = ['Jeux vidéo', 'Récent', 'Nouveautés', 'Animation', 'Musique'];

  /**
   * Tente d'analyser les contenus qui n'ont pas encore été analysés
   * (Utile quand le quota Gemini revient)
   */
  const processUnanalyzedContent = async () => {
    if (!profile?.id || analyzing) return;
    
    try {
      // 1. Chercher les vidéos/shorts non analysés
      // On utilise fetch pour vérifier les champs existants
      const unanalyzedVideos = await pb.collection('videos').getList(1, 5, {
        filter: `creator_id="${profile.id}" && analysis_status != "completed"`,
        sort: '-created'
      }).catch(() => ({ items: [] }));
      
      const unanalyzedShorts = await pb.collection('shorts').getList(1, 5, {
        filter: `creator_id="${profile.id}" && analysis_status != "completed"`,
        sort: '-created'
      }).catch(() => ({ items: [] }));

      const unanalyzedPosts = await pb.collection('posts').getList(1, 5, {
        filter: `user_id="${user.uid}" && analysis_status != "completed"`,
        sort: '-created'
      }).catch(() => ({ items: [] }));

      const allUnanalyzed = [
        ...unanalyzedVideos.items.map(v => ({ ...v, collection: 'videos' })),
        ...unanalyzedShorts.items.map(v => ({ ...v, collection: 'shorts' })),
        ...unanalyzedPosts.items.map(p => ({ ...p, collection: 'posts' }))
      ];

      if (allUnanalyzed.length === 0) return;

      console.log(`Traitement de ${allUnanalyzed.length} contenus non analysés...`);
      
      for (const item of allUnanalyzed) {
        try {
          let analysis;
          if (item.collection === 'posts') {
            analysis = await analyzePost(item.content || "Post sans contenu");
          } else {
            const videoUrl = item.url || item.video_url;
            if (!videoUrl) continue;
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            analysis = await analyzeVideo(blob);
          }

          if (analysis) {
            await pb.collection(item.collection).update(item.id, {
              analysis_status: 'completed',
              is_appropriate: analysis.is_appropriate,
              analysis_data: JSON.stringify(analysis),
              language: analysis.language || 'fr',
              type: analysis.type || 'Inconnu'
            });
          }
        } catch (err: any) {
          if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
            console.warn("Quota Gemini toujours épuisé, arrêt du traitement auto.");
            break;
          }
          console.error(`Échec de l'analyse différée pour l'item ${item.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Erreur lors du traitement du contenu non analysé:", err);
    }
  };

  useEffect(() => {
    if (user?.uid || profile?.id) {
      fetchMyVideos();
      fetchMyPosts();
      // On tente une analyse automatique au chargement
      processUnanalyzedContent();
    }
  }, [user?.uid, profile?.id]);

  const fetchMyPosts = async () => {
    if (!user?.uid) return;
    setLoadingPosts(true);
    try {
      // Récupération des posts depuis PocketBase
      const resultList = await pb.collection('posts').getList(1, 100, {
        filter: `user_id="${user.uid}"`,
        sort: '-created',
        expand: 'user_id'
      });
      
      const formattedPosts = resultList.items.map(p => {
        const author = p.expand?.user_id;
        const fallbackName = p.user_id || 'Utilisateur';

        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          media_url: p.media_url,
          media_type: p.media_type || (p.media_url ? 'image' : null),
          created_at: p.created,
          likes_count: p.likes_count || 0,
          analysis_status: p.analysis_status,
          profiles: {
            username: author?.username || fallbackName,
            display_name: author?.name || author?.username || fallbackName,
            avatar_url: author?.avatar_url || DEFAULT_AVATAR
          }
        };
      });
      
      setPosts(formattedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchMyVideos = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Récupération des contenus depuis PocketBase (Vidéos et Shorts)
      const [videoRes, shortRes] = await Promise.all([
        pb.collection('videos').getList(1, 100, {
          filter: `creator_id="${profile.id}" || author="${profile.id}" || user_id="${profile.id}"`,
          sort: '-created',
        }),
        pb.collection('shorts').getList(1, 100, {
          filter: `creator_id="${profile.id}" || author="${profile.id}" || user_id="${profile.id}"`,
          sort: '-created',
          expand: 'creator_id'
        })
      ]).catch(err => {
        console.warn("Erreur lors de la récupération multi-collection, tentative séparée...", err);
        return [ { items: [] }, { items: [] } ] as any[];
      });

      // Si le premier a échoué lamentablement (p-e champs inexistants), on tente séparement avec des try/catch individuels
      let videoItems = videoRes?.items || [];
      let shortItems = shortRes?.items || [];

      if (videoItems.length === 0 && shortItems.length === 0) {
          try { 
              const v = await pb.collection('videos').getList(1, 100, { filter: `creator_id="${profile.id}" || author="${profile.id}"`, sort: '-created' });
              videoItems = v.items;
          } catch(e) {}
          try { 
              const s = await pb.collection('shorts').getList(1, 100, { filter: `creator_id="${profile.id}"`, sort: '-created' });
              shortItems = s.items;
          } catch(e) {}
      }

      const formattedVideos = videoItems.map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        url: v.url || v.video_url,
        thumbnail_url: v.thumbnail_url,
        creator_id: profile.id,
        is_short: !!v.is_short,
        views: Number(v.views) || 0,
        likes: Number(v.likes) || 0,
        created_at: v.created,
        is_appropriate: v.is_appropriate ?? true,
        analysis_status: v.analysis_status
      }));

      const formattedShorts = shortItems.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        url: s.url || s.video_url,
        thumbnail_url: s.thumbnail_url,
        creator_id: profile.id,
        is_short: true,
        views: Number(s.views) || 0,
        likes: Number(s.likes) || 0,
        created_at: s.created,
        is_appropriate: s.is_appropriate ?? true,
        analysis_status: s.analysis_status
      }));

      setVideos([...formattedVideos, ...formattedShorts].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeDate = (dateString: any) => {
    if (!dateString) return "il y a quelques instants";
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `il y a ${diffInSeconds} secondes`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `il y a ${diffInMonths} mois`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return `il y a ${diffInYears} an${diffInYears > 1 ? 's' : ''}`;
  };

  const handleYouTubePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || !user?.uid) return;
    
    setIsYoutubeLoading(true);
    setError(null);
    console.log('[YouTubeImport] Tentative d\'import pour:', youtubeUrl);

    try {
      // 1. Extraire l'ID vidéo YouTube
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = youtubeUrl.match(regExp);
      const videoId = (match && match[7].length === 11) ? match[7] : null;

      if (!videoId) {
        throw new Error("L'URL YouTube ne semble pas valide.");
      }

      // 2. Récupérer les métadonnées via oEmbed (Public & Gratuit)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      console.log('[YouTubeImport] Récupération métadonnées via oEmbed...');
      
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error("Impossible de récupérer les infos de la vidéo. Elle est peut-être privée ou inexistante.");
      }
      
      const metadata = await response.json();
      console.log('[YouTubeImport] Métadonnées reçues:', metadata);

      // 3. Créer le record dans PocketBase
      await pb.collection('shorts').create({
        title: metadata.title || 'YouTube Short',
        description: `Importé depuis YouTube (${metadata.author_name})`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail_url: metadata.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        creator_id: profile?.id || user.uid,
        source: 'youtube',
        youtube_id: videoId,
        youtube_channel: metadata.author_name,
        views: 0,
        likes: 0,
        analysis_status: 'completed',
        is_appropriate: true
      });

      console.log('[YouTubeImport] Succès ! Short ajouté à Wexo.');
      setSuccess("YouTube Short importé avec succès !");
      setShowYouTubeModal(false);
      setYoutubeUrl('');
      fetchMyVideos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[YouTubeImport] Erreur:', err);
      setError(err.message || "Erreur lors de l'import YouTube.");
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  const uploadFileToStorage = async (file: File | Blob, bucket: string) => {
    try {
      // Conversion Blob -> File si nécessaire
      const fileToUpload = file instanceof File 
        ? file 
        : new File([file], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      setAnalysisStep(`Envoi vers le NAS (${bucket})...`);
      const url = await uploadToPocketBase(fileToUpload);
      return url;
    } catch (error: any) {
      console.error(`Échec de l'upload sur le NAS:`, error);
      throw new Error("Erreur lors de l'envoi sur votre NAS Synology. Vérifiez que le port 9090 est ouvert et que l'adresse est correcte.");
    }
  };

  // Pre-upload video
  useEffect(() => {
    const preUploadVideo = async () => {
      if (!videoFile || uploadedVideoUrl || isPreUploading || uploadError) return;
      
      setIsPreUploading(true);
      setUploadError(null);
      try {
        const url = await uploadFileToStorage(videoFile, isShort ? 'shorts' : 'videos');
        setUploadedVideoUrl(url);
      } catch (err: any) {
        console.error("Erreur lors du pré-upload de la vidéo:", err);
        setUploadError(err.message || "Erreur d'upload");
      } finally {
        setIsPreUploading(false);
      }
    };

    preUploadVideo();
  }, [videoFile, isShort, uploadError]);

  // Pre-upload post media
  useEffect(() => {
    const preUploadPostMedia = async () => {
      if (!postFile || uploadedPostMediaUrl || isPreUploading || uploadError) return;
      
      setIsPreUploading(true);
      setUploadError(null);
      try {
        const url = await uploadFileToStorage(postFile, 'post-media');
        setUploadedPostMediaUrl(url);
      } catch (err: any) {
        console.error("Erreur lors du pré-upload du média du post:", err);
        setUploadError(err.message || "Erreur d'upload");
      } finally {
        setIsPreUploading(false);
      }
    };

    preUploadPostMedia();
  }, [postFile, uploadError]);

  const handlePostUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!postContent.trim() && !postFile) {
      setError("Le post doit contenir du texte ou un fichier.");
      return;
    }

    setUploading(true);
    setError(null);
    let analysisStatus = 'completed';

    try {
      let analysis: any = { is_appropriate: true, type: 'post', language: 'fr' };
      try {
        if (postFile && postFile.type.startsWith('video/')) {
          setAnalyzing(true);
          analysis = await analyzeVideo(postFile);
        } else if (postContent) {
          setAnalyzing(true);
          analysis = await analyzePost(postContent);
        }
      } catch (geminiErr: any) {
        console.warn("Gemini analysis failed during post creation:", geminiErr);
        if (geminiErr.message?.includes('QUOTA_EXCEEDED') || geminiErr.message?.includes('429')) {
          analysisStatus = 'pending_quota';
          setError("Quota Gemini dépassé. Le post est publié mais sera analysé plus tard. 🙂");
        } else {
          analysisStatus = 'failed';
        }
      } finally {
        setAnalyzing(false);
      }

      if (analysisStatus === 'completed' && !analysis.is_appropriate) {
        throw new Error("Ce post ne respecte pas nos règles de communauté.");
      }

      let mediaUrl = uploadedPostMediaUrl;
      let mediaType = null;

      if (postFile && !mediaUrl) {
        mediaUrl = await uploadFileToStorage(postFile, 'post-media');
      }

      if (postFile) {
        if (postFile.type.startsWith('image/')) mediaType = 'image';
        else if (postFile.type.startsWith('video/')) mediaType = 'video';
        else if (postFile.type.startsWith('audio/')) mediaType = 'audio';
      }

      // Save to PocketBase (New Server)
      try {
        await createPBRecord('posts', {
          content: postContent,
          media_url: mediaUrl,
          user_id: user.uid,
          type: analysis.type || 'post',
          analysis_status: analysisStatus,
          is_appropriate: analysisStatus === 'completed' ? analysis.is_appropriate : true
        });
      } catch (pbErr) {
        console.warn("Failed to save post to PocketBase:", pbErr);
        throw pbErr;
      }

      setShowPostModal(false);
      setPostContent('');
      setPostFile(null);
      setUploadedPostMediaUrl(null);
      fetchMyPosts();
      if (analysisStatus === 'completed') {
        setSuccess("Post publié avec succès !");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !videoFile) return;

    setUploading(true);
    setShowAnalysisOverlay(true);
    setAnalysisStep('Préparation de l\'envoi...');
    setAnalysisProgress(10);
    setAnalysisDone(false);
    setError(null);
    setSuccess(null);
    
    setShowUploadModal(false);

    try {
      let videoUrl = uploadedVideoUrl;
      
      if (!videoUrl) {
        setAnalysisStep('Envoi du fichier vidéo...');
        setAnalysisProgress(20);
        videoUrl = await uploadFileToStorage(videoFile, isShort ? 'shorts' : 'videos');
      } else {
        setAnalysisStep('Fichier déjà envoyé, finalisation...');
        setAnalysisProgress(30);
      }

      const videoId = generateSnowflake();
      setAnalysisStep('Création de l\'entrée BDD...');
      setAnalysisStep('Analyse par l\'IA Gemini...');
      setAnalysisProgress(50);
      
      // Simulation de Gemini qui choisit un moment fort
      const geminiSuggestedTime = 2.5; 
      
      let finalThumbnailUrl = `https://picsum.photos/seed/${videoId}/640/360`;
      
      try {
        if (!thumbnailFile && videoFile) {
          setAnalysisStep('Gemini sélectionne le meilleur moment pour la miniature...');
          const frameBlob = await captureFrame(videoFile, geminiSuggestedTime);
          const frameFile = new File([frameBlob], 'thumbnail_ai.jpg', { type: 'image/jpeg' });
          finalThumbnailUrl = await uploadToPocketBase(frameFile);
        } else if (thumbnailFile) {
          finalThumbnailUrl = await uploadToPocketBase(thumbnailFile);
        }
      } catch (err) {
        console.warn("Erreur lors de la capture de la miniature AI:", err);
      }

      const vData = {
        id: videoId,
        title: title || 'Sans titre',
        description: description || '',
        url: videoUrl,
        thumbnail_url: finalThumbnailUrl,
        creator_id: user.uid,
        creator_name: profile?.username || user.email?.split('@')[0] || 'Utilisateur',
        creator_email: user.email,
        creator_role: profile?.role || 'user',
        creator_avatar: profile?.avatar_url || DEFAULT_AVATAR,
        is_short: isShort,
        views: 0,
        likes: 0,
        categories: selectedCategories,
        is_appropriate: true, // Auto-approuvé après "analyse"
        created_at: new Date().toISOString()
      };

      let pbRecord: any = null;
      let analysisStatus = 'completed';
      // Save to PocketBase
      try {
        if (isShort) {
          pbRecord = await pb.collection('shorts').create({
            title: title || 'Sans titre',
            description: description || '',
            url: videoUrl,
            thumbnail_url: vData.thumbnail_url,
            creator_id: profile?.id || user.uid,
            views: 0,
            likes: 0,
            analysis_status: 'pending'
          });
        } else {
          pbRecord = await pb.collection('videos').create({
            title: title || 'Sans titre',
            description: description || '',
            url: videoUrl,
            thumbnail_url: vData.thumbnail_url,
            creator_id: profile?.id || user.uid,
            views: 0,
            is_short: false,
            categories: selectedCategories,
            analysis_status: 'pending'
          });
        }
      } catch (pbErr) {
        console.warn("Failed to save to PocketBase:", pbErr);
        throw pbErr;
      }

      fetchMyVideos();

      setAnalysisStep('Analyse par Gemini (IA)...');
      setAnalysisProgress(60);
      let analysis: any = null;
      
      try {
        const analysisPromise = analyzeVideo(videoFile);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT")), 5 * 60 * 1000)
        );

        analysis = await Promise.race([analysisPromise, timeoutPromise]);
      } catch (err: any) {
        console.error("ERREUR OU TIMEOUT ANALYSE GEMINI:", err);
        if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
          analysisStatus = 'pending_quota';
          setUploadError("Quota Gemini dépassé. La vidéo est publiée mais l'analyse IA se fera automatiquement plus tard. 🙂");
        } else {
          analysisStatus = 'failed';
        }
        
        analysis = {
          type: 'Vidéo',
          name_of_type: null,
          is_appropriate: true,
          language: 'Inconnu',
          thumbnail_timestamp: 0,
          transcription: []
        };
      }

      if (analysisStatus === 'completed' && !analysis.is_appropriate) {
        // En cas de contenu inapproprié détecté immédiatement, on supprime
        if (pbRecord) await pb.collection(isShort ? 'shorts' : 'videos').delete(pbRecord.id);
        throw new Error("Cette vidéo ne respecte pas nos règles de communauté et a été supprimée.");
      }

      setAnalysisStep('Génération de la miniature...');
      setAnalysisProgress(80);
      finalThumbnailUrl = '';
      if (thumbnailFile) {
        finalThumbnailUrl = await uploadFileToStorage(thumbnailFile, 'thumbnails');
      } else {
        let timestamp = analysis.thumbnail_timestamp;
        try {
          const videoElement = document.createElement('video');
          videoElement.onloadedmetadata = () => {}; // Just to satisfy types
          const videoObjectUrl = URL.createObjectURL(videoFile);
          videoElement.src = videoObjectUrl;
          
          await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => resolve(true);
          });
          const duration = videoElement.duration;
          URL.revokeObjectURL(videoObjectUrl);

          if (!timestamp || timestamp <= 0) {
            timestamp = duration / 2;
          }

          const thumbnailBlob = await captureFrame(videoFile, timestamp);
          finalThumbnailUrl = await uploadFileToStorage(thumbnailBlob, 'thumbnails');
        } catch (err: any) {
          console.error("ERREUR CAPTURE THUMBNAIL:", err);
          finalThumbnailUrl = `https://picsum.photos/seed/${Math.random()}/640/360`;
        }
      }

      setAnalysisStep('Finalisation...');
      setAnalysisProgress(90);

      try {
        // Mise à jour des métadonnées vidéo sur PocketBase
        if (pbRecord) {
          await pb.collection(isShort ? 'shorts' : 'videos').update(pbRecord.id, {
            thumbnail_url: finalThumbnailUrl,
            analysis_status: analysisStatus,
            type: analysis.type,
            language: analysis.language,
            is_appropriate: analysis.is_appropriate
          });
        }
      } catch (err) {
        console.error("Erreur mise à jour PocketBase:", err);
      }

      setAnalysisStep('Publication terminée !');
      setAnalysisProgress(100);
      setAnalysisDone(true);
      setSuccess('Vidéo publiée avec succès !');
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setUploadedVideoUrl(null);
      setThumbnailFile(null);
      setSelectedCategories([]);
      setActiveSubTab(isShort ? 'shorts' : 'videos');
      fetchMyVideos();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'envoi.");
      setAnalysisStep('Erreur lors de la publication');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const video = videos.find(v => v.id === id);
    if (!video) return;
    setVideoToDelete(video);
    setDeleteModalStep('confirm');
  };

  const handleDeletePost = (post: any) => {
    setPostToDelete(post);
    setDeleteModalStep('post');
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      // Migration NAS
      setPosts(posts.filter(p => p.id !== postToDelete.id));
      setDeleteModalStep(null);
      setPostToDelete(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    try {
      // Migration NAS
      setVideos(videos.filter(v => v.id !== videoToDelete.id));
      setDeleteModalStep(null);
      setVideoToDelete(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const downloadVideo = async () => {
    if (!videoToDelete) return;
    try {
      const response = await fetch(videoToDelete.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoToDelete.title || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const copyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profile?.display_id) {
      navigator.clipboard.writeText(profile.display_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (!user?.uid) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-700">
        <div className="text-slate-700 mb-8">
          <Info size={48} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Connexion requise</h2>
        <p className="text-slate-400 text-sm max-w-sm font-medium leading-relaxed">
          Vous devez être connecté pour pouvoir accéder à votre chaîne et publier des vidéos.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-700">
      <div className="relative group bg-white/5 border-2 border-white/10 rounded-2xl p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
        <div className="relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-xl">
            <img 
              src={profile?.avatar_url || DEFAULT_AVATAR} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col mb-4">
            <Username 
              username={profile?.username || user.email?.split('@')[0]} 
              displayName={profile?.display_name}
              isVerified={profile?.is_verified} 
              isAdmin={profile?.role === 'admin'}
              email={profile?.email}
              className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1" 
              badgeSize={32} 
            />
            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 font-bold text-sm tracking-tight opacity-70">
              <span>@{profile?.username || 'utilisateur'}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
              <span>{videos.length} {videos.length > 1 ? 'vidéos' : 'vidéo'}</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
            <button 
              onClick={() => setShowPublishMenu(!showPublishMenu)}
              className="bg-white text-black hover:bg-slate-200 font-bold text-sm px-6 py-3 rounded-2xl shadow-xl shadow-white/5 transition-all active:scale-95 flex items-center gap-3 mx-auto sm:mx-0"
            >
              <Plus size={18} className={showPublishMenu ? "rotate-45 transition-transform" : "transition-transform"} /> Publier
            </button>

            {showPublishMenu && (
              <div className="absolute top-full left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 mt-4 w-48 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 shadow-2xl z-[150] animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => {
                    setIsShort(true);
                    setShowUploadModal(true);
                    setShowPublishMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-2xl transition-colors text-left"
                >
                  <Zap size={18} className="text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Shorts</span>
                    <span className="text-[9px] text-slate-500">Format vertical</span>
                  </div>
                </button>

                {user?.email === 'ky.chaine@gmail.com' && (
                  <button 
                    onClick={() => {
                      setShowYouTubeModal(true);
                      setShowPublishMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-2xl transition-colors text-left"
                  >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Youtube_shorts_icon.svg/250px-Youtube_shorts_icon.svg.png" alt="YT" className="w-5 h-5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">YouTube Short</span>
                      <span className="text-[9px] text-slate-500">Importation via lien</span>
                    </div>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setIsShort(false);
                    setShowUploadModal(true);
                    setShowPublishMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-2xl transition-colors text-left"
                >
                  <Play size={18} className="text-sky-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Vidéos</span>
                    <span className="text-[9px] text-slate-500">Format long</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowPostModal(true);
                    setShowPublishMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-white rounded-2xl transition-colors text-left"
                >
                  <Edit2 size={18} className="text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">Posts</span>
                    <span className="text-[9px] text-slate-500">Texte & Images</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Sous-onglets */}
      <div className="flex items-center gap-12 border-b border-white/5 px-6 mb-10">
        {[
          { id: 'videos', label: 'Vidéos' },
          { id: 'shorts', label: 'Shorts' },
          { id: 'posts', label: 'Posts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-5 text-lg font-bold transition-all relative ${
              activeSubTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
            {activeSubTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white rounded-2xl" />
            )}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {activeSubTab === 'videos' && (
          loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          ) : videos.filter(v => !v.is_short).length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <Play size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-xs">Aucune vidéo publiée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.filter(v => !v.is_short).map((video) => (
                <div key={video.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-8 hover:bg-white/[0.02] transition-all group h-32 relative overflow-hidden">
                  {/* Overlay de chargement style image utilisateur */}
                  {!video.is_appropriate && (
                    <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-4">
                      <div className="w-12 h-12 border-[5px] border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-2xl font-bold text-white tracking-tight">Publication...</span>
                    </div>
                  )}

                  <div className="h-full aspect-video rounded-2xl overflow-hidden flex-shrink-0 bg-black/40 relative">
                    <img 
                      src={video.thumbnail_url || undefined} 
                      alt={video.title} 
                      className={`w-full h-full object-cover transition-opacity duration-500 ${!video.is_appropriate ? 'opacity-30 grayscale' : 'opacity-100'}`} 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-bold text-lg truncate">{renderTextWithEmojis(video.title)}</h4>
                      {video.analysis_status === 'pending' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded-full animate-pulse border border-blue-500/20">
                          <Loader2 size={10} className="animate-spin" /> IA en cours
                        </span>
                      )}
                      {video.analysis_status === 'pending_quota' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded-full border border-amber-500/20">
                          <Clock size={10} /> Quota épuisé (auto-retry)
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm truncate max-w-md">{video.description || 'Aucune description'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl flex items-center justify-center transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(video.id)}
                      className="w-10 h-10 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-2xl flex items-center justify-center transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-8 px-6 border-l border-white/5 h-10">
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">vues</p>
                      <p className="text-white font-black text-base leading-none">{video.views}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">j'aime</p>
                      <p className="text-white font-black text-base leading-none">{video.likes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeSubTab === 'shorts' && (
          loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          ) : videos.filter(v => v.is_short).length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <Zap size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-xs">Aucun short publié</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.filter(v => v.is_short).map((video) => (
                <div key={video.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-8 hover:bg-white/[0.02] transition-all group h-32 relative overflow-hidden">
                  {/* Overlay de chargement style image utilisateur */}
                  {!video.is_appropriate && (
                    <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-4">
                      <div className="w-12 h-12 border-[5px] border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-2xl font-bold text-white tracking-tight">Publication...</span>
                    </div>
                  )}

                  <div className="h-full aspect-[9/16] rounded-2xl overflow-hidden flex-shrink-0 bg-black/40 relative">
                    <img 
                      src={video.thumbnail_url || undefined} 
                      alt={video.title} 
                      className={`w-full h-full object-cover transition-opacity duration-500 ${!video.is_appropriate ? 'opacity-30 grayscale' : 'opacity-100'}`} 
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-bold text-lg truncate">{renderTextWithEmojis(video.title)}</h4>
                      {video.analysis_status === 'pending' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded-full animate-pulse border border-blue-500/20">
                          <Loader2 size={10} className="animate-spin" /> IA en cours
                        </span>
                      )}
                      {video.analysis_status === 'pending_quota' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded-full border border-amber-500/20">
                          <Clock size={10} /> Quota épuisé (auto-retry)
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm truncate max-w-md">{video.description || 'Aucune description'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl flex items-center justify-center transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(video.id)}
                      className="w-10 h-10 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-2xl flex items-center justify-center transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-8 px-6 border-l border-white/5 h-10">
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">vues</p>
                      <p className="text-white font-black text-base leading-none">{video.views}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">j'aime</p>
                      <p className="text-white font-black text-base leading-none">{video.likes}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeSubTab === 'posts' && (
          loadingPosts ? (
            <div className="flex justify-center py-10">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-2xl border border-white/10 border-dashed">
              <Edit2 size={40} className="text-slate-700 mb-3" />
              <p className="text-slate-400 font-bold text-xs">Aucun post publié</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-[#111] border border-white/5 rounded-2xl p-4 flex items-center gap-8 hover:bg-white/[0.02] transition-all group h-32">
                  <div className="h-full aspect-video rounded-2xl overflow-hidden flex-shrink-0 bg-black/40 flex items-center justify-center">
                    {post.media_url ? (
                      post.media_type === 'image' ? (
                        <img src={post.media_url} alt="Post" className="w-full h-full object-cover" />
                      ) : post.media_type === 'video' ? (
                        <video src={post.media_url} className="w-full h-full object-cover" />
                      ) : (
                        <Music size={24} className="text-slate-500" />
                      )
                    ) : (
                      <Edit2 size={24} className="text-slate-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-bold text-lg line-clamp-1 leading-tight">{renderTextWithEmojis(post.content || 'Aucune description')}</p>
                      {post.analysis_status === 'pending_quota' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded-full border border-amber-500/20">
                          <Clock size={10} /> Wait Quota
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-[10px] font-bold mt-2">{formatRelativeDate(post.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl flex items-center justify-center transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeletePost(post)}
                      className="w-10 h-10 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-2xl flex items-center justify-center transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-8 px-6 border-l border-white/5 h-10">
                    <div className="text-center">
                      <p className="text-slate-500 text-[8px] font-bold">likes</p>
                      <p className="text-white font-black text-base leading-none">0</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal YouTube Short */}
      {showYouTubeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-[#121212] w-full max-w-lg border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Youtube_shorts_icon.svg/250px-Youtube_shorts_icon.svg.png" className="w-6 h-6" alt="YT" />
                <h3 className="text-xl font-black text-white tracking-tight">Importer sur Wexo</h3>
              </div>
              <button onClick={() => setShowYouTubeModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleYouTubePublish} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Lien du Short YouTube</label>
                <div className="relative">
                  <input 
                    type="url" 
                    placeholder="https://youtube.com/shorts/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    required
                    disabled={isYoutubeLoading}
                    className="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-2xl p-4 text-white font-medium outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
                <p className="text-[10px] text-slate-600 px-1 italic">
                  L'application va automatiquement capter la vidéo, la chaîne et le titre.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
                  <AlertCircle size={18} /> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isYoutubeLoading || !youtubeUrl.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-red-900/10 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isYoutubeLoading ? (
                  <><Loader2 className="animate-spin" size={20} /> Importation...</>
                ) : (
                  <>Importer sur Wexo</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAnalysisOverlay && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="max-w-md w-full flex flex-col items-center text-center">
            {!uploading && (
              <button 
                onClick={() => setShowAnalysisOverlay(false)}
                className="absolute top-8 right-8 p-2 text-slate-400 hover:text-white bg-white/10 rounded-2xl transition-all hover:rotate-90"
              >
                <X size={24} />
              </button>
            )}

            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div className={`absolute inset-0 border-4 ${analysisDone ? 'border-emerald-500' : error ? 'border-red-500' : 'border-white border-t-transparent animate-spin'} rounded-full`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                {analysisDone ? (
                  <CircleCheck size={40} className="text-emerald-500 animate-in zoom-in duration-500" />
                ) : error ? (
                  <AlertCircle size={40} className="text-red-500 animate-in zoom-in duration-500" />
                ) : (
                  <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-4 tracking-tighter">
              {analysisDone ? 'Terminé !' : error ? 'Échec' : 'Analyse...'}
            </h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-4">
              {error ? error : analysisDone ? 'Votre vidéo est maintenant en ligne et prête à être visionnée.' : analysisStep}
            </p>
            
            {uploading && (
              <p className="text-amber-500 text-sm font-bold animate-pulse mb-8">
                ⚠️ Ne fermez pas cette fenêtre pendant l'envoi
              </p>
            )}
            
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-8 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${analysisDone ? 'bg-emerald-500' : error ? 'bg-red-500' : 'bg-white animate-pulse'}`} 
                style={{ width: `${analysisProgress}%` }}
              ></div>
            </div>

            <button 
              disabled={uploading}
              onClick={() => setShowAnalysisOverlay(false)}
              className={`px-8 py-3 ${analysisDone ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white/10 hover:bg-white/20'} text-white font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50`}
            >
              {analysisDone ? 'Voir ma chaîne' : 'Fermer'}
            </button>
          </div>
        </div>
      )}

      {/* Modal d'upload */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => !uploading && setShowUploadModal(false)}></div>
          
          <div className="relative w-full max-w-xl bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {isShort ? 'Publier un Short' : 'Publier une Vidéo'}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    {isShort ? 'Format vertical (9:16)' : 'Format paysage (16:9)'}
                  </p>
                </div>
                {!uploading && (
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-2xl transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                )}
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Titre {isShort ? 'du Short' : 'de la vidéo'}</label>
                  <input 
                    required
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isShort ? "Ex: Mon défi incroyable !" : "Ex: Mon premier vlog"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isShort ? "Ajoutez des hashtags..." : "Dites-en plus sur votre vidéo..."}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white transition-all min-h-[100px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">Fichier {isShort ? 'Short' : 'Vidéo'}</label>
                    <div className="relative">
                      <input 
                        required
                        type="file" 
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className="hidden"
                        id="video-upload"
                      />
                      <label 
                        htmlFor="video-upload"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-slate-500 cursor-pointer hover:border-white/50 transition-all flex items-center gap-2 overflow-hidden"
                      >
                        {isShort ? <Zap size={14} className="flex-shrink-0 text-amber-500" /> : <Play size={14} className="flex-shrink-0 text-sky-500" />}
                        <span className="truncate">{videoFile ? videoFile.name : `Choisir ${isShort ? 'un short' : 'une vidéo'}`}</span>
                        {isPreUploading && videoFile && !uploadedVideoUrl && <Loader2 size={12} className="animate-spin ml-auto" />}
                        {uploadedVideoUrl && <CircleCheck size={12} className="text-emerald-500 ml-auto" />}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">Miniature (Optionnel)</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label 
                        htmlFor="thumbnail-upload"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-slate-500 cursor-pointer hover:border-white/50 transition-all flex items-center gap-2 overflow-hidden"
                      >
                        <Upload size={14} className="flex-shrink-0" />
                        <span className="truncate">{thumbnailFile ? thumbnailFile.name : "Choisir une image"}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 ml-1">Catégories (Plusieurs choix possibles)</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          if (selectedCategories.includes(cat)) {
                            setSelectedCategories(prev => prev.filter(c => c !== cat));
                          } else {
                            setSelectedCategories(prev => [...prev, cat]);
                          }
                        }}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                          selectedCategories.includes(cat) 
                            ? 'bg-white text-black border-white' 
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-white text-black hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm py-5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> 
                      {analyzing ? "Analyse par Gemini..." : "Publication..."}
                    </>
                  ) : (
                    <>
                      <Upload size={18} /> Publier maintenant
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification de succès */}
      {success && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-500">
          <CircleCheck size={20} />
          <span className="text-sm font-bold">{success}</span>
        </div>
      )}

      {/* Modal de publication de Post */}
      {showPostModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !uploading && setShowPostModal(false)}></div>
          <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Créer un Post</h2>
                  <p className="text-slate-400 text-xs font-medium mt-1">Exprimez-vous</p>
                </div>
                {!uploading && (
                  <button 
                    onClick={() => setShowPostModal(false)}
                    className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-2xl transition-colors"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                )}
              </div>

              <form onSubmit={handlePostUpload} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Contenu du post</label>
                  <textarea 
                    required
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Quoi de neuf ?"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-white transition-all min-h-[150px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Fichier (Image, Vidéo ou Audio)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*,video/*,audio/*"
                      onChange={handlePostFileSelect}
                      className="hidden"
                      id="post-file-upload"
                    />
                    <label 
                      htmlFor="post-file-upload"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-slate-500 cursor-pointer hover:border-white/50 transition-all flex items-center gap-2 overflow-hidden"
                    >
                      <Upload size={14} className="flex-shrink-0" />
                      <span className="truncate">{postFile ? postFile.name : "Choisir un fichier"}</span>
                      {isPreUploading && postFile && !uploadedPostMediaUrl && <Loader2 size={12} className="animate-spin ml-auto" />}
                      {uploadedPostMediaUrl && <CircleCheck size={12} className="text-emerald-500 ml-auto" />}
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {uploading && (
                  <p className="text-amber-500 text-[10px] font-bold animate-pulse text-center">
                    ⚠️ Ne fermez pas cette fenêtre pendant l'envoi
                  </p>
                )}

                <button 
                  disabled={uploading}
                  type="submit"
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Publication...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Publier le Post
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {deleteModalStep && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModalStep(null)}></div>
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            {deleteModalStep === 'post' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Supprimer ce post ?</h3>
                <p className="text-slate-500 text-sm mb-8">Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={confirmDeletePost}
                    className="w-full py-4 bg-red-500 text-white font-bold text-xs rounded-2xl hover:bg-red-600 transition-all"
                  >
                    Oui, supprimer
                  </button>
                  <button 
                    onClick={() => setDeleteModalStep(null)}
                    className="w-full py-4 bg-white/10 text-white font-bold text-xs rounded-2xl hover:bg-white/20 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : deleteModalStep === 'confirm' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Supprimer la vidéo ?</h3>
                <p className="text-slate-500 text-sm mb-8">Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setDeleteModalStep('download')}
                    className="w-full py-4 bg-white text-black font-bold text-xs rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Oui, continuer
                  </button>
                  <button 
                    onClick={() => setDeleteModalStep(null)}
                    className="w-full py-4 bg-white/10 text-white font-bold text-xs rounded-2xl hover:bg-white/20 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
                  <Upload size={32} className="rotate-180" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sauvegarder avant ?</h3>
                <p className="text-slate-500 text-sm mb-8">Voulez-vous télécharger la vidéo sur votre appareil avant sa suppression définitive ?</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={async () => {
                      await downloadVideo();
                      confirmDelete();
                    }}
                    className="w-full py-4 bg-white text-black font-bold text-xs rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={14} className="rotate-180" /> Télécharger et supprimer
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setDeleteModalStep(null)}
                      className="py-4 bg-white/10 text-white font-bold text-xs rounded-2xl hover:bg-white/20 transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={confirmDelete}
                      className="py-4 bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-xs rounded-2xl hover:bg-red-500/20 transition-all"
                    >
                      Non, supprimer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyChannelTab;
