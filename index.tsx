import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Diagnostic logger for production debugging
const logToApp = (message: string, level: string = 'INFO', details?: any) => {
  console.log(`[Wexo][${level}] ${message}`, details || '');
  // Skip call if we are not in browser
  if (typeof window !== 'undefined') {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, level, details })
    }).catch(() => {});
  }
};

logToApp('Mounting React App...', 'BOOT');

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logToApp('CRITICAL_RUNTIME_ERROR', 'ERROR', { 
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
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '10px' }}>Oups ! Wexo a rencontré un problème.</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Une erreur critique est survenue lors du chargement.</p>
          <div style={{ 
            background: '#1a1a1a', 
            padding: '20px', 
            borderRadius: '12px', 
            textAlign: 'left', 
            maxWidth: '90%', 
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <pre style={{ fontSize: '10px', color: '#f87171' }}>{this.state.error?.stack || String(this.state.error)}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '30px',
              padding: '12px 24px',
              background: 'white',
              color: 'black',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  (window as any).__APP_MOUNTED__ = true;
} else {
  console.error('[Wexo] Root element not found');
}
