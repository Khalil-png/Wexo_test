
import React, { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, Plus, FileVideo, FileImage, 
  FileText, X, Sparkles, Loader2, ArrowLeft,
  Settings, LayoutGrid, Layers, Zap, Clock, ChevronRight,
  ShieldAlert, MoreVertical, Trash2, Edit3, AlertTriangle,
  CheckCircle2, Lock
} from 'lucide-react';
import { Workspace, WorkspaceProject } from '../types';
import { supabase } from '../services/supabase';

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

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      // Récupération via la table des membres pour inclure ceux partagés
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const wsIds = memberData?.map(m => m.workspace_id) || [];
      
      const { data: wsList, error: wsError } = await supabase
        .from('workspaces')
        .select('*')
        .or(`owner_id.eq.${user.id},id.in.(${wsIds.length ? wsIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

      if (wsError) throw wsError;
      
      const fullWorkspaces = await Promise.all((wsList || []).map(async (ws: any) => {
        const { data: projects } = await supabase
          .from('workspace_projects')
          .select('*')
          .eq('workspace_id', ws.id)
          .order('updated_at', { ascending: false });
        
        return { ...ws, projects: projects || [] };
      }));

      setWorkspaces(fullWorkspaces);
      
      // Mettre à jour l'active workspace s'il a été renommé ou supprimé
      if (activeWorkspace) {
        const updated = fullWorkspaces.find(w => w.id === activeWorkspace.id);
        if (updated) {
          onEnterWorkspace(updated);
        } else {
          // Si plus trouvé (supprimé), on sort
          onEnterWorkspace(null);
        }
      }
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
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .insert([{ name: wsName, owner_id: user.id }])
        .select()
        .single();

      if (wsError) throw wsError;

      // S'ajouter comme owner dans les membres
      await supabase.from('workspace_members').insert([
        { workspace_id: ws.id, user_id: user.id, role: 'owner' }
      ]);

      setIsCreatingWorkspace(false);
      setWsName('');
      await fetchWorkspaces(); 
    } catch (err: any) {
      console.error("Erreur création:", err);
      alert("Erreur de création. Vérifie ta console.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete || actionLoading) return;
    setActionLoading(true);
    try {
      // Suppression du workspace (les projets et membres devraient être delete en cascade si configuré en SQL)
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceToDelete.id);

      if (error) throw error;
      
      // Si on était dans ce workspace, on revient à l'accueil
      if (activeWorkspace?.id === workspaceToDelete.id) {
        onEnterWorkspace(null);
      }
      
      setWorkspaceToDelete(null);
      await fetchWorkspaces();
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur SQL: Vérifie que tu as bien ajouté la règle DELETE dans Supabase.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !newName.trim() || actionLoading) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: newName })
        .eq('id', editingWorkspace.id);

      if (error) throw error;
      
      setEditingWorkspace(null);
      setNewName('');
      await fetchWorkspaces();
    } catch (err) {
      console.error("Erreur renommage:", err);
      alert("Erreur SQL: Vérifie que tu as bien ajouté la règle UPDATE dans Supabase.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newProjectName.trim() || actionLoading) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('workspace_projects')
        .insert([{
          workspace_id: activeWorkspace.id,
          name: newProjectName,
          type: newProjectType,
          thumbnail_url: `https://picsum.photos/seed/${Date.now()}/600/400`
        }]);

      if (error) throw error;
      
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
        <div className="w-28 h-28 bg-slate-900 rounded-[3.5rem] border-2 border-slate-800 flex items-center justify-center mb-12 text-slate-700 shadow-2xl relative">
          <Briefcase size={56} />
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center border-4 border-slate-950 text-white shadow-lg">
            <ShieldAlert size={24} />
          </div>
        </div>
        <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">Accès Réservé</h2>
        <p className="text-slate-400 text-xl max-w-md text-center font-medium leading-relaxed px-6">
          Connecte-toi pour accéder à tes outils de production.
        </p>
        <div className="mt-12 h-1.5 w-24 bg-gradient-to-r from-sky-500/0 via-sky-500/40 to-sky-500/0 rounded-full"></div>
      </div>
    );
  }

  // --- RENDU WORKSPACE (En développement) ---
  return (
    <div className="relative animate-in fade-in duration-700 pb-20 overflow-hidden">
      {/* Overlay "En développement" */}
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-slate-950/20 backdrop-blur-[2px]">
        <div className="bg-slate-900/90 border border-slate-800 p-10 rounded-[3rem] shadow-2xl max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-sky-500/10 rounded-[1.8rem] flex items-center justify-center text-sky-500 mx-auto mb-8 border border-sky-500/20">
            <Lock size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Hub Workspace</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 uppercase tracking-widest opacity-60">
            Cette section est actuellement en cours de développement.
          </p>
          <div className="h-1 w-20 bg-sky-500 mx-auto rounded-full shadow-[0_0_15px_rgba(56,189,248,0.5)]"></div>
        </div>
      </div>

      {/* Contenu flou et désactivé */}
      <div className="opacity-20 pointer-events-none select-none grayscale-[0.5]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-slate-900/40 p-10 rounded-[4rem] border border-slate-800 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-5">Mes Hubs Wexo</h2>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
                <Layers size={16} className="text-sky-500" />
                <span className="text-xs font-bold text-slate-300">8 Espaces</span>
              </div>
            </div>
          </div>
          <button className="relative z-10 bg-white text-black font-black text-[13px] uppercase tracking-[0.2em] px-10 py-5 rounded-[2.5rem]">
            Créer un Workspace
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-12">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-[3rem] p-8 relative overflow-hidden shadow-xl">
               <div className="w-14 h-14 bg-slate-800 rounded-[1.2rem] flex items-center justify-center text-sky-500 mb-8">
                  <Briefcase size={26} />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Espace de Projet {i}</h3>
                <div className="mt-10 pt-6 border-t border-slate-800/50 flex items-center justify-between text-sky-500 font-black text-[11px] uppercase tracking-[0.2em]">
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
