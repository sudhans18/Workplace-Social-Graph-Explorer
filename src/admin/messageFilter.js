import { getAdminConfig } from './configStore.js';
import { applyRetentionPolicy } from './retention.js';
import { log } from '../utils/logger.js';

/**
 * Filter messages based on admin configuration (ignored channels)
 * @param {Array} messages - Array of message objects
 * @param {Array<string>} ignoredChannels - Array of channel IDs to ignore
 * @returns {Array} Filtered messages
 */
function filterIgnoredChannels(messages, ignoredChannels) {
  if (!Array.isArray(ignoredChannels) || ignoredChannels.length === 0) {
    return messages;
  }
  
  if (!Array.isArray(messages)) {
    return [];
  }
  
  const ignoredSet = new Set(ignoredChannels.map(id => String(id)));
  const filtered = messages.filter(message => {
    if (!message || !message.channel_id) {
      return true; // Keep messages without channel_id
    }
    return !ignoredSet.has(String(message.channel_id));
  });
  
  const removedCount = messages.length - filtered.length;
  if (removedCount > 0) {
    log('Message filter: filtered ignored channels', {
      ignoredChannels: ignoredChannels.length,
      removedCount,
      remainingCount: filtered.length,
    });
  }
  
  return filtered;
}

/**
 * Get filtered and processed messages based on admin configuration
 * Applies:
 * 1. Retention policy (if configured)
 * 2. Ignored channels filtering
 * 
 * Note: This returns a filtered copy, it does NOT modify the original messages array
 * @param {Array} messages - Array of message objects
 * @returns {Array} Filtered and processed messages
 */
export function getFilteredMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  
  const config = getAdminConfig();
  
  // Step 1: Apply retention policy
  let processedMessages = messages;
  if (config.retentionDays !== null) {
    const retentionResult = applyRetentionPolicy(messages, config.retentionDays);
    processedMessages = retentionResult.filteredMessages;
  }
  
  // Step 2: Filter ignored channels
  processedMessages = filterIgnoredChannels(processedMessages, config.ignoredChannels);
  
  return processedMessages;
}

/**
 * Extract all unique user IDs from messages
 * @param {Array} messages - Array of message objects
 * @returns {Array<string>} Array of unique user IDs
 */
export function extractUserIds(messages) {
  const userIds = new Set();
  
  if (!Array.isArray(messages)) {
    return [];
  }
  
  for (const message of messages) {
    if (!message) continue;
    
    // Add sender_id
    if (message.sender_id) {
      userIds.add(String(message.sender_id));
    }
    
    // Add mentioned users
    if (Array.isArray(message.mentions)) {
      for (const mention of message.mentions) {
        if (mention) {
          userIds.add(String(mention));
        }
      }
    }
    
    // Add reaction users
    if (Array.isArray(message.reactions)) {
      for (const reaction of message.reactions) {
        if (reaction && reaction.user_id) {
          userIds.add(String(reaction.user_id));
        }
      }
    }
  }
  
  return Array.from(userIds);
}


