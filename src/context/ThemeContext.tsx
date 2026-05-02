import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  primaryColor: string;
  setMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('wexo-theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    const saved = localStorage.getItem('wexo-primary-color');
    return saved || '#3b82f6'; // Bleu par défaut (Tailwind blue-500)
  });

  useEffect(() => {
    localStorage.setItem('wexo-theme-mode', mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('wexo-primary-color', primaryColor);
    // On met à jour une variable CSS pour l'utiliser partout
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    // Calcul d'une version plus sombre pour les bulles etc
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
