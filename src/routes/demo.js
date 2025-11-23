import express from 'express';
import { 
  clearMessagesStore, 
  seedDemoScenario, 
  listAvailableScenarios 
} from '../demo/demoSeeder.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /demo/scenarios
 * Returns list of available demo scenarios
 */
router.get('/scenarios', (req, res) => {
  try {
    const scenarios = listAvailableScenarios();
    return res.json({
      status: 'ok',
      scenarios,
    });
  } catch (err) {
    log('Error listing demo scenarios', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to list scenarios',
    });
  }
});

/**
 * POST /demo/seed
 * Seeds a demo scenario
 * Body: { scenario: string, clearExisting?: boolean }
 */
router.post('/seed', (req, res) => {
  try {
    const { scenario, clearExisting = false } = req.body || {};
    
    if (!scenario || typeof scenario !== 'string') {
      const available = listAvailableScenarios();
      return res.status(400).json({
        status: 'error',
        reason: 'Unknown or missing scenario',
        availableScenarios: available,
      });
    }
    
    // Clear existing messages if requested
    if (clearExisting) {
      const cleared = clearMessagesStore();
      log('Demo: cleared existing messages before seeding', { cleared });
    }
    
    // Seed the scenario
    const seeded = seedDemoScenario(scenario);
    
    return res.json({
      status: 'ok',
      seeded,
    });
  } catch (err) {
    log('Error seeding demo scenario', err?.message || err);
    const available = listAvailableScenarios();
    
    // Check if it's a known scenario error
    if (err.message.includes('Unknown scenario')) {
      return res.status(400).json({
        status: 'error',
        reason: err.message,
        availableScenarios: available,
      });
    }
    
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to seed scenario',
      availableScenarios: available,
    });
  }
});

/**
 * POST /demo/clear
 * Clears all messages from the store
 */
router.post('/clear', (req, res) => {
  try {
    const cleared = clearMessagesStore();
    return res.json({
      status: 'ok',
      cleared,
    });
  } catch (err) {
    log('Error clearing messages', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Failed to clear messages',
    });
  }
});

export default router;

