
/**
 * Utility to check if we are in a native Capacitor environment
 */
export const isNative = () => {
  const cap = (window as any).Capacitor;
  return (cap && cap.getPlatform && cap.getPlatform() !== 'web') || (window as any).isNativeApp;
};

/**
 * Returns the correct API URL based on the environment (Web vs Native)
 */
export const getApiUrl = (path: string) => {
  if (isNative()) {
    // Replace with your production domain if different
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ais-dev-nizjo4pthywqbpbexbhx6d-28700408353.europe-west2.run.app';
    return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
};
