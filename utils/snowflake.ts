
/**
 * Snowflake ID Generator (Discord-style)
 * Generates a 64-bit unique numeric ID as a string.
 */
export const generateSnowflake = (): string => {
  // Custom epoch: March 6, 2024 (1709712000000)
  const EPOCH = 1709712000000n;
  const now = BigInt(Date.now());
  const timestamp = now - EPOCH;
  
  // 5 bits for worker ID, 5 bits for process ID (mocked for frontend)
  const workerId = BigInt(Math.floor(Math.random() * 32)) & 0x1Fn;
  const processId = BigInt(Math.floor(Math.random() * 32)) & 0x1Fn;
  
  // 12 bits for sequence (randomized for frontend simplicity)
  const sequence = BigInt(Math.floor(Math.random() * 4096)) & 0xFFFn;
  
  // Construct the 64-bit ID
  // (timestamp << 22) | (workerId << 17) | (processId << 12) | sequence
  const snowflake = (timestamp << 22n) | (workerId << 17n) | (processId << 12n) | sequence;
  
  return snowflake.toString();
};
