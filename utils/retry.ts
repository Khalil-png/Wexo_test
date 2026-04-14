
/**
 * Utility to retry a function that returns a promise
 */
export async function retry<T>(
  fn: () => Promise<T> | PromiseLike<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await (fn() as Promise<T>);
    } catch (error: any) {
      lastError = error;
      const isNetworkError = 
        error.message === 'Failed to fetch' || 
        error.name === 'TypeError' ||
        error.status === 0 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504;
        
      if (!isNetworkError || attempt === maxAttempts) {
        throw error;
      }
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
    }
  }
  
  throw lastError;
}
