import { brand } from "./brand";

export interface AgentDefinition {
  id: string;
  key: string;
  displayName: string;
  shortLabel: string;
  description: string;
  supportsVersioning: boolean;
  isDefault?: boolean;
}

interface AgentConfigInput {
  id?: string;
  key?: string;
  displayName?: string;
  shortLabel?: string;
  description?: string;
  supportsVersioning?: boolean;
  isDefault?: boolean;
}

const isDev = process.env.NODE_ENV !== "production";

const fallbackAgent: AgentDefinition = {
  id: process.env.NEXT_PUBLIC_DEFAULT_AGENT_ID || "router-core",
  key: process.env.NEXT_PUBLIC_DEFAULT_AGENT_KEY || "router-core",
  displayName: process.env.NEXT_PUBLIC_DEFAULT_AGENT_NAME || brand.productName,
  shortLabel: process.env.NEXT_PUBLIC_DEFAULT_AGENT_SHORT_LABEL || "CORE",
  description:
    process.env.NEXT_PUBLIC_DEFAULT_AGENT_DESCRIPTION ||
    "Primary market-routing agent",
  supportsVersioning: true,
  isDefault: true,
};

function warnInvalidRegistry(message: string, details?: unknown): void {
  if (!isDev) {
    return;
  }

  console.warn(`[agents] ${message}`, details ?? "");
}

function normalizeAgent(
  input: AgentConfigInput,
  index: number
): AgentDefinition | null {
  const id = input.id?.trim();
  const key = input.key?.trim();
  const displayName = input.displayName?.trim();

  if (!id || !key || !displayName) {
    warnInvalidRegistry("Skipping invalid agent entry", { index, input });
    return null;
  }

  return {
    id,
    key,
    displayName,
    shortLabel: input.shortLabel?.trim() || displayName.slice(0, 10).toUpperCase(),
    description: input.description?.trim() || `${displayName} agent`,
    supportsVersioning: input.supportsVersioning ?? true,
    isDefault: input.isDefault ?? false,
  };
}

function finalizeRegistry(entries: AgentDefinition[]): AgentDefinition[] {
  if (entries.length === 0) {
    return [fallbackAgent];
  }

  const uniqueAgents: AgentDefinition[] = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  for (const agent of entries) {
    if (seenIds.has(agent.id) || seenKeys.has(agent.key)) {
      warnInvalidRegistry("Skipping duplicate agent entry", {
        id: agent.id,
        key: agent.key,
      });
      continue;
    }

    seenIds.add(agent.id);
    seenKeys.add(agent.key);
    uniqueAgents.push(agent);
  }

  if (uniqueAgents.length === 0) {
    return [fallbackAgent];
  }

  const defaultIndex = uniqueAgents.findIndex((agent) => agent.isDefault);
  const normalizedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;

  return uniqueAgents.map((agent, index) => ({
    ...agent,
    isDefault: index === normalizedDefaultIndex,
  }));
}

function parseAgentRegistry(rawRegistry?: string): AgentDefinition[] {
  if (!rawRegistry?.trim()) {
    return [fallbackAgent];
  }

  try {
    const parsed = JSON.parse(rawRegistry) as unknown;
    if (!Array.isArray(parsed)) {
      warnInvalidRegistry("NEXT_PUBLIC_AGENT_REGISTRY must be a JSON array");
      return [fallbackAgent];
    }

    const normalized = parsed
      .map((entry, index) =>
        normalizeAgent((entry ?? {}) as AgentConfigInput, index)
      )
      .filter((entry): entry is AgentDefinition => entry !== null);

    return finalizeRegistry(normalized);
  } catch (error) {
    warnInvalidRegistry("Failed to parse NEXT_PUBLIC_AGENT_REGISTRY", error);
    return [fallbackAgent];
  }
}

export const agentRegistry = parseAgentRegistry(
  process.env.NEXT_PUBLIC_AGENT_REGISTRY
);

export const defaultAgent =
  agentRegistry.find((agent) => agent.isDefault) ?? agentRegistry[0];

export function getAgentById(agentId?: string | null): AgentDefinition {
  if (!agentId) {
    return defaultAgent;
  }

  return agentRegistry.find((agent) => agent.id === agentId) ?? defaultAgent;
}
