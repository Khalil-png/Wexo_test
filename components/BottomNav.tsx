
import React from 'react';
import { TabId } from '../types';
import { getIcon } from '../constants';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  // The 5 tabs requested by the user
  const tabs = [
    { id: 'accueil', label: 'Accueil', icon: 'Home' },
    { id: 'posts', label: 'Posts', icon: 'Layout' },
    { id: 'shorts', label: 'Shorts', icon: 'Flame' },
    { id: 'message', label: 'Messages', icon: 'MessageSquare' },
    { id: 'appel', label: 'Appel', icon: 'Phone' }
  ];

  // Logic to show 4 slots:
  // If the active tab is one of the 5, we show the other 4.
  // If the active tab is NOT one of the 5 (e.g. Workspace), we show the first 4.
  const getVisibleTabs = () => {
    const isTabInList = tabs.some(t => t.id === activeTab);
    if (!isTabInList) {
      return tabs.slice(0, 4);
    }
    // Filter out the active tab to show the "other" 4
    return tabs.filter(t => t.id !== activeTab);
  };

  const visibleTabs = getVisibleTabs();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0f0f0f]/90 backdrop-blur-xl border-t border-white/10 px-4 pb-8 pt-2 flex items-center justify-around lg:hidden animate-in slide-in-from-bottom-4 duration-500">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as TabId)}
          className="flex flex-col items-center justify-center flex-1 gap-1 py-2 transition-all active:scale-95"
        >
          <div className="p-1 rounded-xl text-slate-400">
            {getIcon(tab.icon, false)}
          </div>
          <span className="text-[12px] font-bold tracking-tight text-white">
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default BottomNav;
