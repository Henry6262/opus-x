import { DEVPRNT_CORE_URL } from "@/lib/config";

const API_ROOT = DEVPRNT_CORE_URL.replace(/\/$/, "");

export function buildDevprntWsUrl(path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const wsBase = API_ROOT.startsWith("https://")
    ? API_ROOT.replace("https://", "wss://")
    : API_ROOT.replace("http://", "ws://");
  return `${wsBase}${normalizedPath}`;
}

export function buildDevprntApiUrl(path = ""): URL {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${API_ROOT}${normalizedPath}`);
}
