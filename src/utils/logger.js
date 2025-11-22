export function log(...args) {
  if (process.env.LOG_LEVEL === 'silent') {
    return;
  }
  // Default and non-silent levels both log for now (debug-style logging).
  // LOG_LEVEL can be extended later for more granularity.
  console.log('[LOG]', ...args);
}
