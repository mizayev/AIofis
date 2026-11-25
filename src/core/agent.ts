/**
 * AI OFFICE — what every agent looks like.
 *
 * An agent receives ONLY:
 *  - its own BoardView (bound to its own identity), and
 *  - an LlmClient.
 * It never receives the raw board, another agent, the CEO inbox or the publisher.
 */
import { readFileSync } from 'node:fs';
import type { LlmClient } from './llm';
import type { BoardView } from './task-board';
import type { AgentId } from './types';

export type { BoardView };

export interface Agent {
  readonly id: AgentId;
  /** Do all work that is ready right now. Returns how many items were processed. */
  runOnce(): Promise<number>;
}

export interface AgentContext {
  readonly board: BoardView;
  readonly llm: LlmClient;
}

/** Stops an agent from being started with someone else's identity. */
export function assertOwnView(ctx: AgentContext, id: AgentId): void {
  if (ctx.board.actor !== id) {
    throw new Error(`Agent "${id}" was given a board view for "${ctx.board.actor}". Each agent must use its own view.`);
  }
}

/** Reads instructions.md that sits next to the agent's agent.ts file. */
export function loadInstructions(agentModuleUrl: string): string {
  const text = readFileSync(new URL('./instructions.md', agentModuleUrl), 'utf8').trim();
  if (!text) throw new Error(`instructions.md is empty for ${agentModuleUrl}`);
  return text;
}
