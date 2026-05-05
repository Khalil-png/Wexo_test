
export interface MessageInfo {
  id: string;
  chat: string;
  user: string;
  type: 'screenshot' | 'call_missed' | 'encryption_verified' | 'chat_cleared' | 'member_added' | 'member_removed';
  created: string;
  expand?: {
    user?: UserProfile;
  };
}

export interface Chat {
  id: string;
  name?: string;
  type: 'direct' | 'group';
  members: string[];
  created: string;
  updated: string;
  expand?: {
    members?: UserProfile[];
  };
}

export type TabId = 
  | 'accueil' 
  | 'video' 
  | 'shorts'
  | 'workspace' 
  | 'message' 
  | 'appel'
  | 'ma-chaine' 
  | 'posts' 
  | 'youtube'
  | 'historique' 
  | 'playlists' 
  | 'likes' 
  | 'abonnement' 
  | 'parametres'
  | 'aide'
  | 'commentaire'
  | 'admin-panel'
  | 'telecharger';

export interface UserProfile {
  id: string;
  display_id?: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  email?: string;
  created_at?: any;
  is_verified?: boolean;
  role?: 'admin' | 'user';
  auth_method?: 'google' | 'password' | 'anonymous';
}

export interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  group: 'primary' | 'library' | 'personal' | 'admin';
}

export interface Post {
  id: string;
  author: string;
  author_id?: string;
  author_email?: string;
  author_display_id?: string;
  author_display_name?: string;
  author_is_verified?: boolean;
  author_role?: 'admin' | 'user';
  avatar: string;
  content: string;
  created_at?: string;
  timestamp?: string;
  likes: number;
  comments: number;
  image?: string;
  video?: string;
  type?: string;
  is_appropriate?: boolean;
  language?: string;
  analysis_status?: 'pending' | 'pending_quota' | 'completed' | 'failed';
  transcription?: { start: number, end: number, text: string }[] | null;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
  timestamp?: string;
  is_own?: boolean;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  transcription?: { start: number, end: number, text: string }[] | null;
  is_edited?: boolean;
  is_deleted_for_everyone?: boolean;
  deleted_for_me_by?: string[];
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
  creator_name?: string;
  creator_email?: string;
  creator_avatar?: string;
  creator_display_id?: string;
  creator_display_name?: string;
  creator_is_verified?: boolean;
  creator_role?: 'admin' | 'user';
  created_at: string;
  views: number;
  likes: number;
  is_short?: boolean;
  source?: 'wexo' | 'youtube' | 'upload';
  youtube_id?: string;
  youtube_channel?: string;
  youtube_channel_avatar?: string;
  video_file?: any;
  avatar_file?: any;
  categories?: string[];
  type?: string;
  name_of_type?: string | null;
  language?: string;
  transcription?: { start: number, end: number, text: string }[] | null;
  is_appropriate?: boolean;
  analysis_status?: 'pending' | 'pending_quota' | 'completed' | 'failed';
  is_promoted?: boolean;
  target_user_ids?: string[];
  watch_stats?: any[];
  status?: 'analyzing' | 'publishing' | 'ready' | 'error';
}

export interface CallsTabProps {
  user: any;
  profile?: UserProfile | null;
  activeCall?: any;
  callTimer?: number;
  onEndCall?: () => void;
  onStartCall?: (receiver: any) => void;
}
