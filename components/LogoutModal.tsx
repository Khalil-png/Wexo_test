
import React from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LogoutModalProps {
  onClose: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ onClose }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 animate-in zoom-in slide-in-from-top-10 duration-300">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-center text-white mb-2">Déconnexion</h2>
        <p className="text-slate-500 text-center text-sm mb-8">Êtes-vous sûr de vouloir vous déconnecter de Wexo ?</p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={18} /> Oui, me déconnecter
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl transition-all"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
