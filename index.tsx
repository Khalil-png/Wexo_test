import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[Wexo] Mounting React App...');

console.log('[Wexo] --- BOOTSTRAP_START ---');
const rootElement = document.getElementById('root');
console.log('[Wexo] Root element found:', !!rootElement);

if (rootElement) {
  try {
    console.log('[Wexo] Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    console.log('[Wexo] Initializing render of <App />');
    root.render(<App />);
    (window as any).__APP_MOUNTED__ = true;
    console.log('[Wexo] Render call completed. App should mount soon.');
  } catch (err) {
    console.error('[Wexo] CRITICAL RENDER ERROR:', err);
    rootElement.innerHTML = `<div style="color:red;padding:20px;background:white;"><h1>REACT_RENDER_CRASH</h1><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
  }
} else {
  console.error('[Wexo] Root element not found');
}
