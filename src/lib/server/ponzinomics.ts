export function getPonzinomicsApiBase() {
  return (
    process.env.NEXT_PUBLIC_PONZINOMICS_API_URL ||
    "https://ponzinomics-production.up.railway.app"
  );
}

export function getPonzinomicsApiKey() {
  const key = process.env.PONZINOMICS_API_KEY;
  if (!key) {
    throw new Error("PONZINOMICS_API_KEY is not configured");
  }
  return key;
}

export function getPonzinomicsProjectId() {
  const projectId = process.env.PONZINOMICS_PROJECT_ID;
  if (!projectId) {
    throw new Error("PONZINOMICS_PROJECT_ID is not configured");
  }
  return projectId;
}
