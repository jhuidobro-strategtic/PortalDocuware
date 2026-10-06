import config from "../config";

const API_BASE_URL = config.api.API_URL.endsWith("/")
  ? config.api.API_URL
  : `${config.api.API_URL}/`;

const buildApiUrl = (path: string) => {
  let normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  if (API_BASE_URL.endsWith("/api/") && normalizedPath.startsWith("api/")) {
    normalizedPath = normalizedPath.slice(4);
  }
  return `${API_BASE_URL}${normalizedPath}`;
};

export { API_BASE_URL, buildApiUrl };
