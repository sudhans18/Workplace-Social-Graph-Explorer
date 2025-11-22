import express from 'express';
import { addMessage } from '../store/messagesStore.js';
import { normalizeZohoEvent } from '../utils/normalizeZohoEvent.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/webhook/test', (req, res) => {
  res.json({ status: 'webhook alive' });
});

router.post('/webhook/cliq', (req, res) => {
  const payload = req.body || {};
  const eventType = payload.event_type;

  log('Received /webhook/cliq request', { eventType });

  if (eventType !== 'message_created' && eventType !== 'reaction_added') {
    log('Ignoring unsupported Zoho event_type', eventType);
    return res.json({ status: 'ignored' });
  }

  const normalized = normalizeZohoEvent(payload);

  if (!normalized) {
    log('Invalid Zoho webhook payload, missing required fields');
    return res.status(400).json({ status: 'error', error: 'invalid_payload' });
  }

  addMessage(normalized);
  log('Stored normalized Zoho event', { messageId: normalized.message_id });

  return res.json({ status: 'ok', event: 'processed' });
});

export default router;
