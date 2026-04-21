
import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Plus, FileVideo, FileImage, 
  FileText, X, Sparkles, Loader2, ArrowLeft,
  Settings, LayoutGrid, Layers, Zap, Clock, ChevronRight,
  ShieldAlert, MoreVertical, Trash2, Edit3, TriangleAlert,
  CircleCheck, Lock, Info
} from 'lucide-react';
import { Workspace, WorkspaceProject } from '../types';
import { pb } from '../services/pocketbaseService';
// Firebase désactivé
import { generateSnowflake } from '../utils/snowflake';

interface WorkspaceProps {
  user: any;
  profile: any;
  activeWorkspace: Workspace | null;
  onEnterWorkspace: (ws: Workspace | null) => void;
}

const WorkspaceTab: React.FC<WorkspaceProps> = ({ user, profile, activeWorkspace, onEnterWorkspace }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [wsName, setWsName] = useState('');
  
  // States pour les menus et modals
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [newName, setNewName] = useState('');
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState<'video' | 'image' | 'doc'>('video');
  const [actionLoading, setActionLoading] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setLoading(false);
    }
  }, [user]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      // Migration NAS : Lecture workspace PocketBase
      setWorkspaces([]);
    } catch (err) {
      console.error("Erreur fetch workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || actionLoading || !user) return;

    setActionLoading(true);
    try {
      // Migration NAS
      setIsCreatingWorkspace(false);
      setWsName('');
      await fetchWorkspaces(); 
    } catch (err: any) {
      console.error("Erreur création:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete || actionLoading) return;
    setActionLoading(true);
    try {
      // Migration NAS
      setWorkspaceToDelete(null);
      await fetchWorkspaces();
    } catch (err) {
      console.error("Erreur suppression:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !newName.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      // Migration NAS
      setEditingWorkspace(null);
      setNewName('');
      await fetchWorkspaces();
    } catch (err) {
      console.error("Erreur renommage:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newProjectName.trim() || actionLoading) return;

    setActionLoading(true);
    try {
      // Migration NAS
      await fetchWorkspaces();
      setIsProjectModalOpen(false);
      setNewProjectName('');
    } catch (err: any) {
      console.error("Erreur projet:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-56 animate-in fade-in duration-1000">
        <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center text-slate-700 border border-white/10 mb-8 shadow-inner animate-pulse">
          <Info size={48} />
        </div>
        <p className="text-slate-500 text-xs font-medium leading-relaxed">
          Connectez vous pour pouvoir accéder à vos Workspace.
        </p>
      </div>
    );
  }

  // --- RENDU WORKSPACE (En développement) ---
  return (
    <div className="relative animate-in fade-in duration-700 pb-20 overflow-hidden">
      {/* Overlay "En développement" */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-[2px]">
        <div className="bg-[#0f0f0f]/95 border border-white/10 p-10 rounded-2xl shadow-2xl max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 border border-white/10">
            <Info size={40} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Hub Workspace</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-4 opacity-60">
            Cette section est actuellement en cours de développement.
          </p>
        </div>
      </div>

      {/* Contenu flou et désactivé */}
      <div className="opacity-20 pointer-events-none select-none grayscale-[0.5]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white/5 p-10 rounded-2xl border border-white/10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-5xl font-bold text-white tracking-tight leading-none mb-5">Mes Hubs Wexo</h2>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/5">
                <Layers size={16} className="text-white" />
                <span className="text-xs font-bold text-slate-300">8 Espaces</span>
              </div>
            </div>
          </div>
          <button className="relative z-10 bg-white text-black font-bold text-sm px-8 py-4 rounded-2xl">
            Créer un Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden shadow-xl">
               <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-8">
                  <Briefcase size={26} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Espace de Projet {i}</h3>
                <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-white font-bold text-xs">
                  <span>Ouvrir l'Espace</span>
                  <ChevronRight size={18} />
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTab;
