
import React from 'react';
import { 
  Info, 
  Home, 
  Play, 
  Briefcase, 
  MessageSquare, 
  Phone,
  User, 
  Gamepad,
  Gamepad2, 
  Layout, 
  Flame,
  History, 
  ListMusic, 
  Heart, 
  Users, 
  Settings,
  HelpCircle,
  MessageSquarePlus,
  ShieldCheck,
  Video,
  Download
} from 'lucide-react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'accueil', label: 'Accueil', icon: 'Home', group: 'primary' },
  { id: 'video', label: 'Vidéo', icon: 'Play', group: 'primary' },
  { id: 'shorts', label: 'Shorts', icon: 'Flame', group: 'primary' },
  { id: 'workspace', label: 'Workspace', icon: 'Briefcase', group: 'primary' },
  { id: 'message', label: 'Messages', icon: 'MessageSquare', group: 'primary' },
  { id: 'appel', label: 'Appel', icon: 'Phone', group: 'primary' },
  { id: 'ma-chaine', label: 'Ma chaîne', icon: 'Video', group: 'primary' },
  { id: 'posts', label: 'Posts', icon: 'Layout', group: 'primary' },
  
  { id: 'historique', label: 'Historique', icon: 'History', group: 'library' },
  { id: 'playlists', label: 'Playlists', icon: 'ListMusic', group: 'library' },
  { id: 'likes', label: 'J\'aime', icon: 'Heart', group: 'library' },
  
  { id: 'abonnement', label: 'Abonnement', icon: 'Users', group: 'personal' },
  { id: 'parametres', label: 'Paramètres', icon: 'Settings', group: 'personal' },
  { id: 'aide', label: 'Aide', icon: 'HelpCircle', group: 'personal' },
  { id: 'telecharger', label: 'Télécharger', icon: 'Download', group: 'personal' },

  { id: 'commentaire', label: 'Envoyer un commentaire', icon: 'MessageSquarePlus', group: 'admin' },
  { id: 'admin-panel', label: 'Espace Admin', icon: 'ShieldCheck', group: 'admin' },
];

export const DEFAULT_AVATAR = "http://192.168.1.147:9090/api/files/pbc_2708086759/irue23ttw61s3oi/copie_de_panel_admin_z0giqqeanz.png?token=";

export const getIcon = (iconName: string, active: boolean) => {
  const size = 20;
  const color = '#ffffff';
  const strokeWidth = active ? 2.5 : 2;
  
  // Only fill specific icons as requested by the user
  const iconsToFill = [
    'Home', 'Layout', 'User', 'MessageSquare', 'Phone', 'Briefcase', 
    'Flame', 'Play', 'Heart', 'Settings', 'MessageSquarePlus', 'ShieldCheck',
    'ListMusic', 'Video'
  ];
  const fill = (active && iconsToFill.includes(iconName)) ? '#ffffff' : 'none';

  switch (iconName) {
    case 'Home': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H15V12H9v10H5a2 2 0 0 1-2-2V9z" />
      </svg>
    );
    case 'Play': return <Play size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Briefcase': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={active ? "#1a1a1a" : color} />
      </svg>
    );
    case 'MessageSquare': return <MessageSquare size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Phone': return <Phone size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'User': return <User size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Info': return <Info size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Video': return <Video size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Layout': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" stroke={active ? "#1a1a1a" : color} />
        <line x1="9" y1="21" x2="9" y2="9" stroke={active ? "#1a1a1a" : color} />
      </svg>
    );
    case 'Flame': return <Flame size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'History': return <History size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'ListMusic': return <ListMusic size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Heart': return <Heart size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Users': return <Users size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'Settings': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" fill={active ? "#1a1a1a" : "none"} stroke={active ? "#1a1a1a" : color} />
      </svg>
    );
    case 'HelpCircle': return <HelpCircle size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    case 'MessageSquarePlus': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M12 7v6" stroke={active ? "#1a1a1a" : color} />
        <path d="M9 10h6" stroke={active ? "#1a1a1a" : color} />
      </svg>
    );
    case 'ShieldCheck': return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
    case 'Download': return <Download size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
    default: return <Home size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
  }
};
