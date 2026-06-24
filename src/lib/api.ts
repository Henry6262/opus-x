import {
  PONZINOMICS_API_URL,
  HARDCODED_PONZINOMICS_API_URL,
  HARDCODED_PONZINOMICS_WS_URL,
  HARDCODED_MODE,
} from "./config";

/**
 * Build a fully-qualified Ponzinomics API URL.
 */
export function buildPonzinomicsApiUrl(path = ""): URL {
  const root = (HARDCODED_MODE ? HARDCODED_PONZINOMICS_API_URL : PONZINOMICS_API_URL).replace(
    /\/$/,
    ""
  );
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${root}${normalizedPath}`;

  if (/^https?:\/\//.test(url)) {
    return new URL(url);
  }

  if (typeof window !== "undefined") {
    return new URL(url, window.location.href);
  }

  throw new Error(`Cannot build relative Ponzinomics URL on server: ${url}`);
}

/**
 * Build a WebSocket URL for Ponzinomics real-time streams.
 */
export function buildPonzinomicsWsUrl(directUrl?: string | null): string {
  if (directUrl) return directUrl;
  if (HARDCODED_MODE) return HARDCODED_PONZINOMICS_WS_URL;

  const envUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PONZINOMICS_WS_URL) || null;
  if (envUrl) return envUrl;

  const apiUrl = buildPonzinomicsApiUrl();
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${apiUrl.host}`;
}
