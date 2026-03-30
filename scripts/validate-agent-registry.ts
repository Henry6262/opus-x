import { agentRegistry, defaultAgent } from "../src/lib/agents";

function fail(message: string): never {
  console.error(`[validate:agents] ${message}`);
  process.exit(1);
}

const seenIds = new Set<string>();
const seenKeys = new Set<string>();

for (const agent of agentRegistry) {
  if (!agent.id || !agent.key || !agent.displayName) {
    fail(`Agent is missing a required field: ${JSON.stringify(agent)}`);
  }

  if (seenIds.has(agent.id)) {
    fail(`Duplicate agent id "${agent.id}"`);
  }

  if (seenKeys.has(agent.key)) {
    fail(`Duplicate agent key "${agent.key}"`);
  }

  seenIds.add(agent.id);
  seenKeys.add(agent.key);
}

if (!defaultAgent) {
  fail("No default agent resolved");
}

console.log(
  `[validate:agents] OK: ${agentRegistry.length} agent(s), default=${defaultAgent.id}`
);
