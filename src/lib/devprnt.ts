import {
  DEVPRNT_CORE_URL,
  HARDCODED_DEVPRINT_CORE_URL,
  HARDCODED_DEVPRINT_WS_URL,
  HARDCODED_MODE,
} from "./config";
import { getHardcodedDevprintResponse } from "./hardcoded";

// Remove trailing slash from the active API root so joining paths is predictable.
const API_ROOT = (HARDCODED_MODE ? HARDCODED_DEVPRINT_CORE_URL : DEVPRNT_CORE_URL).replace(
  /\/$/,
  ""
);

/**
 * Build a fully-qualified DevPrint API URL.
 * In hardcoded mode this points to the hardcoded backend host so that absolute
 * URLs are always available, even on the server.
 */
export function buildDevprntApiUrl(path = ""): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_ROOT}${normalizedPath}`;

  if (/^https?:\/\//.test(url)) {
    return new URL(url);
  }

  if (typeof window !== "undefined") {
    return new URL(url, window.location.href);
  }

  throw new Error(`Cannot build relative DevPrint URL on server: ${url}`);
}

/**
 * Build a WebSocket URL for DevPrint real-time streams.
 * Falls back to the hardcoded WSS endpoint when hardcoded mode is enabled.
 */
export function buildDevprntWsUrl(directUrl?: string | null): string {
  if (directUrl) return directUrl;
  if (HARDCODED_MODE) return HARDCODED_DEVPRINT_WS_URL;

  const envUrl =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEVPRNT_WS_URL) ||
    null;
  if (envUrl) return envUrl;

  const apiUrl = buildDevprntApiUrl();
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${apiUrl.host}`;
}

/**
 * Fetch from the DevPrint API with hardcoded-mode support.
 *
 * When HARDCODED_MODE is true this returns mock data without making a network
 * request, which lets the dashboard render even when the backend is down or
 * returning 404s.
 *
 * Otherwise it performs a normal fetch and unwraps `{ data: ... }` responses.
 */
export async function fetchDevprintApi<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (HARDCODED_MODE) {
    const mock = getHardcodedDevprintResponse(path);
    if (mock !== undefined) {
      return mock as T;
    }
    throw new Error(`[hardcoded] No mock data defined for ${path}`);
  }

  const url = buildDevprntApiUrl(path);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (result && typeof result === "object" && "success" in result && result.success === false) {
    throw new Error(result.error || "Request failed");
  }

  // Unwrap `{ data: ... }` envelope when present, otherwise return the raw body.
  return (result && typeof result === "object" && "data" in result ? result.data : result) as T;
}

/**
 * Fetch the full DevPrint API response including the `{success, data}` envelope.
 *
 * Use this for endpoints where callers still expect the legacy wrapper shape.
 * In hardcoded mode the mock payload is automatically wrapped as
 * `{success: true, data: payload}`.
 */
export async function fetchDevprintResponse<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (HARDCODED_MODE) {
    const payload = getHardcodedDevprintResponse(path);
    if (payload !== undefined) {
      return { success: true, data: payload } as T;
    }
    throw new Error(`[hardcoded] No mock data defined for ${path}`);
  }

  const url = buildDevprntApiUrl(path);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}
