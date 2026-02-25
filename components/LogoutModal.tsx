
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-in zoom-in slide-in-from-top-10 duration-300">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        
        <h2 className="text-xl font-bold text-center mb-2">Déconnexion</h2>
        <p className="text-slate-400 text-center text-sm mb-8">Êtes-vous sûr de vouloir vous déconnecter de Wexo ?</p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <LogOut size={18} /> Oui, me déconnecter
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl transition-all"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
