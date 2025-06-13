export const EPOCH = 1620000000n; // Set the custom epoch (start timestamp)

let lastTimestamp = 0n; // Initialize the last timestamp

/**
 *
 * @param type u - user | c - channel | g - guild | m - message
 * @returns snowflake id
 */
export const generateSnowflakeID = (type: "u" | "c" | "g" | "m"): string => {
  const timestamp = getTimestamp();
  // Set the worker ID (if applicable)
  const workerID = 0n;
  // Set the sequence number (if applicable)
  const sequenceNumber = 0n;
  const randomBits = getRandomBits();
  // Adjust timestamp to the left by 22 bits
  const timestampBits = (timestamp - EPOCH) << 22n;
  // Adjust worker ID to the left by 17 bits
  const workerIDBits = workerID << 17n;
  // Adjust sequence number to the left by 12 bits
  const sequenceNumberBits = sequenceNumber << 12n;

  const snowflakeID = (
    timestampBits |
    workerIDBits |
    sequenceNumberBits |
    randomBits
  ).toString();

  return type + snowflakeID;
};

export const getTimestampFromSnowflakeID = (snowflakeID: string): bigint => {
  try {
    // Extract timestamp bits by shifting right by 22 bits
    const timestampBits = BigInt(snowflakeID.slice(1)) >> 22n; //remove the 1st character - as it is an Identifier (check README)
    // Add epoch to get the actual timestamp and send
    return timestampBits + EPOCH;
  } catch {
    return 0n;
  }
};

const getTimestamp = (): bigint => {
  // Get the current timestamp in seconds
  let timestamp = BigInt(Math.floor(Date.now() / 1000));

  // Ensure the timestamp is always greater than or equal to the previous timestamp
  if (timestamp <= lastTimestamp) {
    timestamp = 2n * lastTimestamp - timestamp;
  }

  lastTimestamp = timestamp;

  return timestamp;
};

const getRandomBits = (): bigint => {
  // Generate a random number between 0 and 4095 (12 bits)
  const random = BigInt(Math.floor(Math.random() * 4096));
  return random;
};
