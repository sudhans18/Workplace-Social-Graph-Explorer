// Main Express app shared across local development and deployment targets (Catalyst, Render, etc.).
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import webhookRouter from './routes/webhook.js';
import graphRouter from './routes/graph.js';
import insightsRouter from './routes/insights.js';
import cliqCommandsRouter from './routes/cliqCommands.js';
import digestRouter from './routes/digest.js';
import adminRouter from './routes/admin.js';
import demoRouter from './routes/demo.js';

dotenv.config();

if (!process.env.LOG_LEVEL) {
  process.env.LOG_LEVEL = 'debug';
}

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.use('/webhook', webhookRouter);
app.use(graphRouter);
app.use(insightsRouter);
app.use('/cliq', cliqCommandsRouter);
app.use(digestRouter);
app.use('/admin', adminRouter);
app.use('/demo', demoRouter);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/visualizer', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/', (req, res) => {
  res.send('Workplace Social Graph Explorer API is running.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
