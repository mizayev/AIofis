/**
 * Agent 1 — Marketing Strategist
 * Creates marketing strategies: target audience, goals, key messages, content plan.
 * Reads: NEW tasks + analyst insights.   Writes: "strategy".   Moves: NEW -> STRATEGY_READY.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { parseJsonObject, readString, readStringArray } from '../../core/json';
import type { Insight, StrategySection, Task } from '../../core/types';

const ID = 'marketing-strategist' as const;

export function buildStrategyPrompt(task: Task, insights: Insight[]): string {
  const recent = insights.slice(-3).map((i) => ({ summary: i.summary, recommendations: i.recommendations }));
  return [
    'Create a marketing strategy for the brief below.',
    `BRIEF: ${JSON.stringify(task.brief)}`,
    `LATEST ANALYST INSIGHTS: ${recent.length > 0 ? JSON.stringify(recent) : 'none yet'}`,
    'Reply with JSON only, in exactly this shape:',
    '{"targetAudience": string, "goals": string[], "keyMessages": string[], "contentPlan": string[]}',
  ].join('\n');
}

export function parseStrategy(raw: string): StrategySection {
  const o = parseJsonObject(raw);
  return {
    targetAudience: readString(o, 'targetAudience'),
    goals: readStringArray(o, 'goals', { min: 1 }),
    keyMessages: readStringArray(o, 'keyMessages', { min: 1 }),
    contentPlan: readStringArray(o, 'contentPlan', { min: 1 }),
  };
}

export class MarketingStrategistAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;

  constructor(private readonly ctx: AgentContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const tasks = this.ctx.board.listByStatus('NEW');
    if (tasks.length === 0) return 0;
    const insights = this.ctx.board.listInsights();
    for (const task of tasks) {
      const raw = await this.ctx.llm.complete({
        agent: ID,
        system: this.instructions,
        prompt: buildStrategyPrompt(task, insights),
      });
      this.ctx.board.writeSection(task.id, 'strategy', parseStrategy(raw));
      this.ctx.board.move(task.id, 'STRATEGY_READY');
    }
    return tasks.length;
  }
}
