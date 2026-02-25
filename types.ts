
export type TabId = 
  | 'accueil' 
  | 'video' 
  | 'shorts'
  | 'workspace' 
  | 'message' 
  | 'ma-chaine' 
  | 'jeux' 
  | 'posts' 
  | 'historique' 
  | 'playlists' 
  | 'likes' 
  | 'abonnement' 
  | 'parametres'
  | 'aide'
  | 'commentaire'
  | 'admin-panel';

export interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  group: 'primary' | 'library' | 'personal' | 'admin';
}

export interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  created_at?: string;
  timestamp?: string;
  likes: number;
  comments: number;
  image?: string;
}

export interface Message {
  id: string;
  sender_id: string;
  text: string;
  timestamp: string;
  is_own: boolean;
}

export interface Discussion {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
}

// Workspace Types
export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  username: string;
  avatar_url: string;
  role: WorkspaceRole;
}

export interface WorkspaceProject {
  id: string;
  workspace_id: string;
  name: string;
  type: 'video' | 'image' | 'doc';
  thumbnail_url?: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at?: string;
  members?: WorkspaceMember[];
  projects?: WorkspaceProject[];
}

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  creator_id: string;
  created_at: string;
  views: number;
  likes: number;
  is_short?: boolean;
  creator_name?: string;
  creator_avatar?: string;
}
