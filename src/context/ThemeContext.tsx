import React, { createContext, useContext, useState, useEffect } from 'react';
import { pb } from '@/services/pocketbaseService';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  primaryColor: string;
  setMode: (mode: ThemeMode, sync?: boolean) => void;
  setPrimaryColor: (color: string, sync?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('wexo-theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    const saved = localStorage.getItem('wexo-primary-color');
    // Si l'utilisateur a l'ancien bleu par défaut, on le force au nouveau Wexo Blue
    if (saved === '#3b82f6') return '#0040ff';
    return saved || '#0040ff';
  });

  // Load from DB on init if logged in
  useEffect(() => {
    const syncFromDB = async () => {
      if (pb.authStore.model?.id) {
        try {
          const user = await pb.collection('users').getOne(pb.authStore.model.id);
          if (user.theme_mode) {
             setModeState(user.theme_mode);
             localStorage.setItem('wexo-theme-mode', user.theme_mode);
          }
          if (user.primary_color) {
             setPrimaryColorState(user.primary_color);
             localStorage.setItem('wexo-primary-color', user.primary_color);
          }
        } catch (err) {
          console.error('[ThemeSync] Init error:', err);
        }
      }
    };
    syncFromDB();
  }, []);

  const setMode = async (newMode: ThemeMode, sync: boolean = true) => {
    setModeState(newMode);
    localStorage.setItem('wexo-theme-mode', newMode);
    
    if (sync && pb.authStore.model?.id) {
      try {
        await pb.collection('users').update(pb.authStore.model.id, {
          theme_mode: newMode
        });
      } catch (err) {
        console.error('[ThemeSync] Update mode error:', err);
      }
    }
  };

  const setPrimaryColor = async (color: string, sync: boolean = true) => {
    setPrimaryColorState(color);
    localStorage.setItem('wexo-primary-color', color);
    
    if (sync && pb.authStore.model?.id) {
      try {
        await pb.collection('users').update(pb.authStore.model.id, {
          primary_color: color
        });
      } catch (err) {
        console.error('[ThemeSync] Update color error:', err);
      }
    }
  };

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    // Version foncée
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--primary-color-dark', `rgba(${r}, ${g}, ${b}, 0.2)`);
  }, [primaryColor]);

  return (
    <ThemeContext.Provider value={{ mode, primaryColor, setMode, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
