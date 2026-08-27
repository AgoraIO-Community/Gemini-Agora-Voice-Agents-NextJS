import type { AgentSession } from 'agora-agents';

const sessions = new Map<string, AgentSession>();

export function storeAgentSession(agentId: string, session: AgentSession): void {
  sessions.set(agentId, session);
}

export function takeAgentSession(agentId: string): AgentSession | undefined {
  const session = sessions.get(agentId);
  sessions.delete(agentId);
  return session;
}
