
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { renderTextWithEmojis, EMOJI_MAP } from '../utils/emoji';
import { 
  Search, Plus, Smile, Send, X, Image, Pencil,
  CheckCheck, ArrowLeft, Check, Trash2,
  MessageCircle, Info, UserPlus, Clock, 
  MessageSquarePlus, Users, User, Mic, Paperclip, AlertCircle, Video, Sparkles, Camera, Phone,
  Dog, Utensils, Trophy, Car, Lightbulb, Heart as HeartIcon, Flag,
  Download, File, FileText, Archive, Ban, Copy
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { DEFAULT_AVATAR } from '../constants';
import { Message } from '@/types';
import { getSmartResponse, generateImage, generateVideo, checkApiKey, openKeySelector, analyzeVideo } from '@/services/geminiService';
import { pb, uploadToPocketBase } from '@/services/pocketbaseService';
import { encryptMessage, decryptMessage } from '@/services/encryptionService';
import { db, serverTimestamp, handleFirestoreError, OperationType } from '@/services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { isMobileDevice } from '@/src/utils/device';
import { isNative, getApiUrl } from '@/utils/api';
import { useClickOutside } from '@/utils/hooks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSnowflake } from '@/utils/snowflake';
import Username from './Username';

// Avatar Gemini avec coins moins arrondis
const GeminiAvatarIcon = ({ size = 16 }: { size?: number }) => (
  <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-md">
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
  errorDetails?: string;
  isGeneratingImage?: boolean;
  isGeneratingVideo?: boolean;
  needsKey?: boolean;
  is_screenshot_alert?: boolean;
  sender_name?: string;
  is_info?: boolean;
  info_type?: string;
}

interface MessagesTabProps {
  user?: any;
  profile?: any;
  isKeyboardActive?: boolean;
  onStartCall?: (receiver: any) => void;
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
  return <File size={24} />;
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

const MessagesTab: React.FC<MessagesTabProps> = ({ user, profile, isKeyboardActive: isKeyboardActiveProp, onStartCall }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('chat'));
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [messageText, setMessageText] = useState('');
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
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const longPressTimer = useRef<any>(null);
  const isLongPressing = useRef(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const initialHeight = useRef(window.innerHeight);

  const isAndroidDevice = () => {
    return /Android/i.test(navigator.userAgent);
  };

  useEffect(() => {
    const chatFromUrl = searchParams.get('chat');
    if (chatFromUrl !== selectedId) {
      setSelectedId(chatFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!user || !activeChatId || selectedId === 'gemini') return;
    try {
      // On revient sur message_info comme demandé
      await pb.collection('message_info').create({
        chat: activeChatId,
        user: user.uid,
        type: 'typing',
        payload: { isTyping: typing }
      });
    } catch (e) {
      // Ignore silently
    }
  };

  const handleInputFocus = () => {
    updateTypingStatus(true);
  };

  const handleInputBlur = () => {
    // Petit délai pour éviter que ça clignote entre deux clics
    setTimeout(() => updateTypingStatus(false), 500);
  };

  const handleInputChange = (val: string) => {
    setMessageText(val);
    
    // Si l'utilisateur tape, on s'assure que le statut est "true"
    updateTypingStatus(true);
    
    // On réinitialise un timer pour mettre le statut à "false" après 3s d'inactivité
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      // Pour reconstruire la liste des conversations, on cherche les chats auxquels l'utilisateur appartient
      const resultList = await pb.collection('chats').getList(1, 100, {
        filter: `members ~ "${user.uid}"`,
        sort: '-updated',
        expand: 'members'
      });

      const convs: any[] = [];
      const seenUserIds = new Set();
      
      // On garde Gemini (système spécial)
      convs.push({
        id: 'gemini',
        username: 'Gemini',
        display_name: 'Assistant IA',
        lastMessage: 'Assistant IA',
        lastMessageTime: '',
        unreadCount: 0,
        isAI: true
      });
      seenUserIds.add('gemini');

      for (const chat of resultList.items) {
        // Skip if we already have this chat or member
        if (chat.type === 'direct') {
          const otherMember = chat.expand?.members?.find((m: any) => m.id !== user.uid);
          if (!otherMember || seenUserIds.has(otherMember.id) || seenUserIds.has(chat.id)) continue;
          
          // Vérifier le nombre de messages (doit être >= 2 pour apparaître dans la liste des discussions actives)
          const messagesCountRes = await pb.collection('messages').getList(1, 2, {
            filter: `chat="${chat.id}"`,
            sort: '-created'
          });

          // Si moins de 2 messages, on ne l'affiche pas dans la liste des colonnes
          if (messagesCountRes.totalItems < 2) continue;

          const lastMsg = messagesCountRes.items[0];

          convs.push({
            id: otherMember.id,
            chatId: chat.id,
            username: otherMember.username,
            avatar_url: otherMember.avatar_url,
            display_name: otherMember.name || otherMember.username,
            lastMessage: decryptMessage(lastMsg?.text || ''),
            lastMessageTime: lastMsg ? new Date(lastMsg.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: 0,
            last_active: otherMember.last_active
          });
          seenUserIds.add(otherMember.id);
          seenUserIds.add(chat.id);
        } else {
          // Group chats
          if (seenUserIds.has(chat.id)) continue;

          const messagesCountRes = await pb.collection('messages').getList(1, 2, {
            filter: `chat="${chat.id}"`,
            sort: '-created'
          });
          
          // Même logique pour les groupes
          if (messagesCountRes.totalItems < 2) continue;

          convs.push({
            id: chat.id,
            chatId: chat.id,
            username: chat.name,
            display_name: chat.name,
            lastMessage: decryptMessage(messagesCountRes.items[0]?.text || ''),
            lastMessageTime: messagesCountRes.items[0] ? new Date(messagesCountRes.items[0].created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: 0,
            isGroup: true
          });
          seenUserIds.add(chat.id);
        }
      }

      setConversations(convs);
    } catch (err: any) {
      console.warn("Erreur chargement conversations (chats non activés ou vide):", err.message);
    }
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user || !selectedId) return;
    
    try {
      let chatIdToUse = '';
      
      // Trouver ou créer le chat si c'est un utilisateur direct
      if (selectedId !== 'gemini') {
        const chatList = await pb.collection('chats').getList(1, 1, {
          filter: `type="direct" && members ~ "${user.uid}" && members ~ "${selectedId}"`
        });
        
        if (chatList.items.length > 0) {
          chatIdToUse = chatList.items[0].id;
        } else {
          // Créer le chat
          const newChat = await pb.collection('chats').create({
            type: 'direct',
            members: [user.uid, selectedId]
          });
          chatIdToUse = newChat.id;
        }
      }
      
      setActiveChatId(chatIdToUse);

      // 1. Charger les messages liés au chat
      const filter = chatIdToUse ? `chat="${chatIdToUse}"` : `(sender_id="${user.uid}" && receiver_id="${selectedId}") || (sender_id="${selectedId}" && receiver_id="${user.uid}")`;
      
      const resultList = await pb.collection('messages').getList(1, 100, {
        filter: filter,
        sort: 'created',
      });

      const formatted = resultList.items.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        receiver_id: m.receiver_id,
        chat_id: m.chat,
        text: decryptMessage(m.text),
        created_at: m.created,
        is_own: m.sender_id === user.uid,
        isAI: m.sender_id === 'gemini',
        file_url: m.file_url,
        file_name: m.file_name,
        file_type: m.file_type,
        file_size: m.file_size,
        timestamp: new Date(m.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      } as ExtendedMessage));

      // 2. Charger les messages d'info/système (message_info)
      // Note: Le champ 'type' est maintenant en Texte brut sur PocketBase
      let infoMessages: ExtendedMessage[] = [];
      try {
        const infoFilter = chatIdToUse ? `chat="${chatIdToUse}"` : `(chat="${selectedId}" && user="${user.uid}") || (chat="${user.uid}" && user="${selectedId}")`;
        const infoList = await pb.collection('message_info').getList(1, 50, {
          filter: infoFilter,
          sort: 'created',
          expand: 'user'
        });

        infoMessages = infoList.items.map(i => ({
          id: i.id,
          is_info: true,
          info_type: String(i.type), // Conversion explicite en string pour ton champ Texte
          sender_id: i.user,
          sender_name: i.expand?.user?.name || i.expand?.user?.username || 'Utilisateur',
          created_at: i.created,
          text: '',
          timestamp: new Date(i.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        } as ExtendedMessage));
      } catch (e) {
        console.warn("Collection message_info inaccessible ou vide:", e);
      }

      const allMessages = [...formatted, ...infoMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(allMessages);
    } catch (err) {
      console.error("Erreur chargement messages NAS:", err);
    }
  }, [user, selectedId]);

  const fetchSelectedProfile = useCallback(async () => {
    if (!selectedId || selectedId === 'gemini') return;
    try {
      const u = await pb.collection('users').getOne(selectedId);
      setSelectedProfile({
        id: u.id,
        username: u.username,
        avatar_url: u.avatar_url,
        display_name: u.display_name,
        is_verified: u.is_verified,
        role: u.role,
        email: u.email,
        last_active: u.last_active
      });
    } catch (e) {
      console.error("Erreur profil destinataire:", e);
    }
  }, [selectedId]);

  // Refresh profile periodically for online status
  useEffect(() => {
    if (!selectedId || selectedId === 'gemini') return;
    
    const interval = setInterval(fetchSelectedProfile, 30000);
    return () => clearInterval(interval);
  }, [selectedId, fetchSelectedProfile]);

  const isOwnerAccount = user?.email === 'ky.chaine@gmail.com' || user?.username === 'khalil' || user?.displayName === 'khalil';

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
    setSelectedMessageIds(new Set());
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
      
      // Real-time pour les conversations et les profils utilisateurs (présence)
      pb.collection('messages').subscribe('*', (e) => {
        if (e.action === 'create') {
          fetchConversations();
        }
      });

      pb.collection('users').subscribe('*', (e) => {
        if (e.action === 'update') {
          setConversations(prev => prev.map(c => {
            if (c.id === e.record.id) {
              return { ...c, last_active: e.record.last_active, active: e.record.active };
            }
            return c;
          }));
          if (selectedProfile && selectedProfile.id === e.record.id) {
            setSelectedProfile(prev => ({ ...prev, last_active: e.record.last_active, active: e.record.active }));
          }
        }
      });
      
      return () => {
        try {
          pb.collection('messages').unsubscribe('*').catch(() => {});
          pb.collection('users').unsubscribe('*').catch(() => {});
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

      // Real-time events from App.tsx global listener
      const handlePBMessage = (event: any) => {
        const e = event.detail;
        if (e.action === 'create') {
          const m = e.record;
          const currentActiveChatId = activeChatIdRef.current;
          
          const isRelated = (m.chat && m.chat === currentActiveChatId) || 
                            (!m.chat && ((m.sender_id === user.uid && m.receiver_id === selectedId) || 
                                         (m.sender_id === selectedId && m.receiver_id === user.uid)));
          
          if (isRelated) {
            setMessages(prev => {
              const decryptMessage = (text: string) => text; // Local fallback if not imported
              // Note: decryptMessage is defined globally in the file, so it should be visible
              
              const isDuplicate = prev.some(msg => 
                msg.id === m.id || 
                ((msg.is_own || msg.sender_id === 'gemini') && 
                 msg.text === decryptMessage(m.text) && 
                 msg.sender_id === m.sender_id &&
                 Math.abs(new Date(msg.created_at).getTime() - new Date(m.created).getTime()) < 10000)
              );

              if (isDuplicate) {
                return prev.map(msg => {
                  if ((msg.is_own || msg.sender_id === 'gemini') && msg.text === decryptMessage(m.text) && !msg.id.startsWith('rec')) {
                    return { ...msg, id: m.id, created_at: m.created };
                  }
                  return msg;
                });
              }
              
              const newMsg = {
                id: m.id,
                sender_id: m.sender_id,
                receiver_id: m.receiver_id,
                text: decryptMessage(m.text),
                created_at: m.created,
                is_own: m.sender_id === user.uid,
                isAI: m.sender_id === 'gemini',
                file_url: m.file_url,
                file_name: m.file_name,
                file_type: m.file_type,
                file_size: m.file_size,
                timestamp: new Date(m.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              } as ExtendedMessage;
              return [...prev, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          }
        }
      };

      const handlePBMessageInfo = async (event: any) => {
        const e = event.detail;
        if (e.action === 'create') {
          const i = e.record;
          const currentActiveChatId = activeChatIdRef.current;
          const isRelated = i.chat === currentActiveChatId;

          if (isRelated) {
             if (i.type === 'typing') {
               if (i.user !== user.uid) {
                 setIsOtherTyping(i.payload?.isTyping || false);
                 if (i.payload?.isTyping) {
                   setTimeout(() => setIsOtherTyping(false), 5000);
                 }
               }
               return;
             }
             
             const u = i.expand?.user || await pb.collection('users').getOne(i.user).catch(() => null);
             const newInfo = {
                id: i.id,
                is_info: true,
                info_type: i.type,
                sender_id: i.user,
                sender_name: u?.name || u?.username || 'Utilisateur',
                created_at: i.created,
                text: '',
                timestamp: new Date(i.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
             } as ExtendedMessage;

             setMessages(prev => [...prev, newInfo].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          }
        }
      };

      window.addEventListener('pb-message-created', handlePBMessage);
      window.addEventListener('pb-message-info', handlePBMessageInfo);

      // S'assurer que les événements Typing sont écoutés en local si nécessaire
      // Note: App.tsx fait déjà la souscription globale, mais on s'assure du dispatch.

      return () => {
        window.removeEventListener('pb-message-created', handlePBMessage);
        window.removeEventListener('pb-message-info', handlePBMessageInfo);
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

  const addMessageInfo = async (type: string, payload: any = {}) => {
    if (!user || !selectedId || selectedId === 'gemini' || !activeChatId) return;

    try {
      console.log(`Envoi info [${type}] pour le chat [${activeChatId}]`);
      await pb.collection('message_info').create({
        chat: activeChatId,
        user: user.uid,
        type: type,
        payload: payload
      });
    } catch (err) {
      console.error("Erreur envoi message_info:", err);
    }
  };

  const sendScreenshotAlert = async () => {
    if (!user || !selectedId || selectedId === 'gemini') return;
    
    // Throttle alert to every 5s
    const now = Date.now();
    const lastAlert = (window as any).lastScreenshotAlert || 0;
    if (now - lastAlert < 5000) return;
    (window as any).lastScreenshotAlert = now;

    try {
      if (profile?.username === 'khalil') {
        console.log("[SCREENSHOT DEBUG] Tentative d'envoi d'alerte...");
      }
      let chatIdToUse = activeChatId;
      if (!chatIdToUse) {
         const chatList = await pb.collection('chats').getList(1, 1, {
           filter: `type="direct" && members ~ "${user.uid}" && members ~ "${selectedId}"`
         });
         if (chatList.items.length > 0) chatIdToUse = chatList.items[0].id;
         else {
           if (profile?.username === 'khalil') console.error("[SCREENSHOT DEBUG] Pas de chat trouvé entre", user.uid, "et", selectedId);
           return;
         }
      }

      await pb.collection('messages').create({
        sender_id: user.uid,
        receiver_id: selectedId,
        chat: chatIdToUse,
        type: 'info',
        info_type: 'screenshot',
        text: profile?.username || user.displayName || 'Utilisateur',
        created: new Date().toISOString()
      });
      if (profile?.username === 'khalil') console.log("[SCREENSHOT DEBUG] Alerte envoyée avec succès !");
    } catch (e) {
      console.error("Screenshot notification failed", e);
      if (profile?.username === 'khalil') alert("Erreur screenshot: " + (e as any).message);
    }
  };

  useEffect(() => {
    if (!selectedId || selectedId === 'gemini') return;

    const handleKeyUp = (e: KeyboardEvent) => {
      if (profile?.username === 'khalil') console.log("[SCREENSHOT DEBUG] KeyUp:", e.key);
      // Detect PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        sendScreenshotAlert();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (profile?.username === 'khalil') {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
           console.log("[SCREENSHOT DEBUG] KeyDown combination:", (e.metaKey?'Meta+':'') + (e.ctrlKey?'Ctrl+':'') + (e.shiftKey?'Shift+':'') + e.key);
        }
      }
      // Mac shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        sendScreenshotAlert();
      }
      // Windows: Win+Shift+S (difficile à intercepter car le système l'intercepte souvent avant mais on tente)
      if (e.metaKey && e.shiftKey && e.key === 'S') {
        sendScreenshotAlert();
      }
    };

    // Detection par perte de focus pendant qu'on est sur le chat
    // Souvent les outils de screenshot volent le focus
    const handleBlur = () => {
      // On ne l'envoie pas systématiquement car ça ferait trop de faux positifs,
      // mais on pourrait l'utiliser comme signal combiné ou si on détecte une touche pressée juste avant.
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        (window as any).potentialScreenshot = Date.now();
        if (profile?.username === 'khalil') console.log("[SCREENSHOT DEBUG] App cachée (détection potentielle lancée)");
      } else if (document.visibilityState === 'visible' && (window as any).potentialScreenshot) {
        const timeHidden = Date.now() - (window as any).potentialScreenshot;
        (window as any).potentialScreenshot = null;
        if (profile?.username === 'khalil') console.log("[SCREENSHOT DEBUG] App visible, temps caché:", timeHidden, "ms");
        
        // Mobile screenshot heuristic: app backgrounded for 0.5s to 4s
        if (timeHidden > 500 && timeHidden < 4000) {
          if (profile?.username === 'khalil') console.log("[SCREENSHOT DEBUG] Heuristique mobile validée (0.5s-4s)");
          sendScreenshotAlert();
        }
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const toggleMessageSelection = (id: string) => {
    // Vibrate when selecting/deselecting (if supported)
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }

    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleMessageTouchStart = (id: string, e: React.TouchEvent) => {
    if (!isMobileDevice()) return;
    isLongPressing.current = false;
    touchStartPos.current = { 
      x: e.touches[0].clientX, 
      y: e.touches[0].clientY 
    };
    
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      toggleMessageSelection(id);
    }, 300); 
  };

  const handleMessageTouchMove = (e: React.TouchEvent) => {
    if (!isMobileDevice() || !touchStartPos.current || !longPressTimer.current) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const distX = Math.abs(currentX - touchStartPos.current.x);
    const distY = Math.abs(currentY - touchStartPos.current.y);
    
    // Si on a bougé de plus de 10px, c'est probablement un scroll, donc on annule la pression longue
    if (distX > 10 || distY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleMessageTouchEnd = (id: string) => {
    if (!isMobileDevice()) return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

  const handleMessageClick = (id: string, e: React.MouseEvent) => {
    if (!isMobileDevice()) return;
    
    // If we have selections, any tap toggles selection
    if (selectedMessageIds.size > 0) {
      e.preventDefault();
      e.stopPropagation();
      toggleMessageSelection(id);
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
            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{processChildren(children)}</a>,
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

      // CRÉATION DE LA NOTIFICATION POUR LE DESTINATAIRE (via Firebase)
      try {
        await addDoc(collection(db, 'notifications'), {
          user_id: targetId,
          sender_id: user.uid,
          sender_avatar: profile?.avatar_url || '',
          type: 'friend_request',
          title: 'Demande d\'ami',
          content: `${profile?.display_name || user.displayName || 'Un utilisateur'} souhaite vous ajouter en ami.`,
          status: 'unread',
          created_at: serverTimestamp()
        });
      } catch (notifErr) {
        handleFirestoreError(notifErr, OperationType.WRITE, 'notifications');
      }
    } catch (err) {
      console.error("Erreur demande ami:", err);
    }
  };

  const sendMessage = async (text: string, fileData?: { url: string, name: string, type: string, size: number }) => {
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
    
    setMessageText('');
    setStagedFile(null);

    // Migration NAS : Envoi des messages PocketBase
    try {
      let chatIdToUse = activeChatId;
      
      // Si on n'a pas encore de chatId et que c'est un chat direct
      if (!chatIdToUse && selectedId && selectedId !== 'gemini') {
         const chatList = await pb.collection('chats').getList(1, 1, {
           filter: `type="direct" && members ~ "${user.uid}" && members ~ "${selectedId}"`
         });
         if (chatList.items.length > 0) {
           chatIdToUse = chatList.items[0].id;
         } else {
           const newChat = await pb.collection('chats').create({
             type: 'direct',
             members: [user.uid, selectedId]
           });
           chatIdToUse = newChat.id;
         }
         setActiveChatId(chatIdToUse);
      }

      const pbData = {
        ...newMsg,
        text: encryptMessage(newMsg.text),
        chat: chatIdToUse,
        created: now 
      };
      await pb.collection('messages').create(pbData);

      // Mettre à jour le chat (pour le sort -updated dans fetchConversations)
      if (chatIdToUse) {
        await pb.collection('chats').update(chatIdToUse, {
           updated: new Date().toISOString()
        }).catch(() => {});
      }

      // CRÉATION DE LA NOTIFICATION POUR LE DESTINATAIRE (via Firebase et PocketBase)
      if (selectedId && selectedId !== 'gemini') {
        const notificationContent = text || (finalFileData ? 'Pièce jointe reçue' : 'Nouveau message');
        // On ne crypte plus le contenu pour les notifications selon la demande utilisateur
        const plainContent = notificationContent;

        // Firebase payload
        const firestoreNotif = {
          user_id: selectedId,
          sender_id: user.uid,
          sender_avatar: profile?.avatar_url || '',
          type: 'message',
          title: profile?.display_name || user.displayName || 'Wexo',
          content: plainContent,
          status: 'unread',
          created_at: serverTimestamp()
        };

        try {
          // Firebase Notification
          await addDoc(collection(db, 'notifications'), firestoreNotif);
        } catch (notifErr: any) {
          handleFirestoreError(notifErr, OperationType.WRITE, 'notifications');
        }

        try {
          // PocketBase Notification (Backup for the Bell)
          const pbNotifData = {
            user_id: selectedId,
            sender_id: profile?.id || user.uid,
            type: 'message',
            title: profile?.display_name || user.displayName || 'Wexo',
            content: plainContent,
            status: 'pending',
            read: false
          };
          
          await pb.collection('notifications').create(pbNotifData);
        } catch (pbNotifErr) {
          console.error("PocketBase notification failed:", pbNotifErr);
        }

        // --- ENVOI DE LA NOTIFICATION PUSH FIREBASE (FCM) VIA LE SERVEUR ---
        fetch(getApiUrl('/api/notifications/send'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: selectedId,
            title: firestoreNotif.title,
            body: plainContent,
            data: {
              type: 'message',
              senderId: user.uid,
              chatId: chatIdToUse || ''
            }
          })
        }).catch(err => console.error("Erreur envoi FCM Push:", err));
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
        const isQuotaError = responseText.includes("quota dépassé") || (aiResult.isError && aiResult.errorDetails?.includes("QUOTA"));
        
        const aiSnowflakeId = generateSnowflake();
        const aiMsg: any = { 
          id: aiSnowflakeId,
          sender_id: 'gemini', 
          receiver_id: user.uid, 
          text: responseText, 
          isError: aiResult.isError,
          errorDetails: aiResult.errorDetails,
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
              text: encryptMessage(responseText),
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
              const publicUrl = await uploadToPocketBase(blob);
              aiMsg.file_url = publicUrl;
              aiMsg.file_name = 'Image générée par Gemini.png';
              aiMsg.file_type = 'image/png';
              aiMsg.file_size = blob.size;
            }
          } catch (imgErr) {
            console.error("Error generating/uploading image:", imgErr);
            aiMsg.text += "\n\n(Désolé, je n'ai pas pu générer l'image pour le moment. 🙂)";
          }
        }

        // Handle video generation
        if (aiResult.videoPrompt) {
          try {
            const hasKey = await checkApiKey();
            if (!hasKey) {
              aiMsg.text = "Pour générer des vidéos, tu dois d'abord connecter une clé API payante Google Cloud.";
              aiMsg.needsKey = true;
            } else {
              const videoBlob = await generateVideo(aiResult.videoPrompt as string);
              const publicUrl = await uploadToPocketBase(videoBlob);
              aiMsg.file_url = publicUrl;
              aiMsg.file_name = 'Vidéo générée par Gemini.mp4';
              aiMsg.file_type = 'video/mp4';
              aiMsg.file_size = videoBlob.size;
            }
          } catch (vidErr: any) {
            console.error("Error generating video:", vidErr);
            aiMsg.text += "\n\n(Désolé, je n'ai pas pu générer la vidéo pour le moment. 🙂)";
          }
        }
        
        if (aiResult.imagePrompt || aiResult.videoPrompt) {
          const updatedMsg = {
            ...aiMsg,
            is_own: false,
            isAI: true,
            isGeneratingImage: false,
            isGeneratingVideo: false,
            timestamp: aiTimestamp,
            file_url: aiMsg.file_url,
            file_name: aiMsg.file_name,
            file_type: aiMsg.file_type,
            file_size: aiMsg.file_size
          };
          setMessages(prev => prev.map(m => m.id === aiSnowflakeId ? updatedMsg : m));
          
          // Sauvegarde de la réponse avec média sur le NAS
          try {
            await pb.collection('messages').create({
              sender_id: 'gemini',
              receiver_id: user.uid,
              text: encryptMessage(responseText),
              file_url: aiMsg.file_url,
              file_name: aiMsg.file_name,
              file_type: aiMsg.file_type,
              file_size: aiMsg.file_size,
              created: new Date().toISOString()
            });
          } catch (e) {
            console.error("Erreur sauvegarde réponse media Gemini NAS:", e);
          }
        } else {
          setMessages(prev => {
            if (prev.some(m => m.id === aiSnowflakeId)) return prev;
            return [...prev, { 
              ...aiMsg, 
              is_own: false, 
              isAI: true,
              isError: isQuotaError,
              timestamp: aiTimestamp
            } as any];
          });

          // Sauvegarde de la réponse textuelle Gemini
          try {
            await pb.collection('messages').create({
              sender_id: 'gemini',
              receiver_id: user.uid,
              text: encryptMessage(responseText),
              created: new Date().toISOString()
            });
            fetchConversations();
          } catch (e) {
            console.error("Erreur sauvegarde réponse texte Gemini NAS:", e);
          }
        }
        setIsTypingAI(false);
      } catch (e) {
        console.error("Gemini flow error:", e);
        setIsTypingAI(false);
      }
    }
  };

  const deleteMessage = async (type: 'everyone' | 'me') => {
    if (!messageToDelete || !user) return;
    
    try {
      // Migration NAS : Suppression désactivée
      console.log("Suppression message non effectuée (Migration NAS)");
      setMessageToDelete(null);
    } catch (err) {
      console.error(err);
      setMessageToDelete(null);
    }
  };

  const handleUpdateMessage = async () => {
    if (!messageToEdit || !editText.trim() || !user) return;
    try {
      // Migration NAS
      console.log("Edition message non supportée (Migration NAS)");
      setMessageToEdit(null);
      setEditText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedId) return;

    setUploadingFile(true);
    setLocalUploadError(null);
    try {
      console.log('Starting file upload to PocketBase...');
      const publicUrl = await uploadToPocketBase(file);
      
      console.log('File uploaded successfully to NAS');

      let transcription = null;
      if (file.type.startsWith('video/')) {
        console.log('Analyzing video...');
        try {
          const analysis = await analyzeVideo(file);
          transcription = analysis.transcription || null;
          console.log('Video analysis complete');
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
            <div className="hidden lg:flex items-center gap-2">
              <button 
                onClick={() => setIsSearchingUsers(true)}
                className="p-2.5 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 group"
                title="Wexo AI"
              >
                <div className="w-[18px] h-[18px] group-hover:scale-110 transition-transform">
                  <GeminiAvatarIcon size={18} />
                </div>
              </button>
              <button 
                onClick={() => setIsSearchingUsers(true)}
                className="p-2.5 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 group"
                title="Nouveau message"
              >
                <Plus size={18} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>
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
          <div onClick={() => handleSelectChat('gemini')} className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all ${selectedId === 'gemini' ? 'bg-white/5' : 'hover:bg-white/5'}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0 flex items-center justify-center">
              <GeminiAvatarIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <h4 className="text-sm font-bold text-white truncate">Gemini</h4>
              </div>
              <p className="text-xs truncate font-medium text-slate-500">Assistant IA</p>
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
                  <div className="flex items-center gap-2 truncate">
                    <h4 className={`text-sm font-bold truncate ${c.unreadCount > 0 ? 'text-white' : 'text-slate-200'}`}>{c.username}</h4>
                    {(() => {
                      const isOnline = c.active === true || (c.last_active && (Date.now() - new Date(c.last_active).getTime() < 60000));
                      if (isOnline) return <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />;
                      return null;
                    })()}
                  </div>
                  <span className={`text-[9px] font-bold ${c.unreadCount > 0 ? 'text-white' : 'text-slate-500'}`}>{c.lastMessageTime}</span>
                </div>
                <p className={`text-xs truncate font-medium ${c.unreadCount > 0 ? 'text-white font-bold' : 'text-slate-400'}`}>{renderTextWithEmojis(c.lastMessage || 'Membre Wexo')}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FABs sur Mobile - Visibles uniquement sur la liste */}
        <div className="fixed bottom-32 right-6 lg:hidden flex flex-col gap-4 z-[100] items-center">
          {/* Bouton Gemini - Carré arrondi sombre */}
          <button 
            onClick={() => handleSelectChat('gemini')}
            className="w-12 h-12 bg-[#1a1a1a] text-white rounded-xl shadow-2xl flex items-center justify-center active:scale-95 transition-all"
          >
            <div className="w-7 h-7">
              <GeminiAvatarIcon size={26} />
            </div>
          </button>
          
          {/* Bouton + - Gros bouton bleu vif "Wexo" sans effet de lumière */}
          <button 
            onClick={() => setIsSearchingUsers(true)}
            className="w-14 h-14 bg-[#0066ff] text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-90 transition-all border border-white/10"
          >
            <Plus size={30} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Modal Recherche / Démarrer discussion */}
      {isSearchingUsers && (
        <div className="absolute inset-0 z-[110] bg-[#0f0f0f] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-[#0f0f0f]/80 backdrop-blur-xl">
            <button 
              onClick={() => setIsSearchingUsers(false)} 
              className="p-2.5 bg-primary text-white rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <X size={18} strokeWidth={3} />
            </button>
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
                const isPending = friendship?.status === 'pending';
                const isFriend = friendship?.status === 'accepted';
                
                return (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden">
                    <img src={u.avatar_url || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                  </div>
                  <div><h4 className="text-sm font-bold text-white tracking-tight">{u.username}</h4></div>
                </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { handleSelectChat(u.id); setIsSearchingUsers(false); }} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white hover:text-black transition-all"><MessageSquarePlus size={18} /></button>
                      {isFriend ? (
                        <div className="relative">
                          {showDeleteFriend === u.id && (
                            <button 
                              onClick={() => handleRemoveFriend(u.id)}
                              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-2xl shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-1"
                            >
                              Supprimer l'ami
                            </button>
                          )}
                          <div className="px-3 py-1.5 bg-white/10 text-white rounded-2xl border border-white/20">
                            <span className="text-[10px] font-black">Ami</span>
                          </div>
                        </div>
                      ) : isPending ? (
                        <button disabled className="p-3 bg-white/5 text-slate-500 rounded-2xl border border-white/10 opacity-50 cursor-not-allowed">
                          <Clock size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddFriend(u.id)} 
                          className="p-3 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
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
        style={{ height: '100%', overscrollBehavior: 'none' }}
      >
        {selectedId ? (
          <div className="flex-1 flex flex-col relative bg-[#0f0f0f] h-full overflow-hidden" style={{ overscrollBehavior: 'none', height: '100%' }}>
            {/* Header du Chat - Flex fixed height */}
            <div className={`p-4 py-6 border-b border-white/10 flex items-center justify-between flex-shrink-0 z-40 transition-colors duration-300 ${isAndroidDevice() ? 'pt-14 pb-4' : ''} ${selectedMessageIds.size > 0 ? 'bg-primary/10' : 'bg-[#0f0f0f]'}`}>
              {selectedMessageIds.size > 0 ? (
                <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedMessageIds(new Set())}
                      className="p-2 text-slate-400 hover:text-white transition-all active:scale-95"
                    >
                      <X size={24} />
                    </button>
                    <span className="text-xl font-black text-white tracking-tight">{selectedMessageIds.size} sélectionné{selectedMessageIds.size > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const selectedMsgs = messages.filter(m => selectedMessageIds.has(m.id));
                        const textToCopy = selectedMsgs.map(m => m.text).filter(Boolean).join('\n');
                        navigator.clipboard.writeText(textToCopy);
                        setSelectedMessageIds(new Set());
                      }}
                      className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                      title="Copier"
                    >
                      <Copy size={22} />
                    </button>
                    {Array.from(selectedMessageIds).every(id => messages.find(m => m.id === id)?.is_own) && (
                      <button 
                        onClick={() => {
                          const firstId = Array.from(selectedMessageIds)[0];
                          const msg = messages.find(m => m.id === firstId);
                          if (msg) setMessageToDelete(msg);
                        }}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={22} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => handleSelectChat(null)} className="lg:hidden p-2 text-slate-400 -ml-1 transition-colors hover:text-white"><ArrowLeft size={24} /></button>
                    <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ${selectedId === 'gemini' ? '' : 'border border-white/10'}`}>
                      {selectedId === 'gemini' ? (
                        <GeminiAvatarIcon size={20} />
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
                          <p className="text-[9px] text-slate-500 font-bold">Par Google</p>
                        ) : (
                          <>
                            {(() => {
                              const isOnline = selectedProfile?.active === true || (selectedProfile?.last_active && (Date.now() - new Date(selectedProfile.last_active).getTime() < 60000));
                              
                              return (
                                <>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                  <p className="text-[9px] text-slate-500 font-bold">
                                    {isOnline ? 'En ligne' : 'Hors ligne'}
                                  </p>
                                </>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedId !== 'gemini' && (
                    <div className="flex items-center gap-2 relative mt-2">
                      <div className="flex items-center gap-1.5 mr-2">
                        <button 
                          onClick={() => onStartCall?.({ id: selectedId, username: selectedProfile?.username || 'Utilisateur', avatar_url: selectedProfile?.avatar_url })}
                          className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                        >
                          <Phone size={20} />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <Video size={20} />
                        </button>
                      </div>
                      {(() => {
                        const friendship = friendships.find(f => f.requester_id === selectedId || f.receiver_id === selectedId);
                        const isPending = friendship?.status === 'pending';
                        const isFriend = friendship?.status === 'accepted';

                        if (isFriend) return (
                          <div className="relative">
                            <button 
                              onClick={() => setShowDeleteFriend(showDeleteFriend === selectedId ? null : selectedId)}
                              className="p-2.5 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                            >
                              <Check size={18} />
                            </button>
                            
                            {showDeleteFriend === selectedId && (
                              <div ref={deleteFriendRef} className="absolute top-full mt-2 right-0 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                <button 
                                  onClick={() => handleRemoveFriend(selectedId)}
                                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-[10px] font-black rounded-2xl shadow-xl hover:bg-red-600 transition-all whitespace-nowrap"
                                >
                                  <Trash2 size={14} />
                                  Supprimer l'ami
                                </button>
                              </div>
                            )}
                          </div>
                        );

                        if (isPending) return (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 text-slate-500 rounded-2xl border border-white/10 opacity-50">
                            <Clock size={14} />
                            <span className="text-[10px] font-black text-white/40">En attente</span>
                          </div>
                        );

                        return (
                          <button 
                            onClick={() => handleAddFriend(selectedId)} 
                            className="p-2.5 bg-white text-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
                          >
                            <UserPlus size={18} />
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div ref={scrollRef} className={`flex-1 overflow-y-auto no-scrollbar flex flex-col z-10 py-4 sm:py-8 ${isMobileDevice() ? 'pb-1' : ''}`}>
              {messages.map((msg, idx) => {
                if (msg.is_info) {
                  const getInfoText = () => {
                    const userName = msg.sender_name || 'Un utilisateur';
                    switch (msg.info_type) {
                      case 'screenshot': return `${userName} a pris un screenshot de la discussion.`;
                      case 'call_missed': return `Appel manqué.`;
                      case 'encryption_verified': return `Cette discussion est protégée par le chiffrement de bout en bout.`;
                      case 'chat_cleared': return `Le contenu de la discussion a été effacé.`;
                      case 'member_added': return `${userName} a été ajouté à la discussion.`;
                      case 'member_removed': return `${userName} a été retiré de la discussion.`;
                      default: return `Action effectuée.`;
                    }
                  };

                  return (
                    <div key={msg.id} className="w-full flex justify-center my-4 px-4 sm:px-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl shadow-sm flex items-center gap-3 max-w-[90%]">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${msg.info_type === 'screenshot' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                          {msg.info_type === 'screenshot' ? <Camera size={16} /> : <Info size={16} />}
                        </div>
                        <p className="text-[11px] font-bold text-slate-400">
                          {getInfoText()}
                        </p>
                      </div>
                    </div>
                  );
                }

                const isImage = msg.file_type?.startsWith('image/') || 
                                msg.isGeneratingImage || 
                                /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(msg.file_name || '');
                const isVideo = msg.file_type?.startsWith('video/') || 
                                msg.isGeneratingVideo || 
                                /\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i.test(msg.file_name || '');
                const isDeleted = msg.is_deleted_for_everyone;
                const isAI = msg.sender_id === 'gemini';
                const hasPrevSameSender = idx > 0 && messages[idx - 1].sender_id === msg.sender_id;
                const hasNextSameSender = idx < messages.length - 1 && messages[idx + 1].sender_id === msg.sender_id;
                const prevWasAI = idx > 0 && messages[idx - 1].sender_id === 'gemini';
                
                const emojiOnly = msg.text && isOnlyEmojis(msg.text);
                const emojiCount = emojiOnly ? countEmojis(msg.text) : 0;
                const largeEmojis = emojiOnly && emojiCount <= 5;
                
                let borderRadiusClasses = 'rounded-2xl';
                if (msg.is_own) {
                  borderRadiusClasses += ` ${!hasPrevSameSender ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${hasNextSameSender ? 'rounded-br-md' : ''}`;
                } else {
                  borderRadiusClasses += ` ${!hasPrevSameSender ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${hasNextSameSender ? 'rounded-bl-md' : ''}`;
                }
                
                const isSelected = selectedMessageIds.has(msg.id);

                // Espace entre les messages : Réduction de 2.1x demandée
                // Précédemment mt-4 (16px), donc 16 / 2.1 = ~7.6px
                let extraMargin = 'mt-1';
                if (!hasPrevSameSender) {
                  extraMargin = 'mt-7'; // Un peu plus serré que mt-10 (28px)
                } else {
                  extraMargin = 'mt-[7.6px]'; // 16px / 2.1 = 7.619px precise spacing
                }
                
                return (
                  <div 
                    key={msg.id} 
                    onTouchStart={(e) => handleMessageTouchStart(msg.id, e)}
                    onTouchMove={handleMessageTouchMove}
                    onTouchEnd={() => handleMessageTouchEnd(msg.id)}
                    onClick={(e) => handleMessageClick(msg.id, e)}
                    className={`flex group relative w-full px-4 sm:px-8 transition-all ${msg.is_own ? 'justify-end' : 'justify-start'} ${extraMargin} ${isSelected ? 'bg-[var(--primary-color-dark)]' : !isMobileDevice() ? 'hover:bg-white/[0.03]' : ''}`}
                  >
                    {/* Sélection visuelle par background uniquement, comme demandé */}
                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${msg.is_own ? 'flex-row-reverse' : 'flex-row'} ${isSelected ? 'scale-[0.98]' : ''} transition-transform duration-200`}>
                      <div className={`${(isImage || isVideo) && !isDeleted ? 'max-w-[280px] sm:max-w-[320px]' : 'w-fit'} ${borderRadiusClasses} relative ${largeEmojis ? '' : 'shadow-lg overflow-hidden'} ${
                        largeEmojis ? 'bg-transparent' : (
                          msg.is_own 
                            ? isDeleted ? 'bg-white/5 text-white/40 italic' : 'bg-primary text-white shadow-lg' 
                            : msg.isError || (msg.text && msg.text.includes("quota dépassé"))
                              ? 'bg-red-500/10 border border-red-500/30 text-red-500'
                              : isDeleted ? 'bg-white/5 text-white/40 italic' : 'bg-white/10 text-white border border-white/5'
                        )
                      }`}>
                        
                        <div className="flex flex-col">
                          {isDeleted ? (
                            <div className="px-4 py-2.5 flex items-center gap-2">
                              <Ban size={14} className="opacity-50" />
                              <p className="text-sm font-medium leading-relaxed italic">Ce message a été supprimé</p>
                              <span className="text-[9px] font-bold opacity-40 ml-auto">{msg.timestamp}</span>
                            </div>
                          ) : (
                            <>
                              {msg.isGeneratingImage ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-3 min-w-[200px] min-h-[150px] m-2">
                                  <div className="w-12 h-12 flex items-center justify-center animate-pulse">
                                    <Image size={48} className="text-white/40" />
                                  </div>
                                  <p className="text-[10px] font-bold text-white/40 animate-pulse">Génération de l'image...</p>
                                </div>
                              ) : msg.isGeneratingVideo ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-3 min-w-[200px] min-h-[150px] m-2">
                                  <div className="w-12 h-12 flex items-center justify-center animate-pulse">
                                    <Video size={48} className="text-white/40" />
                                  </div>
                                  <p className="text-[10px] font-bold text-white/40 animate-pulse">Génération de la vidéo...</p>
                                </div>
                              ) : msg.file_url && (
                                <div className="w-full">
                                  {isImage ? (
                                    <div className="p-2 flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-4 px-1">
                                        <span className="text-[10px] font-bold opacity-80 truncate max-w-[180px]">
                                          {truncateFileName(msg.file_name || '')}
                                        </span>
                                        <button 
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const response = await fetch(msg.file_url!);
                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = msg.file_name!;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                              window.open(msg.file_url, '_blank');
                                            }
                                          }}
                                          className="p-1.5 bg-black/20 hover:bg-black/40 rounded-2xl transition-colors"
                                        >
                                          <Download size={14} />
                                        </button>
                                      </div>
                                      <div className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer ${msg.is_own ? 'border-primary/30' : 'border-white/10'}`}>
                                        <img 
                                          src={msg.file_url} 
                                          alt={msg.file_name} 
                                          className="w-full cursor-pointer hover:opacity-95 transition-opacity max-h-[400px] object-cover" 
                                          onClick={(e) => {
                                            if (selectedMessageIds.size > 0) return;
                                            setSelectedMedia({ url: msg.file_url!, name: msg.file_name!, type: msg.file_type!, message: msg.text, transcription: msg.transcription });
                                          }} 
                                        />
                                      </div>
                                    </div>
                                  ) : isVideo ? (
                                    <div className="p-2 flex flex-col gap-2">
                                      <div className="flex items-center justify-between gap-4 px-1">
                                        <span className="text-[10px] font-bold opacity-80 truncate max-w-[180px]">
                                          {truncateFileName(msg.file_name || '')}
                                        </span>
                                        <button 
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              const response = await fetch(msg.file_url!);
                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = msg.file_name!;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                              window.open(msg.file_url, '_blank');
                                            }
                                          }}
                                          className="p-1.5 bg-black/20 hover:bg-black/40 rounded-2xl transition-colors"
                                        >
                                          <Download size={14} />
                                        </button>
                                      </div>
                                      <div 
                                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer group/vid ${msg.is_own ? 'border-primary/30' : 'border-white/10'}`}
                                        onClick={(e) => {
                                          if (selectedMessageIds.size > 0) return;
                                          setSelectedMedia({ url: msg.file_url!, name: msg.file_name!, type: msg.file_type!, message: msg.text, transcription: msg.transcription });
                                        }}
                                      >
                                        <video 
                                          src={msg.file_url} 
                                          className="w-full max-h-[400px] bg-transparent pointer-events-none" 
                                          poster={`${msg.file_url}#t=0.1`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f]/20 group-hover/vid:bg-[#0f0f0f]/40 transition-all">
                                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-2xl group-hover/vid:scale-110 transition-transform">
                                            <Video size={24} fill="currentColor" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col">
                                      <div className="p-3 flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${msg.is_own ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                          {getFileIcon(msg.file_type || '')}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-2">
                                          <p className="text-sm font-bold truncate leading-tight mb-1">
                                            {msg.file_name}
                                          </p>
                                          <p className="text-[10px] opacity-70 font-bold uppercase">
                                            {msg.file_type?.split('/')[1] || 'FILE'} • {formatFileSize(msg.file_size || 0)}
                                          </p>
                                        </div>
                                        <div className="text-[10px] opacity-60 font-bold mt-1">
                                          {msg.timestamp}
                                        </div>
                                      </div>
                                        <button 
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(msg.file_url!);
                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = msg.file_name!;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              window.URL.revokeObjectURL(url);
                                            } catch (err) {
                                              window.open(msg.file_url, '_blank');
                                            }
                                          }}
                                          className={`w-full py-2.5 text-xs font-bold transition-all border-t ${
                                            msg.is_own 
                                              ? 'bg-white/10 border-white/10 hover:bg-white/20' 
                                              : 'bg-[#0f0f0f]/20 border-white/5 hover:bg-[#0f0f0f]/40'
                                          }`}
                                        >
                                          Télécharger
                                        </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {msg.text && (
                                <div className={`${isImage ? 'px-4 pt-1 pb-2.5' : 'px-4 py-2.5'}`}>
                                  <div className="flex items-end gap-3">
                                    <div className="flex flex-col gap-1 min-w-0">
                                      {isOwnerAccount && (msg.isError || (msg.text && msg.text.includes("quota dépassé"))) && (
                                        <div className="flex flex-col gap-1 mb-2">
                                          <div className="flex items-center gap-1.5 text-red-500">
                                            <AlertCircle size={14} />
                                            <span className="text-[10px] font-bold uppercase">Erreur de quota / technique</span>
                                          </div>
                                          {msg.errorDetails && (
                                            <div className="text-[9px] bg-red-500/10 p-1.5 rounded-lg border border-red-500/20 font-mono text-red-400 break-all">
                                              {msg.errorDetails}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      <div className={`${largeEmojis ? 'text-4xl' : 'text-sm'} font-medium leading-relaxed break-words`}>
                                        {renderMessageText(msg.text || '', largeEmojis)}
                                      </div>
                                      {msg.needsKey && (
                                        <div className="mt-3">
                                          <button 
                                            onClick={async () => {
                                              await openKeySelector();
                                              // Optional: trigger a retry or just inform the user
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-2xl transition-all shadow-lg active:scale-95"
                                          >
                                            <Plus size={14} />
                                            Connecter ma clé API
                                          </button>
                                          <p className="mt-2 text-[10px] opacity-60 italic">
                                            Note : Une clé API payante est requise pour Veo. 
                                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">
                                              En savoir plus sur la facturation.
                                            </a>
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <div className={`flex items-center gap-1 text-[9px] font-bold flex-shrink-0 mb-0.5 ${largeEmojis ? 'text-slate-500' : (msg.is_own ? 'text-white/60' : 'text-white/40')}`}>
                                      {(msg.is_edited || msg.text?.endsWith('\u200B')) && !isDeleted && <span className="text-[8px] opacity-50 uppercase italic mr-1">(modifié)</span>}
                                      <span>{msg.timestamp}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {!isDeleted && !isMobileDevice() && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText((msg.text || '').replace(/\u200B$/, ''));
                            }}
                            className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                            title="Copier"
                          >
                            <Copy size={14} />
                          </button>
                          {msg.is_own && (
                            <>
                              <button 
                                onClick={() => {
                                  setMessageToEdit(msg);
                                  setEditText((msg.text || '').replace(/\u200B$/, ''));
                                }}
                                className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                title="Modifier"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => setMessageToDelete(msg)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator en bas à droite comme demandé */}
              {isOtherTyping && (
                <div className="flex justify-end w-full px-4 sm:px-8 mt-2 animate-in fade-in duration-300">
                  <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-1.5 backdrop-blur-md">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}

              {isTypingAI && <div className="flex justify-start animate-pulse px-4 sm:px-8 mb-4"><div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[9px] text-white font-bold uppercase">Gemini réfléchit... </div></div>}
            </div>

            {/* Pied de page Messagerie (Barre + Zone Noire) */}
            <div className={`flex flex-col bg-[#0f0f0f] flex-shrink-0 z-[110] relative`}>
              {/* Barre de Saisie */}
              <div className={`w-full px-2 sm:px-4 ${isMobileDevice() ? 'py-1' : 'py-4'} bg-[#0f0f0f] border-t border-white/10`}>
                {isOwnerAccount && localUploadError && (
                  <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-500 text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} />
                      <span>{localUploadError}</span>
                    </div>
                    <button onClick={() => setLocalUploadError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X size={14} /></button>
                  </div>
                )}
                <div className={`flex items-center gap-2 max-w-full ${isMobileDevice() ? 'h-[50px]' : 'h-[53px]'}`}>
                  <div className={`flex-1 h-full flex items-center gap-1 bg-white/5 rounded-full px-4 border border-white/10 shadow-inner overflow-hidden group/input relative`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    
                    <div className="relative flex items-center flex-shrink-0">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-1.5 transition-colors ${showEmojiPicker ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}>
                        <Smile size={24} />
                      </button>
                    </div>

                    {stagedFile && (
                      <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-xl border border-white/10 animate-in zoom-in duration-200 flex-shrink-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0f0f0f] flex-shrink-0">
                          {stagedFile.type.startsWith('image/') ? (
                            <img src={stagedFile.url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary">
                              <Video size={16} />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-white max-w-[80px] truncate">{stagedFile.name}</span>
                        <button onClick={() => setStagedFile(null)} className="p-1 hover:bg-white/20 rounded-full text-slate-400 hover:text-white">
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {!isMobileDevice() && (
                      <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-white transition-colors flex-shrink-0"><Paperclip size={22} /></button>
                    )}

                    <input 
                      type="text" 
                      value={messageText} 
                      onChange={(e) => handleInputChange(e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          sendMessage(messageText);
                          updateTypingStatus(false);
                        }
                      }} 
                      placeholder="Message" 
                      className="flex-1 bg-transparent border-none text-base text-white outline-none focus:ring-0 placeholder:text-slate-500 py-1 h-full pl-0 min-w-0" 
                    />

                    <div className="flex items-center gap-0.5 flex-shrink-0 pr-1">
                      {isMobileDevice() && (
                        <div className="flex items-center gap-0 flex-shrink-0">
                          <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="p-1 px-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            <Paperclip size={22} />
                          </button>
                          <button 
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('open-camera', { detail: { destination: 'message' } }));
                            }} 
                            className="p-1 px-1.5 text-slate-400 hover:text-white transition-colors"
                          >
                            <Camera size={22} />
                          </button>
                        </div>
                      )}

                      {!isMobileDevice() && (
                        <button onClick={() => sendMessage(messageText)} className="h-10 w-10 bg-primary text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow-md">
                          {messageText.trim() ? <Send size={18} /> : <Mic size={20} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {isMobileDevice() && (
                    <button onClick={() => sendMessage(messageText)} className="bg-primary text-white h-[50px] w-[50px] min-w-[50px] rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90">
                      {messageText.trim() ? <Send size={24} /> : <Mic size={26} />}
                    </button>
                  )}
                </div>
              </div>

                    {/* Zone Noire "Hors App" - Permanente mais masquée quand le clavier est là */}
              {isMobileDevice() && !isKeyboardOpen && (
                <div className="w-full bg-[#0f0f0f] flex-shrink-0" style={{ height: '25px' }} />
              )}
            </div>

            {/* Delete Message Modal */}
            {messageToDelete && (
              <div className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-6 text-center">
                    <h3 className="text-lg font-bold text-white mb-2">Supprimer le message ?</h3>
                    <p className="text-xs text-slate-400 mb-6">Cette action ne peut pas être annulée.</p>
                    
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => deleteMessage('everyone')}
                        className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-sm font-bold rounded-2xl transition-all"
                      >
                        Supprimer pour tout le monde
                      </button>
                      <button 
                        onClick={() => deleteMessage('me')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-2xl transition-all"
                      >
                        Supprimer pour moi
                      </button>
                      <button 
                        onClick={() => setMessageToDelete(null)}
                        className="w-full py-3 text-slate-400 text-sm font-bold hover:text-white transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Message Modal */}
            {messageToEdit && (
              <div className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Modifier le message</h3>
                      <button onClick={() => setMessageToEdit(null)} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                    
                    <textarea 
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px] resize-none mb-6"
                      placeholder="Modifier votre message..."
                      autoFocus
                    />
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setMessageToEdit(null)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-2xl transition-all"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleUpdateMessage}
                        className="flex-1 py-3 bg-primary hover:opacity-90 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-primary/20"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Media Viewer Modal */}
            {selectedMedia && (
              <MediaViewer 
                media={selectedMedia} 
                onClose={() => setSelectedMedia(null)} 
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
            <div className="w-20 h-20 bg-white/5 text-slate-700 border border-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-inner animate-in fade-in zoom-in duration-500"><MessageCircle size={40} /></div>
            <h3 className="text-3xl font-bold text-white tracking-tight mb-3">Messagerie Wexo</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium leading-relaxed">Discutez avec vos amis ou profitez d'une intelligence artificielle avancée.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
