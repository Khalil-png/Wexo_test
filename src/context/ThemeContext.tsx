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

const THEME_COLORS: Record<string, string> = {
  'bleu': '#0b57ff',
  'rouge': '#fc0944',
  'rose': '#ec4899',
  'vert': '#03bf54',
  'vert foncé': '#0da300',
  'orange': '#bc5617',
  'violet': '#8b5cf6',
};

const DEFAULT_COLOR = '#0b57ff';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('wexo-theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  const [primaryColor, setPrimaryColorState] = useState(() => {
    const saved = localStorage.getItem('wexo-primary-color');
    // Support des noms de couleurs stockés en local
    if (saved && THEME_COLORS[saved]) return THEME_COLORS[saved];
    // Migration vers le nouveau bleu par défaut
    if (saved === '#3b82f6' || saved === '#0040ff') return DEFAULT_COLOR;
    return saved || DEFAULT_COLOR;
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
        console.log('[ThemeSync] Synchronisation avec le serveur...');
        // Initial sync - On force la récupération du profil frais
        const user = await pb.collection('users').getOne(userId, { '$autoCancel': false });
        
        // Mode
        if (user.theme_mode && user.theme_mode !== modeRef.current) {
          console.log('[ThemeSync] Mode mis à jour depuis le serveur:', user.theme_mode);
          setModeState(user.theme_mode as ThemeMode);
          localStorage.setItem('wexo-theme-mode', user.theme_mode);
        }
        
        // Couleur - Support des noms de couleurs
        if (user.primary_color) {
          const serverColor = THEME_COLORS[user.primary_color] || user.primary_color;
          if (serverColor !== colorRef.current) {
            console.log('[ThemeSync] Couleur mise à jour depuis le serveur:', user.primary_color);
            setPrimaryColorState(serverColor);
            localStorage.setItem('wexo-primary-color', serverColor);
          }
        }

        // Real-time subscription - Pour que PC et Mobile se mettent à jour INSTANTANÉMENT
        unsubscribe = await pb.collection('users').subscribe(userId, (e) => {
          if (e.action === 'update') {
            const data = e.record;
            if (data.theme_mode && data.theme_mode !== modeRef.current) {
              setModeState(data.theme_mode as ThemeMode);
              localStorage.setItem('wexo-theme-mode', data.theme_mode);
            }
            if (data.primary_color) {
              const liveColor = THEME_COLORS[data.primary_color] || data.primary_color;
              if (liveColor !== colorRef.current) {
                setPrimaryColorState(liveColor);
                localStorage.setItem('wexo-primary-color', liveColor);
              }
            }
          }
        }, { '$autoCancel': false });
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

    // Initial check - Très important au démarrage
    if (pb.authStore.model?.id) {
      syncAndSubscribe(pb.authStore.model.id);
    } else {
      // Si pas encore d'ID mais qu'on a un token (cas rare au boot)
      const model = pb.authStore.model;
      if (model?.id) syncAndSubscribe(model.id);
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
    // Si c'est un hex, on cherche le nom correspondant
    let colorToSave = color;
    Object.entries(THEME_COLORS).forEach(([name, hex]) => {
      if (hex.toLowerCase() === color.toLowerCase()) colorToSave = name;
    });

    console.log('[ThemeSync] Enregistrement de la couleur:', colorToSave);
    setPrimaryColorState(color);
    localStorage.setItem('wexo-primary-color', color);
    
    if (sync && pb.authStore.model?.id) {
      try {
        // On enregistre le NOM de la couleur sur le serveur comme demandé
        await pb.collection('users').update(pb.authStore.model.id, {
          primary_color: colorToSave
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
