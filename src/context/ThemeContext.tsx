import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
    // Migration vers le nouveau bleu par défaut
    if (saved === '#3b82f6' || saved === '#0040ff') return '#0b57ff';
    return saved || '#0b57ff';
  });

  const modeRef = useRef(mode);
  const colorRef = useRef(primaryColor);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    colorRef.current = primaryColor;
  }, [primaryColor]);

  // Sync from DB and subscribe to changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const syncAndSubscribe = async (userId: string) => {
      try {
        // Initial sync
        const user = await pb.collection('users').getOne(userId);
        if (user.theme_mode && user.theme_mode !== modeRef.current) {
          setModeState(user.theme_mode as ThemeMode);
          localStorage.setItem('wexo-theme-mode', user.theme_mode);
        }
        if (user.primary_color && user.primary_color !== colorRef.current) {
          setPrimaryColorState(user.primary_color);
          localStorage.setItem('wexo-primary-color', user.primary_color);
        }

        // Real-time subscription
        unsubscribe = await pb.collection('users').subscribe(userId, (e) => {
          if (e.action === 'update') {
            const data = e.record;
            if (data.theme_mode && data.theme_mode !== modeRef.current) {
              setModeState(data.theme_mode as ThemeMode);
              localStorage.setItem('wexo-theme-mode', data.theme_mode);
            }
            if (data.primary_color && data.primary_color !== colorRef.current) {
              setPrimaryColorState(data.primary_color);
              localStorage.setItem('wexo-primary-color', data.primary_color);
            }
          }
        });
      } catch (err) {
        console.error('[ThemeSync] Sync error:', err);
      }
    };

    // Watch auth changes
    const handleAuthChange = (token: string, model: any) => {
      if (model?.id) {
        syncAndSubscribe(model.id);
      } else {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = undefined;
        }
      }
    };

    // Initial check
    if (pb.authStore.model?.id) {
      syncAndSubscribe(pb.authStore.model.id);
    }

    const unbindAuth = pb.authStore.onChange(handleAuthChange);

    return () => {
      unbindAuth();
      if (unsubscribe) unsubscribe();
    };
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
