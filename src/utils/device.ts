
export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent.toLowerCase()
  );
};

export const isApp = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  // Common indicators for Electron or custom WebView wrappers
  return ua.includes('electron') || ua.includes('wixo-app') || (window as any).isNativeApp;
};
