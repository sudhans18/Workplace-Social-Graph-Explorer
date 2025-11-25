import dotenv from 'dotenv';

import app from './app.js';
import { log } from './utils/logger.js';
import { getAppBaseUrl } from './utils/config.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  log(`[SERVER] Listening on port ${PORT}`);
  log('APP_BASE_URL', getAppBaseUrl());
});
