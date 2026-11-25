import { describe, expect, it } from 'vitest';
import { FakeLlmClient } from '../../core/llm';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { SAMPLE_STRATEGY } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { buildStrategyPrompt, MarketingStrategistAgent, parseStrategy } from './agent';

const goodLlm = () => new FakeLlmClient(() => JSON.stringify(SAMPLE_STRATEGY));

describe('Marketing Strategist', () => {
  it('writes a strategy for NEW tasks and moves them to STRATEGY_READY', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'NEW');
    const agent = new MarketingStrategistAgent({ board: board.viewFor('marketing-strategist'), llm: goodLlm() });

    expect(await agent.runOnce()).toBe(1);
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('STRATEGY_READY');
    expect(after?.package.strategy).toEqual(SAMPLE_STRATEGY);
  });

  it('does nothing when there are no new tasks', async () => {
    const board = new InMemoryTaskBoard();
    const llm = goodLlm();
    const agent = new MarketingStrategistAgent({ board: board.viewFor('marketing-strategist'), llm });
    expect(await agent.runOnce()).toBe(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('uses the latest analyst insights in its prompt', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'NEW');
    board.viewFor('marketing-analyst').addInsight({ summary: 'Reels perform best', recommendations: ['More reels'] });
    const prompt = buildStrategyPrompt(task, board.viewFor('marketing-strategist').listInsights());
    expect(prompt).toContain('Reels perform best');
  });

  it('sends its own instructions.md to the AI', async () => {
    const board = new InMemoryTaskBoard();
    seedTaskAt(board, 'NEW');
    const llm = goodLlm();
    await new MarketingStrategistAgent({ board: board.viewFor('marketing-strategist'), llm }).runOnce();
    expect(llm.calls[0]?.system).toContain('Role: Marketing Strategist');
  });

  it('rejects invalid AI output and leaves the task untouched', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'NEW');
    const llm = new FakeLlmClient(() => '{"targetAudience": ""}');
    const agent = new MarketingStrategistAgent({ board: board.viewFor('marketing-strategist'), llm });
    await expect(agent.runOnce()).rejects.toThrow('targetAudience');
    expect(board.viewFor('ceo').getTask(task.id)?.status).toBe('NEW');
  });

  it('parses JSON wrapped in code fences', () => {
    expect(parseStrategy('```json\n' + JSON.stringify(SAMPLE_STRATEGY) + '\n```')).toEqual(SAMPLE_STRATEGY);
  });

  it('cannot approve content', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    expect(() => board.viewFor('marketing-strategist').move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
  });

  it('refuses to start with another actor’s board view', () => {
    const board = new InMemoryTaskBoard();
    expect(() => new MarketingStrategistAgent({ board: board.viewFor('ceo'), llm: goodLlm() })).toThrow('own view');
  });
});
