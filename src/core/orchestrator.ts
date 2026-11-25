/**
 * AI OFFICE — the orchestrator.
 *
 * It simply asks every agent, in turn, to do whatever work is ready on the
 * board, and repeats until nobody has anything left to do.
 * It has NO board access of its own, so it cannot approve or publish anything.
 */
import type { Agent } from './agent';
import type { AgentId } from './types';

export interface RunError {
  agent: AgentId;
  message: string;
}

export interface RunReport {
  rounds: number;
  processed: number;
  errors: RunError[];
}

export class Orchestrator {
  constructor(private readonly agents: readonly Agent[]) {
    const ids = agents.map((a) => a.id);
    if (new Set(ids).size !== ids.length) throw new Error('Each agent may be registered only once.');
  }

  async runUntilIdle(maxRounds = 25): Promise<RunReport> {
    const report: RunReport = { rounds: 0, processed: 0, errors: [] };
    for (let round = 0; round < maxRounds; round++) {
      report.rounds += 1;
      let worked = 0;
      for (const agent of this.agents) {
        try {
          worked += await agent.runOnce();
        } catch (error) {
          report.errors.push({ agent: agent.id, message: error instanceof Error ? error.message : String(error) });
        }
      }
      report.processed += worked;
      if (worked === 0) break;
    }
    return report;
  }
}
