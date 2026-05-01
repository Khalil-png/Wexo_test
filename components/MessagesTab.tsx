
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderTextWithEmojis, EMOJI_MAP } from '../utils/emoji';
import { 
  Search, Plus, Smile, Send, X, Image, Pencil,
  CheckCheck, ArrowLeft, Check, Trash2,
  MessageCircle, Info, UserPlus, Clock, 
  MessageSquarePlus, Users, User, Mic, Paperclip, AlertCircle, Video, Sparkles, Camera,
  MessageSquare,
  Dog, Utensils, Trophy, Car, Lightbulb, Heart as HeartIcon, Flag,
  Download, File as FileIcon, FileText, Archive, Ban, Copy, Phone, MoreVertical, Edit2
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { DEFAULT_AVATAR } from '../constants';
import { Message } from '../types';
import { getSmartResponse, generateImage, generateVideo, checkApiKey, openKeySelector, analyzeVideo } from '../services/geminiService';
import { pb, uploadToPocketBase } from '../services/pocketbaseService';
// Firebase désactivé
import { isMobileDevice } from '../src/utils/device';
import { useClickOutside } from '../utils/hooks';

const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent.toLowerCase());
};

const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
};
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSnowflake } from '../utils/snowflake';
import Username from './Username';
import { format } from 'date-fns';

// Avatar Gemini parfaitement centré en X et Y
const GeminiAvatarIcon = ({ size = 16 }: { size?: number }) => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-full">
    <img 
      src="https://static.vecteezy.com/system/resources/thumbnails/055/687/065/small_2x/gemini-google-icon-symbol-logo-free-png.png" 
      className="w-full h-full object-cover" 
      alt="Gemini"
      referrerPolicy="no-referrer"
    />
  </div>
);

const MediaViewer: React.FC<{ 
  media: { url: string; name: string; type: string; message?: string; transcription?: { start: number, end: number, text: string }[] | null }; 
  onClose: () => void 
}> = ({ media, onClose }) => {
  const isVideo = media.type.startsWith('video/');

  return (
    <div 
      className="fixed inset-0 bg-[#0f0f0f]/95 backdrop-blur-md z-[300] flex flex-col animate-in fade-in duration-300"
    >
      {/* Header */}
      <div className="h-20 px-6 flex items-center justify-between bg-gradient-to-b from-[#0f0f0f]/60 to-transparent z-20 shrink-0">
        <h3 className="text-lg font-bold text-white truncate max-w-[70%]">{media.name}</h3>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              try {
                const response = await fetch(media.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = media.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                window.open(media.url, '_blank');
              }
            }}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
            title="Télécharger"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden p-4 sm:p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {isVideo ? (
            <VideoPlayer 
              src={media.url} 
              transcription={media.transcription}
              className="max-w-3xl w-full max-h-full"
            />
          ) : (
            <img 
              src={media.url} 
              alt={media.name} 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          )}
        </div>
      </div>

      {/* Footer / Caption */}
      {media.message ? (
        <div className="min-h-[100px] p-6 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-10 shrink-0">
          <div className="max-w-xl w-full bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-center">
            <p className="text-sm font-medium text-white leading-relaxed text-center">
              {media.message}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-10 shrink-0" />
      )}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Map common language aliases
  const displayLang = lang.toLowerCase() === 'js' ? 'JavaScript' : 
                     lang.toLowerCase() === 'ts' ? 'TypeScript' :
                     lang.toLowerCase() === 'py' ? 'Python' :
                     lang.charAt(0).toUpperCase() + lang.slice(1);

  return (
    <div className="my-4 bg-[#1e1e1e] rounded-2xl border border-white/5 overflow-hidden w-full max-w-full shadow-2xl">
      <div className="flex items-center justify-between px-5 py-3 bg-[#2d2d2d] border-b border-white/5">
        <span className="text-[14px] font-semibold text-slate-200 tracking-tight">{displayLang}</span>
        <button 
          onClick={handleCopy}
          className="p-3 -mr-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
          title="Copier le code"
        >
          {copied ? (
            <Check size={18} className="text-emerald-400" />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>
      <div className="relative group overflow-x-auto custom-scrollbar">
        <SyntaxHighlighter
          language={lang.toLowerCase()}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.85rem',
            lineHeight: '1.6',
            backgroundColor: 'transparent',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            height: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4a4a4a;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #666;
          }
        `}} />
      </div>
    </div>
  );
};

interface ExtendedMessage extends Message {
  isAI?: boolean;
  isError?: boolean;
  isGeneratingImage?: boolean;
  isGeneratingVideo?: boolean;
  generated_image_url?: string;
  generated_video_url?: string;
  needsKey?: boolean;
  is_screenshot_alert?: boolean;
  sender_name?: string;
  is_deleted_for_everyone?: boolean;
  deleted_for_me_by?: string[];
  is_edited?: boolean;
  read?: boolean;
}

interface MessagesTabProps {
  user?: any;
  profile?: any;
  isKeyboardActive?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image size={24} />;
  if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return <Archive size={24} />;
  if (type.includes('pdf')) return <FileText size={24} />;
  return <FileIcon size={24} />;
};

const truncateFileName = (name: string, limit: number = 25) => {
  if (name.length <= limit) return name;
  const parts = name.split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    const base = parts.join('.');
    return base.substring(0, limit - 5) + '...' + (ext ? '.' + ext : '');
  }
  return name.substring(0, limit - 3) + '...';
};

const isOnlyEmojis = (str: string) => {
  if (!str || !str.trim()) return false;
  // Regex for emojis, including variations and sequences
  const emojiRegex = /^(\s|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\ud83b[\udc00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]|\u200d)+$/;
  return emojiRegex.test(str);
};

const countEmojis = (str: string) => {
  if (!str) return 0;
  const emojiRegex = /([\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\ud83b[\udc00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]|\u200d)/g;
  const matches = str.match(emojiRegex);
  // This is a rough count, but should work for the 5 emoji limit
  return matches ? matches.length : 0;
};

const MessagesTab: React.FC<MessagesTabProps> = ({ user, profile, isKeyboardActive: isKeyboardActiveProp }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('chat'));
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [inputValue, setInputValue] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<'tout' | 'ami'>('tout');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messageOptions, setMessageOptions] = useState<ExtendedMessage | null>(null);
  const [showDeleteFriend, setShowDeleteFriend] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; name: string; type: string; message?: string; transcription?: { start: number, end: number, text: string }[] | null } | null>(null);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [localUploadError, setLocalUploadError] = useState<string | null>(null);
  const [stagedFile, setStagedFile] = useState<{ url: string, name: string, type: string, size: number } | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ExtendedMessage | null>(null);
  const [messageToEdit, setMessageToEdit] = useState<ExtendedMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ExtendedMessage | null>(null);
  const [viewMedia, setViewMedia] = useState<{ url: string; name: string; type: string; message?: string; transcription?: any } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);
  
  const initialHeight = useRef(window.innerHeight);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      // Pour reconstruire la liste des conversations, on cherche les messages où l'utilisateur est impliqué
      const filter = `sender_id="${user.uid}" || receiver_id="${user.uid}"`;
      const resultList = await pb.collection('messages').getList(1, 100, {
        filter: filter,
        sort: '-created',
      });

      // Extraire les identifiants uniques des interlocuteurs
      const participants = new Set<string>();
      resultList.items.forEach(m => {
        if (m.sender_id !== user.uid) participants.add(m.sender_id);
        if (m.receiver_id !== user.uid) participants.add(m.receiver_id);
      });

      // Récupérer les profils et construire la liste
      const convs: any[] = [];
      
      // On ajoute Gemini dans les conversations SYSTEMATIQUEMENT
      const lastGeminiMsg = resultList.items.find(m => m.sender_id === 'gemini' || m.receiver_id === 'gemini');
      convs.push({
        id: 'gemini',
        username: 'Gemini',
        display_name: 'Assistant IA',
        lastMessage: lastGeminiMsg?.text || 'Assistant IA',
        lastMessageTime: lastGeminiMsg ? new Date(lastGeminiMsg.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount: 0,
        isAI: true
      });

      participants.delete('gemini');

      // Optimisation: récupérer tous les profils en une seule fois pour éviter les boucles de requêtes
      if (participants.size > 0) {
        const participantArray = Array.from(participants);
        const filterStr = participantArray.map(id => `id="${id}"`).join(' || ');
        
        try {
          const usersRes = await pb.collection('users').getList(1, participantArray.length, {
            filter: filterStr
          });
          
          for (const u of usersRes.items) {
             if (u.id === 'gemini' || u.username.toLowerCase() === 'gemini' || (u.name || '').toLowerCase() === 'gemini') {
                continue;
             }
             const lastMsg = resultList.items.find(m => m.sender_id === u.id || m.receiver_id === u.id);
             convs.push({
               id: u.id,
               username: u.username,
               avatar_url: u.avatar_url,
               display_name: u.name || u.username || u.username,
               lastMessage: lastMsg?.text || '',
               lastMessageTime: lastMsg ? new Date(lastMsg.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
               unreadCount: 0
             });
          }
        } catch (e) {
          console.error("Erreur batch chargement profils:", e);
        }
      }

      setConversations(convs);
    } catch (err: any) {
      console.error("Erreur chargement conversations NAS:", {
        message: err.message,
        details: err.response,
        error: err
      });
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user || !selectedId) return;
    
    try {
      // Pour Gemini, on peut stocker localement ou sur le NAS. 
      // Si on veut que ça persiste après refresh, il faut le NAS.
      const filter = `(sender_id="${user.uid}" && receiver_id="${selectedId}") || (sender_id="${selectedId}" && receiver_id="${user.uid}")`;
      const resultList = await pb.collection('messages').getList(1, 100, {
        filter: filter,
        sort: 'created',
      });

      const formatted = resultList.items.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        text: m.text,
        created_at: m.created,
        is_own: m.sender_id === user.uid,
        isAI: m.sender_id === 'gemini',
        file_url: m.file_url,
        file_name: m.file_name,
        file_type: m.file_type,
        file_size: m.file_size,
        timestamp: new Date(m.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      } as ExtendedMessage));

      setMessages(formatted);
    } catch (err) {
      console.error("Erreur chargement messages NAS:", err);
    }
  }, [user, selectedId]);

  const fetchSelectedProfile = useCallback(async () => {
    if (!selectedId || selectedId === 'gemini') return;
    try {
      const u = await pb.collection('users').getOne(selectedId);
      setSelectedProfile({
        username: u.username,
        avatar_url: u.avatar_url,
        display_name: u.display_name,
        is_verified: u.is_verified,
        role: u.role,
        email: u.email
      });
    } catch (e) {
      console.error("Erreur profil destinataire:", e);
    }
  }, [selectedId]);

  useEffect(() => {
    // API VisualViewport : La plus fiable sur APK Android pour détecter le clavier
    if (window.visualViewport) {
      const vv = window.visualViewport;
      const handleResize = () => {
        setIsKeyboardOpen(vv.height < window.innerHeight * 0.85);
      };
      vv.addEventListener('resize', handleResize);
      return () => vv.removeEventListener('resize', handleResize);
    } else {
      const handleResize = () => {
        setIsKeyboardOpen(window.innerHeight < initialHeight.current * 0.85);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Gestion du bouton retour Android
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      let closedSomething = false;

      if (selectedMedia) {
        setSelectedMedia(null);
        closedSomething = true;
      } else if (isSearchingUsers) {
        setIsSearchingUsers(false);
        closedSomething = true;
      } else if (showEmojiPicker) {
        setShowEmojiPicker(false);
        closedSomething = true;
      } else if (showPlusMenu) {
        setShowPlusMenu(false);
        closedSomething = true;
      } else if (messageOptions) {
        setMessageOptions(null);
        closedSomething = true;
      } else if (messageToDelete) {
        setMessageToDelete(null);
        closedSomething = true;
      } else if (messageToEdit) {
        setMessageToEdit(null);
        closedSomething = true;
      } else if (showDeleteFriend) {
        setShowDeleteFriend(null);
        closedSomething = true;
      }

      if (closedSomething) {
        e.preventDefault();
      }
    };

    window.addEventListener('app-back-button', handleBackButton);
    return () => window.removeEventListener('app-back-button', handleBackButton);
  }, [selectedMedia, isSearchingUsers, showEmojiPicker, showPlusMenu, messageOptions, messageToDelete, messageToEdit, showDeleteFriend]);

  // Gestion du réveil de l'app (app-resume)
  useEffect(() => {
    const handleResume = () => {
      console.log('MessagesTab resume detected, refreshing conversations...');
      fetchConversations();
    };

    window.addEventListener('app-resume', handleResume);
    return () => window.removeEventListener('app-resume', handleResume);
  }, [fetchConversations]);

  // Combine internal listener and prop for maximum reliability
  // Pour le padding de la barre de message, on se fie UNIQUEMENT au resize (isKeyboardOpen)
  // pour éviter que la barre ne saute dès qu'on clique (focus) avant que le clavier ne sorte.
  const isPhysicalKeyboardOpen = isKeyboardOpen;
  const isAnyKeyboardOpen = isKeyboardOpen || !!isKeyboardActiveProp;

  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId !== selectedId) {
      setSelectedId(chatId);
    }
    // Toujours s'assurer que mobileView est synchronisé avec l'URL
    setMobileView(chatId ? 'chat' : 'list');
  }, [searchParams, selectedId]);

  const handleSelectChat = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSearchParams({ chat: id });
    } else {
      setSearchParams({});
    }
    setMobileView(id ? 'chat' : 'list');
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const messageOptionsRef = useRef<HTMLDivElement>(null);
  const deleteFriendRef = useRef<HTMLDivElement>(null);

  useClickOutside(emojiPickerRef, () => setShowEmojiPicker(false));
  useClickOutside(plusMenuRef, () => setShowPlusMenu(false));
  useClickOutside(messageOptionsRef, () => setMessageOptions(null));
  useClickOutside(deleteFriendRef, () => setShowDeleteFriend(null));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiCategories = [
    { id: 'smileys', icon: <Smile size={18} />, label: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧'] },
    { id: 'people', icon: <User size={18} />, label: 'People', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'] },
    { id: 'nature', icon: <Dog size={18} />, label: 'Nature', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'] },
    { id: 'food', icon: <Utensils size={18} />, label: 'Food', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢'] },
    { id: 'activity', icon: <Trophy size={18} />, label: 'Activity', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '⛳', '⛸️', '🎣', '🛶', '🏄', '🏊', '🚴', '🚵', '🤸', '🤼', '🤽', '🤾', '🤺', '🏇', '🧘', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎫', '🎟️', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'] },
    { id: 'travel', icon: <Car size={18} />, label: 'Travel', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚏', '🛣️', '🛤️', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🚢', '✈️', '🛩️', '🛫', '🛬', '💺', '🚁', '🚟', '🚠', '🚡', '🚀', '🛸', '🛰️', '⌛', '⏳', '⌚', '⏰', '⏱️', '⏲️', '🕰️', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌡️', '☀️', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '☁️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌨️', '🌩️', '🌪️', '🌫️', '🌬️', '🌀', '🌈', '🌂', '☂️', '☔', '⛱️', '⚡', '❄️', '☃️', '⛄', '☄️', '🔥', '💧', '🌊'] },
    { id: 'objects', icon: <Lightbulb size={18} />, label: 'Objects', emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '🕰️', '⏰', '⏳', '⌛', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒'] },
    { id: 'symbols', icon: <HeartIcon size={18} />, label: 'Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '💡', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞'] },
    { id: 'flags', icon: <Flag size={18} />, label: 'Flags', emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇹', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇿', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇺🇳', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'] },
  ];

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Real-time pour les conversations
      pb.collection('messages').subscribe('*', (e) => {
        if (e.action === 'create') {
          fetchConversations();
        }
      });
      
      return () => {
        try {
          pb.collection('messages').unsubscribe('*').catch(() => {});
        } catch (e) {
          // Ignore
        }
      };
    } else {
      setSelectedId(null);
      setMobileView('list');
      setConversations([]);
      setMessages([]);
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (user && selectedId) {
      setStagedFile(null);
      fetchMessages();

      if (selectedId === 'gemini') {
        setSelectedProfile({ username: 'Gemini', avatar_url: null });
      } else {
        fetchSelectedProfile();
      }

      // Real-time subscription
      pb.collection('messages').subscribe('*', (e) => {
        if (e.action === 'create') {
          const m = e.record;
          // Vérifier si le message appartient à la conversation actuelle
          const isRelated = (m.sender_id === user.uid && m.receiver_id === selectedId) || 
                            (m.sender_id === selectedId && m.receiver_id === user.uid);
          
          if (isRelated) {
            setMessages(prev => {
              // Vérifier si le message existe déjà (par ID réel ou par détection d'optimistic update)
              const isDuplicate = prev.some(msg => 
                msg.id === m.id || 
                ((msg.is_own || msg.sender_id === 'gemini') && 
                 msg.text === m.text && 
                 msg.sender_id === m.sender_id &&
                 Math.abs(new Date(msg.created_at).getTime() - new Date(m.created).getTime()) < 10000)
              );

              if (isDuplicate) {
                // Si c'est un doublon d'un message optimiste (le nôtre ou celui de Gemini), 
                // on met à jour l'ID temporaire par l'ID réel
                return prev.map(msg => {
                  if ((msg.is_own || msg.sender_id === 'gemini') && msg.text === m.text && !msg.id.startsWith('rec')) {
                    return { ...msg, id: m.id, created_at: m.created };
                  }
                  return msg;
                });
              }
              
              const newMsg = {
                id: m.id,
                sender_id: m.sender_id,
                receiver_id: m.receiver_id,
                text: m.text,
                created_at: m.created,
                is_own: m.sender_id === user.uid,
                isAI: m.sender_id === 'gemini',
                file_url: m.file_url,
                file_name: m.file_name,
                file_type: m.file_type,
                file_size: m.file_size,
                timestamp: new Date(m.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              } as ExtendedMessage;
              return [...prev, newMsg];
            });
          }
        }
      });

      return () => {
        try {
          pb.collection('messages').unsubscribe('*').catch(() => {});
        } catch (e) {
          // Ignore
        }
      };
    } else {
      setMessages([]);
    }
  }, [user, selectedId, fetchMessages]);

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const ensureGeminiProfile = async () => {
    // Migration NAS : Gemini sera géré via PocketBase plus tard
  };

  const sendScreenshotAlert = async () => {
    // Migration NAS : Alertes non supportées pour le moment
  };

  useEffect(() => {
    if (!selectedId || selectedId === 'gemini') return;

    const handleKeyUp = (e: KeyboardEvent) => {
      // Detect PrintScreen key
      if (e.key === 'PrintScreen') {
        sendScreenshotAlert();
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, user, profile]);

  useEffect(() => {
    // Listen for custom event from Header or Camera
    const handleSelectChat = (e: any) => {
      setSelectedId(e.detail);
      setMobileView('chat');
    };
    window.addEventListener('select-chat', handleSelectChat);

    const handleMediaCapture = (e: any) => {
      if (e.detail && e.detail.destination === 'message') {
        const { media, type, fileName } = e.detail;
        setStagedFile({
          url: media,
          name: fileName || (type === 'video' ? 'Capture vidéo.mp4' : 'Capture photo.png'),
          type: type === 'video' ? 'video/mp4' : 'image/png',
          size: 0
        });
      }
    };
    window.addEventListener('media-captured', handleMediaCapture);

    // Check URL param on mount
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedId(chatId);
      setMobileView('chat');
    }

    return () => {
      window.removeEventListener('select-chat', handleSelectChat);
      window.removeEventListener('media-captured', handleMediaCapture);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTypingAI]);

  useEffect(() => {
    if (user?.uid) {
      fetchFriendships();
    }
  }, [user?.uid]);

  const fetchFriendships = async () => {
    if (!user?.uid) return;
    try {
      const result = await pb.collection('friendships').getList(1, 100, {
        filter: `requester_id="${user.uid}" || receiver_id="${user.uid}"`
      });
      setFriendships(result.items);
    } catch (err: any) {
      if (err.status !== 404) console.warn("Erreur fetchFriendships:", err);
    }
  };

  const handleSearchUsers = async (queryStr: string, tab: 'tout' | 'ami' = searchTab) => {
    setSearchQuery(queryStr);
    setShowDeleteFriend(null);
    
    try {
      // Recherche PocketBase
      const filter = queryStr ? `username ~ "${queryStr}" || name ~ "${queryStr}"` : '';
      const result = await pb.collection('users').getList(1, 20, { filter });
      
      const data = result.items
        .filter(m => 
          m.id !== user?.uid && 
          m.id !== 'gemini' && 
          m.username.toLowerCase() !== 'gemini' &&
          (m.name || '').toLowerCase() !== 'gemini'
        )
        .map(m => ({
          id: m.id,
          username: m.username,
          display_name: m.name || m.username,
          avatar_url: m.avatar_url,
          is_verified: m.is_verified || false,
          role: m.role || 'user'
        }));
        
      setUsersList(data);
    } catch (err) {
      console.error("Erreur recherche NAS:", err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user?.uid) return;
    try {
      const friendship = friendships.find(f => 
        (f.requester_id === user.uid && f.receiver_id === friendId) || 
        (f.requester_id === friendId && f.receiver_id === user.uid)
      );
      
      if (friendship) {
        await pb.collection('friendships').delete(friendship.id);
        setFriendships(prev => prev.filter(f => f.id !== friendship.id));
      }
    } catch (err) {
      console.error("Erreur suppression ami:", err);
    }
    setShowDeleteFriend(null);
  };

  const renderMessageText = (text: string, largeEmojis: boolean) => {
    if (!text) return null;
    
    if (largeEmojis) {
      return (
        <div className="text-4xl">
          {renderTextWithEmojis(text, 'w-10 h-10')}
        </div>
      );
    }

    const processChildren = (children: any) => {
      return React.Children.map(children, child => {
        if (typeof child === 'string') {
          return renderTextWithEmojis(child);
        }
        return child;
      });
    };

    return (
      <div className="markdown-body text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const isMultiLine = String(children).includes('\n');
              const hasLang = !!match;
              
              if (hasLang || isMultiLine) {
                return (
                  <CodeBlock
                    code={String(children).replace(/\n$/, '')}
                    lang={match ? match[1] : 'javascript'}
                  />
                );
              }
              return (
                <code className="bg-[#2b2d31] border border-white/10 px-1.5 py-0.5 rounded-md text-slate-200 font-mono text-[0.9em]" {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => <>{children}</>,
            p: ({ children }) => <div className="mb-2 last:mb-0 leading-relaxed">{processChildren(children)}</div>,
            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{processChildren(children)}</ul>,
            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{processChildren(children)}</ol>,
            li: ({ children }) => <li className="mb-1">{processChildren(children)}</li>,
            h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{processChildren(children)}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{processChildren(children)}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{processChildren(children)}</h3>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-white/20 pl-4 italic mb-2">{processChildren(children)}</blockquote>,
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{processChildren(children)}</a>,
            strong: ({ children }) => <strong className="font-bold">{processChildren(children)}</strong>,
            em: ({ children }) => <em className="italic">{processChildren(children)}</em>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  const handleMigrationPlaceholder = () => {};

  const handleAddFriend = async (targetId: string) => {
    if (!user?.uid) return;
    try {
      // Check if already exists
      const exists = friendships.find(f => 
        (f.requester_id === user.uid && f.receiver_id === targetId) || 
        (f.requester_id === targetId && f.receiver_id === user.uid)
      );
      if (exists) return;

      const newFriendship = await pb.collection('friendships').create({
        requester_id: user.uid,
        receiver_id: targetId,
        status: 'pending'
      });

      setFriendships(prev => [...prev, newFriendship]);

      // CRÉATION DE LA NOTIFICATION POUR LE DESTINATAIRE
      await pb.collection('notifications').create({
        user_id: targetId,
        sender_id: user.uid,
        type: 'friend_request',
        title: 'Demande d\'ami',
        content: `${profile?.display_name || user.displayName || 'Un utilisateur'} souhaite vous ajouter en ami.`,
        status: 'pending',
        read: false
      });
    } catch (err) {
      console.error("Erreur demande ami:", err);
    }
  };

  const sendMessage = async (textArg?: string, fileData?: { url: string, name: string, type: string, size: number }) => {
    const text = textArg !== undefined ? textArg : inputValue;
    const finalFileData = fileData || stagedFile;
    if ((!text.trim() && !finalFileData) || !user) return;
    const isGemini = selectedId === 'gemini';
    const now = new Date().toISOString();

    const newMsg: any = { 
      sender_id: user.uid, 
      receiver_id: selectedId!, 
      text: text || '', 
      created_at: now 
    };

    if (finalFileData) {
      newMsg.file_url = finalFileData.url;
      newMsg.file_name = finalFileData.name;
      newMsg.file_type = finalFileData.type;
      newMsg.file_size = finalFileData.size;
    }
    
    // Optimistic UI
    const optimisticTimestamp = new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });

    setMessages(prev => [...prev, { 
      ...newMsg, 
      id: Date.now().toString(), 
      is_own: true, 
      timestamp: optimisticTimestamp
    } as ExtendedMessage]);
    
    setInputValue('');
    setStagedFile(null);

    // Migration NAS : Envoi des messages PocketBase
    try {
      const pbData = {
        ...newMsg,
        created: now // Map logic if needed
      };
      await pb.collection('messages').create(pbData);

      // CRÉATION DE LA NOTIFICATION POUR LE DESTINATAIRE
      if (selectedId && selectedId !== 'gemini') {
        try {
          await pb.collection('notifications').create({
            user_id: selectedId,
            sender_id: user.uid,
            sender_avatar: profile?.avatar_url || '',
            type: 'message',
            title: profile?.display_name || user.displayName || 'Wexo',
            content: text || (finalFileData ? 'Pièce jointe reçue' : 'Nouveau message'),
            status: 'pending',
            read: false
          });
        } catch (notifErr: any) {
          if (notifErr.status !== 404) {
            console.warn("Échec création notification:", notifErr);
          }
        }
      }

      fetchConversations();
    } catch (err) {
      console.error("Erreur envoi message NAS:", err);
    }
    
    if (isGemini) {
      try {
        setIsTypingAI(true);
        
        // Prepare history for Gemini
        const history: any[] = [];
        const validMessages = messages.filter(m => !m.isError).slice(-10);
        
        validMessages.forEach(m => {
          history.push({
            role: m.sender_id === user.uid ? 'user' : 'model',
            parts: [{ text: m.text || '' }]
          });
        });

        // Add the current message
        if (finalFileData && (finalFileData.type.startsWith('image/') || finalFileData.type.startsWith('video/'))) {
          try {
            const response = await fetch(finalFileData.url);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(blob);
            });
            const base64Data = await base64Promise;
            
            history.push({
              role: 'user',
              parts: [
                { text: text || (finalFileData.type.startsWith('image/') ? "Analyse cette image." : "Analyse cette vidéo.") },
                { inlineData: { data: base64Data, mimeType: finalFileData.type } }
              ]
            });
          } catch (err) {
            console.error("Error reading file for Gemini:", err);
            history.push({ role: 'user', parts: [{ text: text || '' }] });
          }
        } else {
          history.push({ role: 'user', parts: [{ text: text || '' }] });
        }
        
        const aiResult = await getSmartResponse(history);
        const responseText = aiResult.text;
        const isQuotaError = responseText.includes("Une erreur s'est produite");
        
        const aiSnowflakeId = generateSnowflake();
        const aiMsg: any = { 
          id: aiSnowflakeId,
          sender_id: 'gemini', 
          receiver_id: user.uid, 
          text: responseText, 
          created_at: new Date().toISOString() 
        };

        const aiTimestamp = new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit'
        });

        if (aiResult.imagePrompt || aiResult.videoPrompt) {
          const aiFinalMsg = { 
            ...aiMsg, 
            is_own: false, 
            isAI: true,
            isGeneratingImage: !!aiResult.imagePrompt,
            isGeneratingVideo: !!aiResult.videoPrompt,
            timestamp: aiTimestamp
          };
          
          setMessages(prev => {
            if (prev.some(m => m.id === aiSnowflakeId)) return prev;
            return [...prev, aiFinalMsg as any];
          });
          setIsTypingAI(false);

          // On sauvegarde aussi la réponse de Gemini sur le NAS pour la persistance
          try {
            await pb.collection('messages').create({
              sender_id: 'gemini',
              receiver_id: user.uid,
              text: responseText,
              is_ai: true,
              created: new Date().toISOString()
            });
            // Update conversation list
            fetchConversations();
          } catch (e) {
            console.error("Erreur sauvegarde réponse Gemini NAS:", e);
          }
        }

        // Handle image generation
        if (aiResult.imagePrompt) {
          try {
            const base64Image = await generateImage(aiResult.imagePrompt as string);
            const parts = base64Image.split(';base64,');
            if (parts.length === 2) {
              const contentType = parts[0].split(':')[1];
              const raw = window.atob(parts[1]);
              const uInt8Array = new Uint8Array(raw.length);
              for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
              const blob = new Blob([uInt8Array], { type: contentType });
              const file = new File([blob], 'gemini-image.png', { type: contentType });
              const publicUrl = await uploadToPocketBase(file);
              
              setMessages(prev => prev.map(m => m.id === aiSnowflakeId ? { ...m, generated_image_url: publicUrl, isGeneratingImage: false } : m));
              // Update PB message with image url
              const aiMsgsPB = await pb.collection('messages').getList(1, 1, { filter: `id="${aiSnowflakeId}"` });
              if (aiMsgsPB.items.length > 0) {
                await pb.collection('messages').update(aiMsgsPB.items[0].id, { file_url: publicUrl, file_type: 'image/png' });
              }
            }
          } catch (err) {
            console.error("Gemini Image Gen Error:", err);
            setMessages(prev => prev.map(m => m.id === aiSnowflakeId ? { ...m, isGeneratingImage: false, isError: true, text: "Erreur lors de la génération d'image." } : m));
          }
        }

        // Handle video generation
        if (aiResult.videoPrompt) {
          try {
            const videoUrl = await generateVideo(aiResult.videoPrompt as string);
            setMessages(prev => prev.map(m => m.id === aiSnowflakeId ? { ...m, generated_video_url: videoUrl, isGeneratingVideo: false } : m));
            // Update PB if needed
          } catch (err) {
            console.error("Gemini Video Gen Error:", err);
            setMessages(prev => prev.map(m => m.id === aiSnowflakeId ? { ...m, isGeneratingVideo: false, isError: true, text: "Erreur lors de la génération vidéo." } : m));
          }
        }

        if (!aiResult.imagePrompt && !aiResult.videoPrompt) {
          const aiFinalMsg = { 
            ...aiMsg, 
            is_own: false, 
            isAI: true,
            isError: isQuotaError,
            timestamp: aiTimestamp
          };
          
          setMessages(prev => {
            if (prev.some(m => m.id === aiSnowflakeId)) {
              return prev.map(m => m.id === aiSnowflakeId ? { ...m, ...aiFinalMsg as any } : m);
            }
            return [...prev, aiFinalMsg as any];
          });
          setIsTypingAI(false);

          try {
            await pb.collection('messages').create({
              sender_id: 'gemini',
              receiver_id: user.uid,
              text: responseText,
              is_ai: true,
              is_error: isQuotaError,
              created: new Date().toISOString()
            });
            fetchConversations();
          } catch (e) {
            console.error("Erreur sauvegarde réponse Gemini NAS:", e);
          }
        }
      } catch (err: any) {
        console.error("Erreur Gemini:", err);
        const errorMsg = "Une erreur s'est produite, veuillez réessayer dans un instant.";
        const aiSnowflakeId = generateSnowflake();
        const aiErrorMsg = {
          id: aiSnowflakeId,
          sender_id: 'gemini',
          receiver_id: user.uid,
          text: errorMsg,
          isAI: true,
          isError: true,
          created_at: new Date().toISOString(),
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiErrorMsg as any]);
        setIsTypingAI(false);
      }
    }
  };

  const deleteMessage = async (mode: 'everyone' | 'me') => {
    const targetMsg = messageToDelete || selectedMessage;
    if (!targetMsg || !user) return;
    
    try {
      if (mode === 'everyone') {
        // Supprimer pour tout le monde (soft delete logic)
        await pb.collection('messages').update(targetMsg.id, {
          text: 'Message supprimé',
          is_deleted_for_everyone: true
        });
      } else {
        // Supprimer pour moi
        const deletedForMe = [...(targetMsg.deleted_for_me_by || []), user.uid];
        await pb.collection('messages').update(targetMsg.id, {
          deleted_for_me_by: deletedForMe
        });
      }
      
      // Update local state
      setMessages(prev => prev.filter(m => m.id !== targetMsg.id));
      setMessageToDelete(null);
      setSelectedMessage(null);
    } catch (err) {
      console.error("Erreur suppression message:", err);
      setMessageToDelete(null);
      setSelectedMessage(null);
    }
  };

  const handleUpdateMessage = async () => {
    const targetMsg = messageToEdit || selectedMessage;
    if (!targetMsg || !editText.trim() || !user) return;
    try {
      await pb.collection('messages').update(targetMsg.id, {
        text: editText + '\u200B', // Hidden char to mark as edited if we don't have is_edited field
        is_edited: true
      });
      
      setMessages(prev => prev.map(m => m.id === targetMsg.id ? { ...m, text: editText, is_edited: true } : m));
      setMessageToEdit(null);
      setSelectedMessage(null);
      setEditText('');
    } catch (err) {
      console.error("Erreur édition message:", err);
    }
  };

  const handleLongPress = (msg: ExtendedMessage) => {
    if (isMobileDevice()) {
      setSelectedMessage(msg);
    }
  };

  const touchStart = (msg: ExtendedMessage) => {
    const timer = setTimeout(() => {
      handleLongPress(msg);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const touchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedId) return;

    setUploadingFile(true);
    setLocalUploadError(null);
    try {
      const publicUrl = await uploadToPocketBase(file);
      
      let transcription = null;
      if (file.type.startsWith('video/')) {
        try {
          const analysis = await analyzeVideo(file);
          transcription = analysis.transcription || null;
        } catch (err) {
          console.error("Error analyzing video for message:", err);
        }
      }

      setStagedFile({
        url: publicUrl, 
        name: file.name, 
        type: file.type, 
        size: file.size, 
        transcription
      } as any);

    } catch (err: any) {
      console.error('Error uploading file:', err);
      setLocalUploadError(err.message || 'Erreur lors de l\'envoi du fichier.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#0f0f0f]">
        <div className="text-slate-700 mb-8">
          <Info size={48} />
        </div>
        <p className="text-slate-500 text-xs font-medium leading-relaxed">
          Vous devez être connecté pour pouvoir accéder à vos messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0f0f0f] overflow-hidden relative w-full border-t border-white/10">
      
      {/* Sidebar Discussion */}
      <div className={`w-full lg:w-[380px] border-r border-white/10 flex-col bg-[#0f0f0f] lg:flex h-full overflow-hidden ${mobileView === 'chat' ? 'hidden' : 'flex'}`}>
        <div className="p-6 pb-2 space-y-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white tracking-tight">Messages</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-[#1a1a1a] border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-500" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative pt-4">
          {/* Gemini List Item */}
          <div onClick={() => handleSelectChat('gemini')} className={`flex items-center gap-3 p-4 cursor-pointer border-l-4 transition-all ${selectedId === 'gemini' ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
              <GeminiAvatarIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h4 className="text-sm font-bold text-white truncate">Gemini</h4>
              </div>
              <p className="text-xs truncate font-medium text-slate-400">Assistant IA</p>
            </div>
          </div>

          {/* User Conversations List */}
          {conversations.filter(c => c.id !== 'gemini').map(c => (
            <div key={c.id} onClick={() => handleSelectChat(c.id)} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === c.id ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
              <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden relative">
                <img src={c.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                {c.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-2xl border-2 border-[#0f0f0f] flex items-center justify-center animate-in zoom-in duration-300">
                    {c.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h4 className={`text-sm font-bold truncate ${c.unreadCount > 0 ? 'text-white' : 'text-slate-200'}`}>{c.username}</h4>
                  <span className={`text-[9px] font-bold ${c.unreadCount > 0 ? 'text-white' : 'text-slate-500'}`}>{c.lastMessageTime}</span>
                </div>
                <p className={`text-xs truncate font-medium ${c.unreadCount > 0 ? 'text-white font-bold' : 'text-slate-400'}`}>{renderTextWithEmojis(c.lastMessage || 'Membre Wexo')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FABs sur Mobile - Visibles uniquement sur la liste */}
        <div className="fixed bottom-32 right-6 lg:hidden flex flex-col gap-4 z-[100] items-center">
          <button 
            onClick={() => handleSelectChat('gemini')}
            className="w-14 h-14 bg-[#1a1a1a] text-white rounded-xl shadow-2xl flex items-center justify-center active:scale-95 transition-all border border-white/10"
          >
            <div className="w-8 h-8">
              <GeminiAvatarIcon size={32} />
            </div>
          </button>
          
          <button 
            onClick={() => setIsSearchingUsers(true)}
            className="w-16 h-16 bg-[#0066ff] text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-white/10"
          >
            <Plus size={36} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Modal Recherche / Démarrer discussion */}
      {isSearchingUsers && (
        <div className="absolute inset-0 z-[110] bg-[#0f0f0f] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-[#0f0f0f]/80 backdrop-blur-xl">
            <button onClick={() => setIsSearchingUsers(false)} className="p-2.5 text-slate-400 hover:text-white bg-white/5 rounded-2xl"><ArrowLeft size={20} /></button>
            <h3 className="text-xl font-black text-white tracking-tighter">Nouveau message</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input autoFocus value={searchQuery} onChange={(e) => handleSearchUsers(e.target.value)} type="text" placeholder="Rechercher par pseudo..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-white/20 transition-all" />
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => {setSearchTab('tout'); handleSearchUsers(searchQuery, 'tout');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black transition-all ${searchTab === 'tout' ? 'bg-[#272727] text-white shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}>TOUT</button>
              <button onClick={() => {setSearchTab('ami'); handleSearchUsers(searchQuery, 'ami');}} className={`px-10 py-3 rounded-2xl text-[10px] font-black transition-all ${searchTab === 'ami' ? 'bg-[#272727] text-white shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}>AMI</button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {usersList.map((u) => {
                const friendship = friendships.find(f => f.requester_id === u.id || f.receiver_id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden">
                        <img src={u.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div><h4 className="text-sm font-bold text-white tracking-tight">{u.username}</h4></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { handleSelectChat(u.id); setIsSearchingUsers(false); }} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white hover:text-black transition-all">
                        <MessageSquarePlus size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Discussion Centrale */}
      <div 
        className={`flex-1 flex flex-col bg-[#0f0f0f] relative lg:flex overflow-hidden scroll-none select-none ${mobileView === 'list' ? 'hidden text-slate-100' : 'fixed inset-0 z-[120] lg:relative lg:inset-auto lg:z-0 flex'}`}
        style={{ height: '100dvh', overscrollBehavior: 'none' }}
      >
        {selectedId ? (
          <div className="flex-1 flex flex-col relative bg-[#0f0f0f] h-full overflow-hidden" style={{ overscrollBehavior: 'none', height: '100dvh' }}>
            {/* Header du Chat */}
            <div className={`px-4 py-3 border-b border-white/10 bg-[#0f0f0f] flex items-center justify-between flex-shrink-0 z-40 ${isAndroidDevice() ? 'pt-14 pb-3' : ''}`}>
              {selectedMessage ? (
                <div className="flex items-center justify-between w-full animate-in fade-in duration-200">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedMessage(null)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24} /></button>
                    <span className="text-white font-bold text-lg">1 Sélectionné</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMessage.is_own && !selectedMessage.is_deleted_for_everyone && (
                      <button 
                        onClick={() => {
                          setEditText(selectedMessage.text || '');
                          setMessageToEdit(selectedMessage);
                        }} 
                        className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => setMessageToDelete(selectedMessage)} 
                      className="p-2 text-white hover:bg-white/10 rounded-full transition-colors text-red-400"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleSelectChat(null)} className="lg:hidden p-2 text-slate-400 -ml-1 transition-colors hover:text-white"><ArrowLeft size={24} /></button>
                    <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                      {selectedId === 'gemini' ? (
                        <GeminiAvatarIcon size={24} />
                      ) : (
                        <img src={selectedProfile?.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedId === 'gemini' ? (
                          <span className="text-sm font-bold text-white">Gemini</span>
                        ) : (
                          <Username 
                            username={selectedProfile?.username || 'Chargement...'} 
                            displayName={selectedProfile?.display_name}
                            isVerified={selectedProfile?.is_verified} 
                            isAdmin={selectedProfile?.role === 'admin'}
                            email={selectedProfile?.email}
                            className="text-sm font-black tracking-tight text-white" 
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedId === 'gemini' ? (
                          <p className="text-[9px] text-slate-500 font-bold">Assistant IA</p>
                        ) : (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full ${selectedProfile?.online ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
                            <p className="text-[9px] text-slate-500 font-bold">{selectedProfile?.online ? 'En ligne' : 'Hors-ligne'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedId !== 'gemini' && (
                    <div className="flex items-center gap-2 relative">
                      {(() => {
                        const friendship = friendships.find(f => f.requester_id === selectedId || f.receiver_id === selectedId);
                        if (friendship?.status === 'accepted') return (
                          <div className="relative">
                            <button onClick={() => setShowDeleteFriend(showDeleteFriend === selectedId ? null : selectedId)} className="p-2.5 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
                              <Check size={18} />
                            </button>
                            {showDeleteFriend === selectedId && (
                              <div ref={deleteFriendRef} className="absolute top-full mt-2 right-0 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                <button onClick={() => handleRemoveFriend(selectedId)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-[10px] font-black rounded-2xl shadow-xl hover:bg-red-600 transition-all whitespace-nowrap">
                                  <Trash2 size={14} /> Supprimer l'ami
                                </button>
                              </div>
                            )}
                          </div>
                        );
                        if (friendship?.status === 'pending') return (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-slate-500 rounded-2xl border border-white/10 opacity-50">
                            <Clock size={14} /> <span className="text-[10px] font-black text-white/40">En attente</span>
                          </div>
                        );
                        return (
                          <button onClick={() => handleAddFriend(selectedId)} className="p-2.5 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
                            <UserPlus size={18} />
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar flex flex-col z-10 py-4 sm:py-8 ${isMobileDevice() ? 'pb-1' : ''}`}>
              {messages.map((msg, idx) => {
                if (msg.is_screenshot_alert) {
                  return (
                    <div key={msg.id} className="w-full flex justify-center my-4 px-4 sm:px-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                          <AlertCircle size={16} />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">
                          <span className="text-white">{msg.sender_name || 'Un utilisateur'}</span> a pris un screenshot de la discussion.
                        </p>
                      </div>
                    </div>
                  );
                }

                const isImage = msg.file_type?.startsWith('image/') || 
                                msg.isGeneratingImage || 
                                !!msg.generated_image_url;

                const isVideo = msg.file_type?.startsWith('video/') ||
                                msg.isGeneratingVideo ||
                                !!msg.generated_video_url;

                const isDoc = msg.file_type && 
                              !msg.file_type.startsWith('image/') && 
                              !msg.file_type.startsWith('video/');

                const isSelected = selectedMessage?.id === msg.id;

                return (
                  <div 
                    key={msg.id}
                    onTouchStart={() => touchStart(msg)}
                    onTouchEnd={touchEnd}
                    onContextMenu={(e) => {
                      if (!isMobileDevice()) {
                        e.preventDefault();
                        setSelectedMessage(msg);
                      }
                    }}
                    className={`flex flex-col mb-1.5 px-4 sm:px-8 group transition-all duration-300 relative ${msg.is_own ? 'items-end' : 'items-start'} ${isSelected ? 'bg-white/5 py-2' : ''}`}
                  >
                    {/* Date Divider (Simple) */}
                    {(idx === 0 || new Date(messages[idx].created_at).toDateString() !== new Date(messages[idx-1].created_at).toDateString()) && (
                      <div className="w-full flex justify-center my-6">
                        <span className="bg-white/5 px-4 py-1.5 rounded-2xl text-[10px] font-black text-slate-500 border border-white/5 shadow-sm uppercase tracking-widest">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2.5 max-w-[85%] sm:max-w-[70%] group/bubble ${msg.is_own ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Interaction Actions on Desktop */}
                      {!isMobileDevice() && (
                        <div className={`opacity-0 group-hover/bubble:opacity-100 transition-all flex items-center gap-1 self-center ${msg.is_own ? 'mr-2' : 'ml-2'}`}>
                          {msg.is_own && !msg.is_deleted_for_everyone && (
                            <button onClick={() => { setEditText(msg.text || ''); setMessageToEdit(msg); }} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"><Edit2 size={14} /></button>
                          )}
                          <button onClick={() => setMessageToDelete(msg)} className="p-2 text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-400/10 rounded-xl transition-all"><Trash2 size={14} /></button>
                        </div>
                      )}

                      <div 
                        className={`relative px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-300 ${
                          msg.is_own 
                            ? 'bg-[#0066ff] text-white rounded-tr-none' 
                            : msg.isAI && (msg.isError || (msg.text && msg.text.includes("Une erreur s'est produite")))
                              ? 'bg-red-500/5 border border-red-500/20 text-red-500 rounded-tl-none'
                              : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                        } ${isSelected ? 'scale-95' : 'hover:scale-[1.01]'}`}
                      >
                        {/* Media Display */}
                        {(isImage || isVideo || isDoc) && (
                          <div className="mb-3 rounded-xl overflow-hidden border border-white/10 bg-black/20 group/media transition-all">
                            {isImage && (
                              <div className="relative cursor-pointer aspect-square sm:aspect-video min-w-[200px]" onClick={() => setViewMedia({ url: msg.generated_image_url || msg.file_url || '', name: msg.file_name || 'Image IA', type: 'image' })}>
                                <img 
                                  src={msg.generated_image_url || msg.file_url} 
                                  className={`w-full h-full object-cover transition-all duration-700 ${msg.isGeneratingImage ? 'blur-xl animate-pulse grayscale' : 'hover:scale-110'}`} 
                                  alt="" 
                                  referrerPolicy="no-referrer" 
                                />
                                {msg.isGeneratingImage && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                                    <p className="text-xs font-black text-white italic tracking-widest animate-pulse">GÉNÉRATION... IA</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {isVideo && (
                              <div className="relative aspect-video min-w-[240px] bg-black">
                                <VideoPlayer 
                                  src={msg.generated_video_url || msg.file_url || ''} 
                                  poster="" 
                                />
                                {msg.isGeneratingVideo && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20 px-8 text-center">
                                    <div className="w-14 h-14 border-4 border-white/10 border-t-[#0066ff] rounded-full animate-spin mb-6" />
                                    <p className="text-sm font-black text-white italic tracking-tighter uppercase mb-2">Traitement Vidéo IA</p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Gemini génère et encode votre vidéo haute résolution...</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {isDoc && (
                              <div className="p-4 flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
                                  <FileText size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{msg.file_name}</p>
                                  <p className="text-[10px] text-slate-400">{Math.round((msg.file_size || 0) / 1024)} KB</p>
                                </div>
                                <button onClick={() => window.open(msg.file_url, '_blank')} className="p-2.5 bg-white text-black rounded-xl hover:bg-slate-200 transition-all"><Download size={16} /></button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text Content + Status Inside */}
                        <div className="flex flex-col">
                          {msg.text && (
                            <div className="text-[15px] leading-relaxed break-words font-medium overflow-hidden">
                              {msg.isAI ? (
                                <div className="markdown-body">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code({node, inline, className, children, ...props}: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                          <CodeBlock code={String(children).replace(/\n$/, '')} lang={match[1]} />
                                        ) : (
                                          <code className={`${className} bg-white/10 px-1.5 py-0.5 rounded-md text-sm font-mono`} {...props}>
                                            {children}
                                          </code>
                                        );
                                      }
                                    }}
                                  >
                                    {msg.text}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                renderTextWithEmojis(msg.text)
                              )}
                            </div>
                          )}
                          
                          {/* Message Status Bar Inside Bubble */}
                          <div className={`mt-1 flex items-center gap-1 justify-end opacity-60`}>
                            <span className="text-[9px] font-black tracking-tighter">
                              {msg.timestamp}
                            </span>
                            {msg.is_edited && <span className="text-[8px] font-black italic uppercase">Modifié</span>}
                            {msg.is_own && (
                              <CheckCheck size={10} strokeWidth={3} className={msg.read ? 'text-white' : 'text-white/40'} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Stage de Fichier (Review avant envoi) */}
            {stagedFile && (
              <div className="mx-4 mb-2 p-4 bg-[#1a1a1a] border border-white/10 rounded-2xl animate-in slide-in-from-bottom duration-300 shadow-2xl flex items-center gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#0066ff]" />
                <div className="w-14 h-14 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {stagedFile.type.startsWith('image/') ? (
                    <img src={stagedFile.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  ) : stagedFile.type.startsWith('video/') ? (
                    <Video size={24} className="text-[#0066ff]" />
                  ) : (
                    <FileText size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{stagedFile.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{(stagedFile.size / (1024 * 1024)).toFixed(2)} MB • PRÊT À L'ENVOI</p>
                </div>
                <button onClick={() => setStagedFile(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={18} /></button>
              </div>
            )}

            {/* Barre d'input - Style Wexo Original */}
            <div className="px-4 py-3 sm:px-8 sm:py-6 bg-[#0f0f0f] border-t border-white/10 relative z-50 flex-shrink-0">
               {localUploadError && (
                 <div className="absolute bottom-full left-4 right-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                   <AlertCircle size={16} className="text-red-500" />
                   <p className="text-[11px] font-bold text-red-500">{localUploadError}</p>
                   <button onClick={() => setLocalUploadError(null)} className="ml-auto text-red-500/50 hover:text-red-500"><X size={14} /></button>
                 </div>
               )}

              <div className="flex items-center gap-4 max-w-5xl mx-auto">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 ${showPlusMenu ? 'rotate-45 text-red-400' : 'text-slate-400'}`}
                  >
                    <Plus size={22} strokeWidth={2.5} />
                  </button>

                  {showPlusMenu && (
                    <div ref={plusMenuRef} className="absolute bottom-20 left-4 bg-[#1a1a1a] border border-white/10 rounded-3xl p-2 shadow-2xl flex flex-col gap-1 animate-in slide-in-from-bottom-2 duration-300 z-[100] min-w-[200px]">
                      <button onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-white group">
                        <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Paperclip size={20} /></div>
                        <span className="text-sm font-bold tracking-tight">Fichier</span>
                      </button>
                      <button onClick={() => { window.dispatchEvent(new CustomEvent('open-camera', { detail: { destination: 'message' } })); setShowPlusMenu(false); }} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all text-white group">
                        <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Camera size={20} /></div>
                        <span className="text-sm font-bold tracking-tight">Caméra</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 relative flex items-center">
                  <input 
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={selectedId === 'gemini' ? "Demandez n'importe quoi..." : "Message..."}
                    className="w-full bg-[#1a1a1a] text-white text-[15px] rounded-[24px] py-4 pl-6 pr-14 focus:ring-2 focus:ring-[#0066ff]/30 outline-none border border-white/5 transition-all"
                  />
                  
                  <div className="absolute right-2 flex items-center gap-1">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2.5 text-slate-500 hover:text-white transition-colors"
                    >
                      <Smile size={22} />
                    </button>
                  </div>

                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </div>

                <button 
                  onClick={() => inputValue.trim() || stagedFile ? sendMessage() : null}
                  disabled={isTypingAI}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0 ${
                    !inputValue.trim() && !stagedFile 
                      ? 'bg-white/5 text-slate-500' 
                      : 'bg-[#0066ff] text-white shadow-[#0066ff]/20'
                  }`}
                >
                  {inputValue.trim() || stagedFile ? (
                    <Send size={24} className="animate-in zoom-in duration-300" />
                  ) : (
                    <Mic size={24} />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0f0f0f] relative overflow-hidden">
             <div className="absolute inset-0 bg-[#0066ff]/[0.02] radial-gradient" />
             <div className="relative space-y-8 animate-in fade-in zoom-in duration-1000">
                <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto border border-white/5 shadow-2xl relative group">
                   <div className="absolute inset-0 bg-white/5 rounded-[40px] blur-2xl group-hover:blur-3xl transition-all duration-700" />
                   <MessageSquare className="text-slate-400 relative z-10" size={40} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-4xl font-black text-white tracking-tighter">Wexo Messaging</h3>
                  <p className="text-slate-500 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                    Sélectionnez une discussion ou commencez-en une nouvelle avec vos amis.
                  </p>
                </div>
                <button 
                  onClick={() => setIsSearchingUsers(true)}
                  className="px-8 py-4 bg-white text-black rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-all active:scale-95 shadow-2xl"
                >
                  DÉMARRER UNE DISCUSSION
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {viewMedia && (
        <MediaViewer 
          media={viewMedia} 
          onClose={() => setViewMedia(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#1a1a1a] border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-300">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                 <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-white text-center mb-3 tracking-tight">Supprimer ?</h3>
              <p className="text-slate-400 text-center text-sm font-medium mb-8 leading-relaxed">Voulez-vous supprimer ce message pour tout le monde ou seulement pour vous ?</p>
              
              <div className="flex flex-col gap-3">
                 <button onClick={() => deleteMessage('everyone')} className="w-full py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">SUPPRIMER POUR TOUS</button>
                 <button onClick={() => deleteMessage('me')} className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all">SUPPRIMER POUR MOI</button>
                 <button onClick={() => setMessageToDelete(null)} className="w-full py-4 text-slate-500 text-[10px] font-black tracking-widest uppercase hover:text-white transition-all mt-2">ANNULER</button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {messageToEdit && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-[#1a1a1a] border border-white/10 rounded-[32px] p-8 max-w-xl w-full shadow-2xl animate-in zoom-in slide-in-from-bottom-10 duration-300">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-[#0066ff]/10 rounded-xl flex items-center justify-center text-[#0066ff]">
                    <Edit2 size={24} />
                 </div>
                 <h3 className="text-2xl font-black text-white tracking-tight">Modifier le message</h3>
              </div>
              
              <textarea 
                 autoFocus
                 value={editText}
                 onChange={(e) => setEditText(e.target.value)}
                 className="w-full bg-black/20 text-white rounded-2xl p-6 mb-8 border border-white/5 focus:ring-2 focus:ring-[#0066ff]/30 outline-none text-[16px] font-medium min-h-[160px]"
              />
              
              <div className="flex gap-3">
                 <button onClick={handleUpdateMessage} className="flex-1 py-4 bg-[#0066ff] text-white rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-[#0055dd] transition-all shadow-xl shadow-[#0066ff]/20">SAUVEGARDER</button>
                 <button onClick={() => { setMessageToEdit(null); setEditText(''); }} className="px-10 py-4 bg-white/5 text-white border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all">ANNULER</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MessagesTab;
