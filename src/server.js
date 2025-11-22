import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import webhookRouter from './routes/webhook.js';
import graphRouter from './routes/graph.js';
import insightsRouter from './routes/insights.js';
import { log } from './utils/logger.js';
import cliqCommandsRouter from './routes/cliqCommands.js';
import digestRouter from './routes/digest.js';
import { getAppBaseUrl } from './utils/config.js';

dotenv.config();

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'debug';
}

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use(webhookRouter);
app.use(graphRouter);
app.use(insightsRouter);
app.use('/cliq', cliqCommandsRouter);
app.use(digestRouter);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/', (req, res) => {
  res.send('Workplace Social Graph Explorer API is running.');
});

app.listen(PORT, () => {
  log(`Server listening on http://localhost:${PORT}`);
  log('APP_BASE_URL', getAppBaseUrl());
});
