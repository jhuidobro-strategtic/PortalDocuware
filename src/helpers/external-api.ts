import config from "../config";

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

const buildExternalUrl = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
};

const buildFactilizaUrl = (path: string) =>
  buildExternalUrl(config.services.factiliza.API_URL, path);

const buildSunatUrl = (path: string) =>
  buildExternalUrl(config.services.sunat.API_URL, path);

const getFactilizaToken = () => config.services.factiliza.TOKEN;
const getSunatToken = () => config.services.sunat.TOKEN;

export { buildFactilizaUrl, buildSunatUrl, getFactilizaToken, getSunatToken };
