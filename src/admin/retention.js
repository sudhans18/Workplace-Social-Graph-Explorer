import { log } from '../utils/logger.js';

/**
 * Apply retention policy to messages
 * Removes messages older than the specified number of days
 * @param {Array} messages - Array of message objects
 * @param {number|null} retentionDays - Number of days to retain, or null to keep all
 * @returns {Object} Object with filtered messages and count of removed messages
 */
export function applyRetentionPolicy(messages, retentionDays) {
  if (!Array.isArray(messages)) {
    log('Retention: invalid messages array');
    return { filteredMessages: [], removedCount: 0 };
  }
  
  if (retentionDays === null || retentionDays === undefined) {
    // No retention policy, return all messages
    return { filteredMessages: messages, removedCount: 0 };
  }
  
  if (typeof retentionDays !== 'number' || retentionDays < 1) {
    log('Retention: invalid retentionDays value', { retentionDays });
    return { filteredMessages: messages, removedCount: 0 };
  }
  
  const now = Date.now(); // milliseconds
  const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);
  
  const filteredMessages = [];
  let removedCount = 0;
  
  // Helper to normalize timestamp to milliseconds
  // Zoho Cliq typically sends timestamps in seconds (Unix timestamp)
  // But we need to handle both seconds and milliseconds
  const normalizeTimestamp = (timestamp) => {
    const num = typeof timestamp === 'string' 
      ? parseInt(timestamp, 10) 
      : timestamp;
    
    if (isNaN(num)) {
      return null;
    }
    
    // If timestamp is less than year 2001 in milliseconds (1000000000000),
    // it's likely in seconds, so convert to milliseconds
    if (num < 1000000000000) {
      return num * 1000; // Convert seconds to milliseconds
    }
    
    // Otherwise assume it's already in milliseconds
    return num;
  };
  
  for (const message of messages) {
    if (!message || !message.timestamp) {
      // Messages without timestamp are kept (shouldn't happen normally)
      filteredMessages.push(message);
      continue;
    }
    
    // Normalize timestamp to milliseconds
    const messageTime = normalizeTimestamp(message.timestamp);
    
    if (messageTime === null) {
      // Invalid timestamp, keep the message but log warning
      log('Retention: message with invalid timestamp', { 
        messageId: message.message_id,
        timestamp: message.timestamp 
      });
      filteredMessages.push(message);
      continue;
    }
    
    // Compare in milliseconds
    if (messageTime >= cutoffTime) {
      // Message is within retention period
      filteredMessages.push(message);
    } else {
      // Message is too old, remove it
      removedCount++;
    }
  }
  
  if (removedCount > 0 || retentionDays !== null) {
    log('Retention: applied retention policy', {
      retentionDays,
      totalMessages: messages.length,
      removedCount,
      remainingMessages: filteredMessages.length,
      now: new Date(now).toISOString(),
      cutoffTime: new Date(cutoffTime).toISOString(),
    });
  }
  
  return { filteredMessages, removedCount };
}


