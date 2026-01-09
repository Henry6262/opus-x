import { PONZINOMICS_API_URL } from "@/lib/config";

const API_ROOT = PONZINOMICS_API_URL.replace(/\/$/, "");

export function buildApiUrl(path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${normalizedPath}`;
}

export function buildWsUrl(path = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const wsBase = API_ROOT.startsWith("https://")
    ? API_ROOT.replace("https://", "wss://")
    : API_ROOT.replace("http://", "ws://");
  return `${wsBase}${normalizedPath}`;
}
