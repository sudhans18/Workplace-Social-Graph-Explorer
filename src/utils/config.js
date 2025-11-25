export function getAppBaseUrl() {
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, '');
  }

  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}
