
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { renderTextWithEmojis, EMOJI_MAP } from '../utils/emoji';
import { 
  Search, Plus, Smile, Send, X, Image, Pencil,
  CheckCheck, ArrowLeft, Check, Trash2,
  MessageCircle, Info, UserPlus, Clock, 
  MessageSquarePlus, Users, User, Mic, Paperclip, AlertCircle, Video, Sparkles,
  Dog, Utensils, Trophy, Car, Lightbulb, Heart as HeartIcon, Flag,
  Download, File, FileText, Archive, Ban, Copy
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { DEFAULT_AVATAR } from '../constants';
import { Message } from '../types';
import { getSmartResponse, generateImage, generateVideo, checkApiKey, openKeySelector, analyzeVideo } from '../services/geminiService';
import { pb, uploadToPocketBase } from '../services/pocketbaseService';
// Firebase désactivé
import { isMobileDevice } from '../src/utils/device';
import { useClickOutside } from '../utils/hooks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSnowflake } from '../utils/snowflake';
import Username from './Username';

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
      className="fixed inset-0 bg-black/95 backdrop-blur-md z-[300] flex flex-col animate-in fade-in duration-300"
    >
      {/* Header */}
      <div className="h-20 px-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-20 shrink-0">
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
  needsKey?: boolean;
  is_screenshot_alert?: boolean;
  sender_name?: string;
}

interface MessagesTabProps {
  user?: any;
  profile?: any;
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

const MessagesTab: React.FC<MessagesTabProps> = ({ user, profile }) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
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
      
      // On ajoute Gemini dans les conversations SI on a un message avec lui
      // Mais on s'assure qu'il est unique
      const hasGeminiMessages = participants.has('gemini');
      if (hasGeminiMessages) {
        const lastGeminiMsg = resultList.items.find(m => m.sender_id === 'gemini' || m.receiver_id === 'gemini');
        convs.push({
          id: 'gemini',
          username: 'Gemini',
          lastMessage: lastGeminiMsg?.text || 'Assistant IA',
          lastMessageTime: lastGeminiMsg ? new Date(lastGeminiMsg.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          unreadCount: 0
        });
        participants.delete('gemini');
      }

      // Filtrer les participants pour éviter d'avoir un "Doublon" utilisateur nommé Gemini si possible
      // Mais surtout, s'assurer que si un utilisateur a l'ID 'gemini', il est traité comme l'IA

      // Pour les autres participants (on filtre tout ce qui ressemble à Gemini pour éviter les doublons avec l'IA)
      for (const pId of Array.from(participants)) {
        try {
          const u = await pb.collection('users').getOne(pId);
          if (u.id === 'gemini' || u.username.toLowerCase() === 'gemini' || (u.name || '').toLowerCase() === 'gemini') {
            continue;
          }
          const lastMsg = resultList.items.find(m => m.sender_id === pId || m.receiver_id === pId);
          convs.push({
            id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            lastMessage: lastMsg?.text || '',
            lastMessageTime: lastMsg ? new Date(lastMsg.created).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
            unreadCount: 0
          });
        } catch (e) {
          console.error("Erreur chargement profil conversation:", e);
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
        pb.collection('messages').unsubscribe('*');
      };
    } else {
      setSelectedId(null);
      setMobileView('list');
      setConversations([]);
      setMessages([]);
    }
  }, [user, fetchConversations]);

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
        pb.collection('messages').unsubscribe('*');
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
    // Listen for custom event from Header
    const handleSelectChat = (e: any) => {
      setSelectedId(e.detail);
      setMobileView('chat');
    };
    window.addEventListener('select-chat', handleSelectChat);

    // Check URL param on mount
    const params = new URLSearchParams(window.location.search);
    const chatId = params.get('chat');
    if (chatId) {
      setSelectedId(chatId);
      setMobileView('chat');
    }

    return () => window.removeEventListener('select-chat', handleSelectChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTypingAI]);

  const fetchSelectedProfile = async () => {
    if (!selectedId) return;
    try {
      const model = await pb.collection('users').getOne(selectedId);
      setSelectedProfile({
        id: model.id,
        username: model.username,
        display_name: model.name || model.username,
        avatar_url: model.avatar_url,
        is_verified: model.is_verified || false,
        role: model.role || 'user'
      });
    } catch (err) {
      console.error("Erreur profil NAS:", err);
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
    // Migration NAS
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
    // Migration NAS
    console.log("Add friend non supporté sur NAS pour le moment");
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
      const pbData = {
        ...newMsg,
        created: now // Map logic if needed
      };
      await pb.collection('messages').create(pbData);
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
        const isQuotaError = responseText.includes("quota dépassé");
        
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
              text: responseText,
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
              text: responseText,
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
        <div className="p-6 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white tracking-tighter">Messages</h2>
            <div className="flex items-center gap-2 relative">
              <button 
                onClick={() => {setSelectedId('gemini'); setMobileView('chat');}} 
                className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all overflow-hidden"
                title="Assistant IA"
              >
                <GeminiAvatarIcon size={16} />
              </button>
              <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all flex items-center justify-center"><Plus size={20} /></button>
              
              {showPlusMenu && (
                <div ref={plusMenuRef} className="absolute top-10 right-0 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] animate-in zoom-in-95 duration-200">
                  <button onClick={() => {setIsSearchingUsers(true); setShowPlusMenu(false); handleSearchUsers('', 'tout');}} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-2xl transition-all group text-left">
                    <div className="w-9 h-9 bg-white/10 text-white rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all"><MessageSquarePlus size={18} /></div>
                    <span className="block text-[11px] font-black uppercase text-white tracking-widest">Démarrer une discussion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="Rechercher..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-xs text-white outline-none" /></div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Gemini List Item */}
          <div onClick={() => { setSelectedId('gemini'); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === 'gemini' ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
            <div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
              <GeminiAvatarIcon size={20} />
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
            <div key={c.id} onClick={() => { setSelectedId(c.id); setMobileView('chat'); }} className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 transition-all ${selectedId === c.id ? 'bg-white/10 border-white' : 'border-transparent hover:bg-white/5'}`}>
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
                      <button onClick={() => { setSelectedId(u.id); setIsSearchingUsers(false); setMobileView('chat'); }} className="p-3 bg-white/10 text-white rounded-2xl hover:bg-white hover:text-black transition-all"><MessageSquarePlus size={18} /></button>
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

      {/* Zone de Chat */}
      <div className={`flex-1 flex-col bg-[#0f0f0f] relative lg:flex h-full overflow-hidden ${mobileView === 'list' ? 'hidden' : 'flex'}`}>
        {selectedId ? (
          <>
            <div className="p-4 border-b border-white/10 bg-[#0f0f0f]/80 backdrop-blur-md flex items-center justify-between z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileView('list')} className="lg:hidden p-2 text-slate-400 mr-1"><ArrowLeft size={20} /></button>
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
                        <span className="w-1 h-1 rounded-2xl bg-emerald-500 animate-pulse"></span>
                        <p className="text-[9px] text-slate-500 font-bold">En ligne</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {selectedId !== 'gemini' && (
                <div className="flex items-center gap-2 relative">
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
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col z-10 py-4 sm:py-8">
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

                const isImage = msg.file_type?.startsWith('image/') || msg.isGeneratingImage;
                const isVideo = msg.file_type?.startsWith('video/') || msg.isGeneratingVideo;
                const isDeleted = msg.is_deleted_for_everyone;
                const hasPrevSameSender = idx > 0 && messages[idx - 1].sender_id === msg.sender_id;
                const hasNextSameSender = idx < messages.length - 1 && messages[idx + 1].sender_id === msg.sender_id;
                
                const emojiOnly = msg.text && isOnlyEmojis(msg.text);
                const emojiCount = emojiOnly ? countEmojis(msg.text) : 0;
                const largeEmojis = emojiOnly && emojiCount <= 5;
                
                let borderRadiusClasses = 'rounded-2xl';
                if (msg.is_own) {
                  borderRadiusClasses += ` ${!hasPrevSameSender ? 'rounded-tr-2xl' : 'rounded-tr-md'} ${hasNextSameSender ? 'rounded-br-md' : ''}`;
                } else {
                  borderRadiusClasses += ` ${!hasPrevSameSender ? 'rounded-tl-2xl' : 'rounded-tl-md'} ${hasNextSameSender ? 'rounded-bl-md' : ''}`;
                }
                
                return (
                  <div key={msg.id} className={`flex group relative w-full px-4 sm:px-8 hover:bg-white/[0.03] transition-colors py-0.5 ${msg.is_own ? 'justify-end' : 'justify-start'} ${hasPrevSameSender ? 'mt-0' : (idx === 0 ? 'mt-0' : 'mt-6')}`}>
                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${msg.is_own ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`${(isImage || isVideo) && !isDeleted ? 'max-w-[280px] sm:max-w-[320px]' : 'w-fit'} ${borderRadiusClasses} relative ${largeEmojis ? '' : 'shadow-lg overflow-hidden'} ${
                        largeEmojis ? 'bg-transparent' : (
                          msg.is_own 
                            ? isDeleted ? 'bg-white/5 text-white/40 italic' : 'bg-blue-700 text-white' 
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
                                      <div className={`relative rounded-2xl overflow-hidden border-2 ${msg.is_own ? 'border-blue-400/30' : 'border-white/10'}`}>
                                        <img 
                                          src={msg.file_url} 
                                          alt={msg.file_name} 
                                          className="w-full cursor-pointer hover:opacity-95 transition-opacity max-h-[400px] object-cover" 
                                          onClick={() => setSelectedMedia({ url: msg.file_url!, name: msg.file_name!, type: msg.file_type!, message: msg.text, transcription: msg.transcription })} 
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
                                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer group/vid ${msg.is_own ? 'border-blue-400/30' : 'border-white/10'}`}
                                        onClick={() => setSelectedMedia({ url: msg.file_url!, name: msg.file_name!, type: msg.file_type!, message: msg.text, transcription: msg.transcription })}
                                      >
                                        <video 
                                          src={msg.file_url} 
                                          className="w-full max-h-[400px] bg-black pointer-events-none" 
                                          poster={`${msg.file_url}#t=0.1`}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/vid:bg-black/40 transition-all">
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
                                              : 'bg-black/20 border-white/5 hover:bg-black/40'
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
                                      {(msg.isError || (msg.text && msg.text.includes("quota dépassé"))) && <div className="flex items-center gap-1.5 text-red-500 mb-1"><AlertCircle size={14} /><span className="text-[10px] font-bold uppercase">Erreur de quota</span></div>}
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
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg active:scale-95"
                                          >
                                            <Plus size={14} />
                                            Connecter ma clé API
                                          </button>
                                          <p className="mt-2 text-[10px] opacity-60 italic">
                                            Note : Une clé API payante est requise pour Veo. 
                                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:underline">
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

                      {!isDeleted && (
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
              {isTypingAI && <div className="flex justify-start animate-pulse px-4 sm:px-8 mb-4"><div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-[9px] text-white font-bold uppercase">Gemini réfléchit... </div></div>}
            </div>

            <div className={`p-4 sm:p-6 bg-[#0f0f0f] border-t border-white/10 flex-shrink-0 z-20 relative`}>
              {localUploadError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-500 text-[10px] font-bold animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{localUploadError}</span>
                  </div>
                  <button onClick={() => setLocalUploadError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
              {stagedFile && (
                <div className="mb-3 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-4 max-w-sm relative group">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-slate-400">
                      {getFileIcon(stagedFile.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{stagedFile.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                        {stagedFile.type.split('/')[1] || 'Fichier'} • {formatFileSize(stagedFile.size)}
                      </p>
                    </div>
                    <button 
                      onClick={() => setStagedFile(null)}
                      className="p-1.5 bg-black/40 text-slate-400 hover:text-white rounded-2xl transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
              <div className={`flex items-center gap-3 bg-white/5 ${isMobileDevice() ? 'rounded-full' : 'rounded-2xl'} p-2 border border-white/10 shadow-inner`}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className={`p-2.5 text-slate-400 hover:text-white transition-colors ${uploadingFile ? 'animate-pulse' : ''}`}
                >
                  {uploadingFile ? <Clock size={20} /> : <Paperclip size={20} />}
                </button>
                <input 
                  type="text" 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(messageText)} 
                  placeholder={`Écrire à ${selectedId === 'gemini' ? 'Gemini' : (selectedProfile?.username || '...')}`} 
                  className="flex-1 bg-transparent border-none text-sm text-white outline-none focus:ring-0 placeholder:text-slate-500" 
                />
                <div className="flex items-center gap-2 relative">
                  <div className="relative">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                      className={`p-2.5 transition-colors ${showEmojiPicker ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
                    >
                      <Smile size={20} />
                    </button>

                    {showEmojiPicker && (
                      <div 
                        ref={emojiPickerRef}
                        className="absolute bottom-full mb-4 right-0 w-72 sm:w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 flex flex-col"
                        style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", "Android Emoji", sans-serif' }}
                      >
                        {/* WhatsApp-style Category Bar at Top */}
                        <div className="bg-[#2a2a2a] p-1 flex items-center justify-around border-b border-white/5">
                          {emojiCategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setActiveEmojiCategory(cat.id)}
                              className={`p-2 rounded-2xl transition-all ${activeEmojiCategory === cat.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                              title={cat.label}
                            >
                              <span className="flex items-center justify-center">{cat.icon}</span>
                            </button>
                          ))}
                        </div>

                        {/* WhatsApp-style Search */}
                        <div className="bg-[#1a1a1a] p-2 border-b border-white/5">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input 
                              type="text"
                              value={emojiSearchQuery}
                              onChange={(e) => setEmojiSearchQuery(e.target.value)}
                              placeholder="Rechercher un emoji..."
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-9 pr-8 text-[11px] text-white outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            />
                            {emojiSearchQuery && (
                              <button 
                                onClick={() => setEmojiSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                              >
                                <Plus size={14} className="rotate-45" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Emoji Grid */}
                        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1 p-3 h-64 overflow-y-auto no-scrollbar bg-[#1a1a1a]">
                          {(emojiSearchQuery 
                            ? emojiCategories.flatMap(c => c.emojis).filter(e => e.includes(emojiSearchQuery) || true)
                            : emojiCategories.find(c => c.id === activeEmojiCategory)?.emojis
                          )?.map((emoji, i) => (
                            <button 
                              key={i} 
                              onClick={() => setMessageText(prev => prev + emoji)}
                              className="aspect-square hover:bg-white/10 p-1.5 rounded-none transition-all active:scale-90 flex items-center justify-center"
                            >
                              {EMOJI_MAP[emoji] ? (
                                <img src={EMOJI_MAP[emoji]} alt={emoji} className="w-6 h-6 aspect-square object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-2xl">{emoji}</span>
                              )}
                            </button>
                          ))}
                        </div>
                        
                        <div className="absolute top-full right-4 border-8 border-transparent border-t-[#1a1a1a]"></div>
                      </div>
                    )}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white transition-colors"><Mic size={20} /></button>
                  <button 
                    onClick={() => sendMessage(messageText)} 
                    className="bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 hover:bg-blue-600"
                  >
                    <Send size={18} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>

            {/* Delete Message Modal */}
            {messageToDelete && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[120px] resize-none mb-6"
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
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
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
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f]">
            <div className="w-20 h-20 bg-white/5 text-slate-700 border border-white/10 rounded-2xl flex items-center justify-center mb-8 shadow-inner animate-in fade-in zoom-in duration-500"><MessageCircle size={40} /></div>
            <h3 className="text-3xl font-bold text-white tracking-tight mb-3">Messagerie Wexo</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium leading-relaxed">Discutez avec vos amis ou profitez de l'intelligence de Gemini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesTab;
