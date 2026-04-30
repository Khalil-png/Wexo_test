
/**
 * Snowflake ID Generator (Discord-style)
 * Generates a 64-bit unique numeric ID as a string.
 * Optimized for compatibility without using BigInt literals (e.g. 123n).
 */
export const generateSnowflake = (): string => {
  try {
    // Custom epoch: March 6, 2024 (1709712000000)
    const EPOCH = BigInt("1709712000000");
    const now = BigInt(Date.now());
    const timestamp = now - EPOCH;
    
    // 5 bits for worker ID, 5 bits for process ID (mocked for frontend)
    const workerId = BigInt(Math.floor(Math.random() * 32)) & BigInt(0x1F);
    const processId = BigInt(Math.floor(Math.random() * 32)) & BigInt(0x1F);
    
    // 12 bits for sequence (randomized for frontend simplicity)
    const sequence = BigInt(Math.floor(Math.random() * 4096)) & BigInt(0xFFF);
    
    // Construct the 64-bit ID using BigInt operations
    const snowflake = (timestamp << BigInt(22)) | (workerId << BigInt(17)) | (processId << BigInt(12)) | sequence;
    
    return snowflake.toString();
  } catch (e) {
    // Fallback if BigInt is not supported at all
    console.warn('[Snowflake] BigInt not supported, using fallback ID');
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
};
