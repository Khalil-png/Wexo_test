import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[Wexo] Mounting React App...');

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
    (window as any).__APP_MOUNTED__ = true;
    console.log('[Wexo] Render successful');
  } catch (err) {
    console.error('[Wexo] Render error:', err);
    rootElement.innerHTML = `<div style="color:red;padding:20px;">REACT_RENDER_ERROR: ${err instanceof Error ? err.message : String(err)}</div>`;
  }
} else {
  console.error('[Wexo] Root element not found');
}
