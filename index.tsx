import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './src/context/ThemeContext';

// Diagnostic logger for production debugging
const logToApp = (message: string, level: string = 'INFO', details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[Wixo][${level}][${timestamp}] ${message}`, details || '');
  
  if (typeof window !== 'undefined') {
    // Show on screen for absolute debug
    const debugEl = document.getElementById('debug-log');
    if (debugEl) {
      debugEl.innerText = `[${level}] ${message}`;
    }

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor && (window as any).Capacitor.getPlatform && (window as any).Capacitor.getPlatform() !== 'web';
    const logUrl = isNative ? 'https://ais-dev-nizjo4pthywqbpbexbhx6d-28700408353.europe-west2.run.app/api/log' : '/api/log';

    fetch(logUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level, details, timestamp })
    }).catch(() => {});
  }
};

logToApp('Démarrage de l\'initialisation React...', 'BOOT');

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logToApp('ERREUR_CRITIQUE_RUNTIME', 'ERROR', { 
      message: error.message, 
      stack: error.stack,
      componentStack: errorInfo.componentStack 
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          color: 'white', 
          padding: '40px', 
          background: '#0f0f0f', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          zIndex: 99999
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '20px' }}>Oups ! Wixo a rencontré un problème.</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>Une erreur critique est survenue dans l'interface.</p>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '15px', 
            borderRadius: '12px', 
            textAlign: 'left', 
            maxWidth: '90%', 
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px'
          }}>
            <pre style={{ fontSize: '10px', color: '#f87171', whiteSpace: 'pre-wrap' }}>{this.state.error?.stack || String(this.state.error)}</pre>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 20px',
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '11px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Réessayer
            </button>
            <button 
              onClick={() => {
                 if (confirm('Voulez-vous effacer le cache et recharger ?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                 }
              }}
              style={{
                padding: '12px 20px',
                background: '#333',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '11px',
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              Vider le cache
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const initializeApp = () => {
  logToApp('Recherche de l\'élément racine...', 'BOOT');
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    logToApp('Élément racine #root introuvable !', 'FATAL');
    return;
  }

  try {
    logToApp('Création du root React...', 'BOOT');
    const root = ReactDOM.createRoot(rootElement);
    
    logToApp('Lancement du render...', 'BOOT');
    root.render(
      <React.StrictMode>
        <ThemeProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeProvider>
      </React.StrictMode>
    );
    
    (window as any).__APP_MOUNTED__ = true;
    logToApp('Application montée avec succès.', 'SUCCESS');
  } catch (err: any) {
    logToApp('CRASH_INITIAL_RENDER', 'ERROR', {
      message: err.message,
      stack: err.stack
    });
    
    rootElement.innerHTML = `
      <div style="color:white; background:#0f0f0f; height:100vh; padding:40px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <h1 style="color:#ef4444;">ECHEC_DU_RENDU</h1>
        <p style="font-size:12px; color:#94a3b8; max-width:80%; margin:20px 0;">L'application n'a pas pu démarrer le moteur de rendu.</p>
        <div style="background:#1a1a1a; padding:15px; border-radius:8px; text-align:left; border:1px solid #333; overflow:auto; max-width:90%;">
          <pre style="color:#f87171; font-size:10px;">${err?.stack || String(err)}</pre>
        </div>
        <button onclick="window.location.reload()" style="margin-top:20px; padding:12px 24px; background:white; color:black; border:none; border-radius:8px; font-weight:bold;">RECHARGER</button>
      </div>
    `;
  }
};

// Vérifier si App est bien importé (évite les erreurs de bundle bizarres)
if (typeof App === 'undefined') {
  logToApp('Composant App non défini lors de l\'import !', 'FATAL');
  const root = document.getElementById('root');
  if (root) root.innerHTML = '<div style="color:red;padding:40px;">FATAL: App component is undefined. Check imports.</div>';
} else {
  initializeApp();
}
