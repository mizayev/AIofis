import { describe, expect, it } from 'vitest';
import { FakeLlmClient } from '../../core/llm';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { createFakeMetrics, SAMPLE_INSIGHT, SAMPLE_METRICS } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { engagementRate, MarketingAnalystAgent, summarizeMetrics } from './agent';

const goodLlm = () => new FakeLlmClient(() => JSON.stringify(SAMPLE_INSIGHT));

describe('Marketing Analyst', () => {
  it('writes an insight to the board', async () => {
    const board = new InMemoryTaskBoard();
    const agent = new MarketingAnalystAgent({
      board: board.viewFor('marketing-analyst'),
      llm: goodLlm(),
      metrics: createFakeMetrics(),
    });
    expect(await agent.runOnce()).toBe(1);
    const insights = board.viewFor('marketing-strategist').listInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0]?.summary).toBe(SAMPLE_INSIGHT.summary);
  });

  it('does not repeat the same analysis when nothing changed', async () => {
    const board = new InMemoryTaskBoard();
    const llm = goodLlm();
    const agent = new MarketingAnalystAgent({ board: board.viewFor('marketing-analyst'), llm, metrics: createFakeMetrics() });
    await agent.runOnce();
    expect(await agent.runOnce()).toBe(0);
    expect(llm.calls).toHaveLength(1);
  });

  it('does nothing without metrics', async () => {
    const board = new InMemoryTaskBoard();
    const agent = new MarketingAnalystAgent({
      board: board.viewFor('marketing-analyst'),
      llm: goodLlm(),
      metrics: createFakeMetrics([]),
    });
    expect(await agent.runOnce()).toBe(0);
  });

  it('calculates engagement and finds the best post', () => {
    const reel = SAMPLE_METRICS.find((p) => p.postId === 'p2');
    expect(reel).toBeDefined();
    if (reel) expect(engagementRate(reel)).toBeGreaterThan(0.1);
    const summary = summarizeMetrics(SAMPLE_METRICS);
    expect(summary.bestPostId).toBe('p2');
    expect(summary.byFormat).toHaveLength(3);
  });

  it('never touches content packages', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'NEW');
    const view = board.viewFor('marketing-analyst');
    expect(() => view.writeSection(task.id, 'strategy', { targetAudience: 'x', goals: ['x'], keyMessages: ['x'], contentPlan: ['x'] })).toThrow(PermissionError);
  });

  it('cannot approve content', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    expect(() => board.viewFor('marketing-analyst').move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
  });
});
