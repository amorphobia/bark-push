/**
 * Message ID generation utilities
 */

/**
 * Generate a unique message ID for push notifications
 * Uses timestamp in base-36 + random suffix for compactness and uniqueness
 * @returns Unique message ID (~19 characters)
 */
export function generateMessageId(): string {
  // timestamp in base-36 (~13 chars) + 6 random alphanumeric chars
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`;
}
