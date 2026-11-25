/**
 * Agent 5 — Marketing Analyst
 * Analyzes Instagram performance, audience behaviour and content results,
 * then writes insights to the board for the Marketing Strategist.
 * Reads: metrics source.   Writes: insights (never touches content packages).
 *
 * This version uses fake metrics. Connecting the real Instagram API is a later step.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { parseJsonObject, readString, readStringArray } from '../../core/json';
import type { InstagramFormat, MetricsSource, PostMetrics } from '../../core/types';

const ID = 'marketing-analyst' as const;

export interface AnalystContext extends AgentContext {
  readonly metrics: MetricsSource;
}

export interface FormatSummary {
  format: InstagramFormat;
  posts: number;
  avgReach: number;
  avgEngagementRate: number;
}

export interface MetricsSummary {
  byFormat: FormatSummary[];
  bestPostId: string | null;
}

/** (likes + comments + saves + shares) / reach */
export function engagementRate(p: PostMetrics): number {
  return p.reach > 0 ? (p.likes + p.comments + p.saves + p.shares) / p.reach : 0;
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;

export function summarizeMetrics(posts: PostMetrics[]): MetricsSummary {
  const groups = new Map<InstagramFormat, PostMetrics[]>();
  for (const p of posts) groups.set(p.format, [...(groups.get(p.format) ?? []), p]);
  const byFormat = [...groups.entries()].map(([format, list]) => ({
    format,
    posts: list.length,
    avgReach: round(list.reduce((s, p) => s + p.reach, 0) / list.length, 1),
    avgEngagementRate: round(list.reduce((s, p) => s + engagementRate(p), 0) / list.length, 4),
  }));
  let best: PostMetrics | null = null;
  for (const p of posts) if (!best || engagementRate(p) > engagementRate(best)) best = p;
  return { byFormat, bestPostId: best?.postId ?? null };
}

export function buildAnalysisPrompt(posts: PostMetrics[], summary: MetricsSummary): string {
  return [
    'Analyze these Instagram results and give insights for the next strategy.',
    `SUMMARY BY FORMAT: ${JSON.stringify(summary.byFormat)}`,
    `BEST POST: ${summary.bestPostId ?? 'none'}`,
    `RAW POSTS: ${JSON.stringify(posts)}`,
    'Reply with JSON only, in exactly this shape:',
    '{"summary": string, "recommendations": string[]}',
  ].join('\n');
}

export function parseInsight(raw: string): { summary: string; recommendations: string[] } {
  const o = parseJsonObject(raw);
  return { summary: readString(o, 'summary'), recommendations: readStringArray(o, 'recommendations', { min: 1 }) };
}

export class MarketingAnalystAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;
  private lastAnalyzed = '';

  constructor(private readonly ctx: AnalystContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const posts = await this.ctx.metrics.fetchRecent();
    if (posts.length === 0) return 0;
    const signature = posts.map((p) => p.postId).sort().join(',');
    if (signature === this.lastAnalyzed) return 0; // nothing new since last time
    const summary = summarizeMetrics(posts);
    const raw = await this.ctx.llm.complete({
      agent: ID,
      system: this.instructions,
      prompt: buildAnalysisPrompt(posts, summary),
    });
    this.ctx.board.addInsight(parseInsight(raw));
    this.lastAnalyzed = signature;
    return 1;
  }
}
