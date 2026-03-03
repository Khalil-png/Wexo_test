
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Global error handling for network issues
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (event.reason.message === 'Failed to fetch' || event.reason.name === 'TypeError')) {
    console.warn('Network request failed. This is likely due to a blocked connection or a paused Supabase project.', event.reason);
  }
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
