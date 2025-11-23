import express from 'express';
import { messages } from '../store/messagesStore.js';
import { getAdminConfig, updateAdminConfig } from '../admin/configStore.js';
import { applyRetentionPolicy } from '../admin/retention.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /admin/config
 * Returns the current admin configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = getAdminConfig();
    return res.json({
      status: 'ok',
      config,
    });
  } catch (err) {
    log('Error getting admin config', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to retrieve admin config',
    });
  }
});

/**
 * PATCH /admin/config
 * Updates the admin configuration with a partial patch
 */
router.patch('/config', (req, res) => {
  try {
    const patch = req.body || {};
    
    // Validate that body is an object
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({
        status: 'error',
        reason: 'Invalid config payload: must be an object',
      });
    }
    
    // Update config
    const updatedConfig = updateAdminConfig(patch);
    
    return res.json({
      status: 'ok',
      config: updatedConfig,
    });
  } catch (err) {
    log('Error updating admin config', err?.message || err);
    return res.status(400).json({
      status: 'error',
      reason: err.message || 'Invalid config payload',
    });
  }
});

/**
 * POST /admin/clearMessages
 * Clears the in-memory message store (for demo/testing)
 */
router.post('/clearMessages', (req, res) => {
  try {
    const count = messages.length;
    
    // Clear the messages array
    messages.length = 0;
    
    log('Admin: cleared messages', { count });
    
    return res.json({
      status: 'ok',
      cleared: count,
    });
  } catch (err) {
    log('Error clearing messages', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to clear messages',
    });
  }
});

/**
 * POST /admin/applyRetention
 * Manually applies retention policy and removes old messages from store
 * This is useful for manual cleanup
 */
router.post('/applyRetention', (req, res) => {
  try {
    const config = getAdminConfig();
    
    if (config.retentionDays === null || config.retentionDays === undefined) {
      return res.json({
        status: 'ok',
        message: 'No retention policy configured',
        removed: 0,
        remaining: messages.length,
      });
    }
    
    // Apply retention policy
    const { filteredMessages, removedCount } = applyRetentionPolicy(messages, config.retentionDays);
    
    // Update the messages store
    messages.length = 0;
    messages.push(...filteredMessages);
    
    log('Admin: applied retention policy manually', {
      retentionDays: config.retentionDays,
      removed: removedCount,
      remaining: filteredMessages.length,
    });
    
    return res.json({
      status: 'ok',
      removed: removedCount,
      remaining: filteredMessages.length,
    });
  } catch (err) {
    log('Error applying retention policy', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to apply retention policy',
    });
  }
});

/**
 * POST /admin/debug/testMessage
 * Creates a test message with a specific timestamp for testing retention
 * Body: { channel_id: string, sender_id: string, timestamp?: number }
 */
router.post('/debug/testMessage', (req, res) => {
  try {
    const { channel_id, sender_id, timestamp } = req.body || {};
    
    if (!channel_id || !sender_id) {
      return res.status(400).json({
        status: 'error',
        reason: 'Missing required fields: channel_id, sender_id',
      });
    }
    
    // Use provided timestamp or current time
    const testTimestamp = timestamp !== undefined 
      ? String(timestamp)
      : String(Date.now());
    
    const testMessage = {
      message_id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel_id: String(channel_id),
      sender_id: String(sender_id),
      mentions: [],
      replies_to: null,
      reactions: [],
      timestamp: testTimestamp,
    };
    
    messages.push(testMessage);
    
    log('Admin: created test message', {
      message_id: testMessage.message_id,
      timestamp: testTimestamp,
      timestampDate: new Date(parseInt(testTimestamp, 10) < 1000000000000 ? parseInt(testTimestamp, 10) * 1000 : parseInt(testTimestamp, 10)).toISOString(),
    });
    
    return res.json({
      status: 'ok',
      message: testMessage,
      timestampInfo: {
        raw: testTimestamp,
        value: parseInt(testTimestamp, 10),
        normalized: parseInt(testTimestamp, 10) < 1000000000000 ? parseInt(testTimestamp, 10) * 1000 : parseInt(testTimestamp, 10),
        date: new Date(parseInt(testTimestamp, 10) < 1000000000000 ? parseInt(testTimestamp, 10) * 1000 : parseInt(testTimestamp, 10)).toISOString(),
      },
    });
  } catch (err) {
    log('Error creating test message', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to create test message',
    });
  }
});

/**
 * GET /admin/debug/messages
 * Debug endpoint to inspect messages and their timestamps
 */
router.get('/debug/messages', (req, res) => {
  try {
    const config = getAdminConfig();
    const now = Date.now();
    const cutoffTime = config.retentionDays !== null 
      ? now - (config.retentionDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Sample a few messages for debugging
    const sampleMessages = messages.slice(0, 10).map(msg => {
      if (!msg || !msg.timestamp) {
        return {
          message_id: msg?.message_id || 'unknown',
          timestamp: 'missing',
          timestampValue: null,
          normalizedTimestamp: null,
          date: null,
          wouldBeKept: true,
        };
      }
      
      // Normalize timestamp (same logic as retention.js)
      const num = typeof msg.timestamp === 'string' 
        ? parseInt(msg.timestamp, 10) 
        : msg.timestamp;
      
      let normalizedTimestamp = null;
      let date = null;
      let wouldBeKept = true;
      
      if (!isNaN(num)) {
        normalizedTimestamp = num < 1000000000000 ? num * 1000 : num;
        date = new Date(normalizedTimestamp).toISOString();
        
        if (cutoffTime !== null) {
          wouldBeKept = normalizedTimestamp >= cutoffTime;
        }
      }
      
      return {
        message_id: msg.message_id,
        channel_id: msg.channel_id,
        sender_id: msg.sender_id,
        timestamp: msg.timestamp,
        timestampValue: num,
        normalizedTimestamp,
        date,
        wouldBeKept,
        isOld: cutoffTime !== null && normalizedTimestamp !== null && normalizedTimestamp < cutoffTime,
      };
    });
    
    return res.json({
      status: 'ok',
      config: {
        retentionDays: config.retentionDays,
        ignoredChannels: config.ignoredChannels,
        anonymizeUsers: config.anonymizeUsers,
      },
      summary: {
        totalMessages: messages.length,
        now: new Date(now).toISOString(),
        cutoffTime: cutoffTime ? new Date(cutoffTime).toISOString() : null,
      },
      sampleMessages,
    });
  } catch (err) {
    log('Error in debug endpoint', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to get debug info',
    });
  }
});

export default router;

