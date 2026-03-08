
import React from 'react';
import { 
  Home, 
  PlaySquare, 
  Briefcase, 
  MessageCircle, 
  UserCircle, 
  Gamepad2, 
  Layout, 
  Zap,
  History, 
  ListMusic, 
  Heart, 
  Users, 
  Settings,
  HelpCircle,
  MessageSquarePlus,
  ShieldCheck
} from 'lucide-react';
import { NavItem } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'accueil', label: 'Accueil', icon: 'Home', group: 'primary' },
  { id: 'video', label: 'Vidéo', icon: 'PlaySquare', group: 'primary' },
  { id: 'shorts', label: 'Shorts', icon: 'Zap', group: 'primary' },
  { id: 'workspace', label: 'Workspace', icon: 'Briefcase', group: 'primary' },
  { id: 'message', label: 'Messages', icon: 'MessageCircle', group: 'primary' },
  { id: 'ma-chaine', label: 'Ma chaîne', icon: 'UserCircle', group: 'primary' },
  { id: 'jeux', label: 'Jeux', icon: 'Gamepad2', group: 'primary' },
  { id: 'posts', label: 'Posts', icon: 'Layout', group: 'primary' },
  
  { id: 'historique', label: 'Historique', icon: 'History', group: 'library' },
  { id: 'playlists', label: 'Playlists', icon: 'ListMusic', group: 'library' },
  { id: 'likes', label: 'J\'aime', icon: 'Heart', group: 'library' },
  
  { id: 'abonnement', label: 'Abonnement', icon: 'Users', group: 'personal' },
  { id: 'parametres', label: 'Paramètres', icon: 'Settings', group: 'personal' },
  { id: 'aide', label: 'Aide', icon: 'HelpCircle', group: 'personal' },

  { id: 'commentaire', label: 'Envoyer un commentaire', icon: 'MessageSquarePlus', group: 'admin' },
  { id: 'admin-panel', label: 'Panel Admin', icon: 'ShieldCheck', group: 'admin' },
];

export const DEFAULT_AVATAR = "https://media-mrs2-3.cdn.whatsapp.net/v/t61.24694-24/644467015_2018251549106358_8533803138920450960_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa4AGGPgTKxpiLgwEWK8Z-76sy4RFP7piQYK46ru_YoVLHWA&oe=69B8FD30&_nc_sid=5e03e0&_nc_cat=108";

export const getIcon = (iconName: string, active: boolean) => {
  const size = 20;
  const color = active ? '#ffffff' : '#94a3b8';
  const strokeWidth = active ? 2.5 : 2;

  switch (iconName) {
    case 'Home': return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    case 'PlaySquare': return <PlaySquare size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Briefcase': return <Briefcase size={size} color={color} strokeWidth={strokeWidth} />;
    case 'MessageCircle': return <MessageCircle size={size} color={color} strokeWidth={strokeWidth} />;
    case 'UserCircle': return <UserCircle size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Gamepad2': return <Gamepad2 size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Layout': return <Layout size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Zap': return <Zap size={size} color={color} strokeWidth={strokeWidth} />;
    case 'History': return <History size={size} color={color} strokeWidth={strokeWidth} />;
    case 'ListMusic': return <ListMusic size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Heart': return <Heart size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Users': return <Users size={size} color={color} strokeWidth={strokeWidth} />;
    case 'Settings': return <Settings size={size} color={color} strokeWidth={strokeWidth} />;
    case 'HelpCircle': return <HelpCircle size={size} color={color} strokeWidth={strokeWidth} />;
    case 'MessageSquarePlus': return <MessageSquarePlus size={size} color={color} strokeWidth={strokeWidth} />;
    case 'ShieldCheck': return <ShieldCheck size={size} color={color} strokeWidth={strokeWidth} />;
    default: return <Home size={size} color={color} strokeWidth={strokeWidth} />;
  }
};
