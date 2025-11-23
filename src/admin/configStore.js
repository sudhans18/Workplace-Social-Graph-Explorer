import { log } from '../utils/logger.js';

/**
 * In-memory admin configuration store
 */
let adminConfig = {
  ignoredChannels: [],      // channel_ids to ignore in analysis
  anonymizeUsers: false,    // if true, replace user ids with anon labels in graph/insights
  retentionDays: null,      // if set, delete raw messages older than this many days
};

/**
 * Get the current admin configuration
 * @returns {Object} Current admin config (shallow copy)
 */
export function getAdminConfig() {
  return { ...adminConfig };
}

/**
 * Update admin configuration with a patch
 * Validates types and only allows known fields
 * @param {Object} patch - Partial config object to merge
 * @returns {Object} Updated config
 */
export function updateAdminConfig(patch) {
  if (!patch || typeof patch !== 'object') {
    throw new Error('Invalid config payload: must be an object');
  }

  const updated = { ...adminConfig };

  // Validate and update ignoredChannels
  if ('ignoredChannels' in patch) {
    if (!Array.isArray(patch.ignoredChannels)) {
      throw new Error('Invalid config: ignoredChannels must be an array');
    }
    // Ensure all items are strings
    if (!patch.ignoredChannels.every(item => typeof item === 'string')) {
      throw new Error('Invalid config: ignoredChannels must be an array of strings');
    }
    updated.ignoredChannels = [...patch.ignoredChannels];
    log('Admin config: updated ignoredChannels', { count: updated.ignoredChannels.length });
  }

  // Validate and update anonymizeUsers
  if ('anonymizeUsers' in patch) {
    if (typeof patch.anonymizeUsers !== 'boolean') {
      throw new Error('Invalid config: anonymizeUsers must be a boolean');
    }
    updated.anonymizeUsers = patch.anonymizeUsers;
    log('Admin config: updated anonymizeUsers', { value: updated.anonymizeUsers });
  }

  // Validate and update retentionDays
  if ('retentionDays' in patch) {
    if (patch.retentionDays !== null && (typeof patch.retentionDays !== 'number' || patch.retentionDays < 1)) {
      throw new Error('Invalid config: retentionDays must be null or a positive number');
    }
    updated.retentionDays = patch.retentionDays;
    log('Admin config: updated retentionDays', { value: updated.retentionDays });
  }

  adminConfig = updated;
  log('Admin config updated', adminConfig);
  
  return { ...adminConfig };
}

/**
 * Reset config to defaults (for testing)
 */
export function resetAdminConfig() {
  adminConfig = {
    ignoredChannels: [],
    anonymizeUsers: false,
    retentionDays: null,
  };
  log('Admin config reset to defaults');
}


