
import React from 'react';
import { NAV_ITEMS, getIcon } from '../constants';
import { TabId } from '../types';
import { ChevronRight, X } from 'lucide-react';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const NavButton: React.FC<{ item: any }> = ({ item }) => (
    <button
      onClick={() => onTabChange(item.id)}
      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group mb-1 ${
        activeTab === item.id 
          ? 'bg-[#272727] text-white shadow-sm' 
          : 'text-slate-400 hover:bg-white/10 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-4">
        {getIcon(item.icon, activeTab === item.id)}
        <span className={`font-bold text-[15px] tracking-tight ${activeTab === item.id ? 'text-white' : 'text-slate-300'}`}>
          {item.label}
        </span>
      </div>
      {activeTab === item.id && <ChevronRight size={16} className="text-white" />}
    </button>
  );

  const primaryItems = NAV_ITEMS.filter(item => item.group === 'primary');
  const libraryItems = NAV_ITEMS.filter(item => item.group === 'library');
  const personalItems = NAV_ITEMS.filter(item => item.group === 'personal');
  const adminItems = NAV_ITEMS.filter(item => item.group === 'admin');

  return (
    <>
      {/* Overlay fond sombre sur mobile */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Sidebar Container - pt-6 pour un peu plus d'espace en haut */}
      <aside className={`fixed left-0 top-0 h-screen w-72 bg-[#0f0f0f] border-r border-white/10 flex flex-col pt-6 pb-6 overflow-y-auto z-[70] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } no-scrollbar`}>
        
        {/* Logo Section - mb-8 pour laisser respirer le premier bouton Accueil */}
        <div className="flex items-center gap-4 px-8 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-black text-xl">
            W
          </div>
          <span className="text-2xl font-black text-white tracking-tighter">WEXO</span>
          
          <button onClick={onClose} className="lg:hidden ml-auto p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 space-y-1">
          {primaryItems.map(item => <NavButton key={item.id} item={item} />)}
        </div>

        <div className="mt-8 px-5 space-y-1">
          <h3 className="px-4 text-[11px] font-black text-slate-400 tracking-widest mb-4">Bibliothèque</h3>
          {libraryItems.map(item => <NavButton key={item.id} item={item} />)}
        </div>

        <div className="mt-8 px-5 space-y-1">
          <h3 className="px-4 text-[11px] font-black text-slate-400 tracking-widest mb-4">Compte</h3>
          {personalItems.map(item => <NavButton key={item.id} item={item} />)}
        </div>

        {adminItems.length > 0 && (
          <div className="mt-8 px-5 space-y-1">
            <h3 className="px-4 text-[11px] font-black text-slate-400 tracking-widest mb-4">Admin</h3>
            {adminItems.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        )}

        <div className="mt-auto px-8 pt-12">
          <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-center">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Wexo Cloud</p>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full w-1/2 shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
