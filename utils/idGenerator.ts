
/**
 * Generates a snowflake-like numeric ID (string) similar to Discord IDs.
 * Format: 1337690693627412484
 */
export const generateNumericId = (): string => {
  // Epoch for Wexo (e.g., April 1, 2024)
  const WEXO_EPOCH = 1711929600000;
  const now = Date.now();
  const timestamp = BigInt(now - WEXO_EPOCH);
  
  // 42 bits for timestamp (approx 139 years)
  // 10 bits for worker/process ID (simulated here)
  // 12 bits for sequence (simulated here)
  
  const workerId = BigInt(Math.floor(Math.random() * 1024));
  const sequence = BigInt(Math.floor(Math.random() * 4096));
  
  const id = (timestamp << 22n) | (workerId << 12n) | sequence;
  
  return id.toString();
};
