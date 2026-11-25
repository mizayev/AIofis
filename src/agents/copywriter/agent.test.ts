import { describe, expect, it } from 'vitest';
import { FakeLlmClient } from '../../core/llm';
import { MAX_REWORK } from '../../core/permissions';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { SAMPLE_COPY } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { buildCopyPrompt, CopywriterAgent, parseCopy } from './agent';

const goodLlm = () => new FakeLlmClient(() => JSON.stringify(SAMPLE_COPY));

describe('Copywriter', () => {
  it('writes copy for STRATEGY_READY tasks and moves them to COPY_READY', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'STRATEGY_READY');
    const agent = new CopywriterAgent({ board: board.viewFor('copywriter'), llm: goodLlm() });

    expect(await agent.runOnce()).toBe(1);
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('COPY_READY');
    expect(after?.package.copy).toEqual(SAMPLE_COPY);
  });

  it('reworks QC_REJECTED tasks and tells the AI what QC found', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'QC_REJECTED');
    const llm = goodLlm();
    await new CopywriterAgent({ board: board.viewFor('copywriter'), llm }).runOnce();

    expect(llm.calls[0]?.prompt).toContain('THIS IS A REWORK');
    expect(llm.calls[0]?.prompt).toContain('Sample QC issue');
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('COPY_READY');
    expect(after?.reworkCount).toBe(1);
  });

  it(`skips tasks that already used all ${MAX_REWORK} reworks`, async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'QC_REJECTED');
    const real = board.viewFor('copywriter');
    // A view that reports the task as already reworked MAX_REWORK times.
    const view = { ...real, listByStatus: (s: Parameters<typeof real.listByStatus>[0]) =>
      real.listByStatus(s).map((t) => (t.id === task.id ? { ...t, reworkCount: MAX_REWORK } : t)) };
    const llm = goodLlm();
    expect(await new CopywriterAgent({ board: view, llm }).runOnce()).toBe(0);
    expect(llm.calls).toHaveLength(0);
  });

  it('normalizes and de-duplicates hashtags', () => {
    const copy = parseCopy(JSON.stringify({ ...SAMPLE_COPY, hashtags: ['kuzgi menyu', '#Latte', '#Latte'] }));
    expect(copy.hashtags).toEqual(['#kuzgimenyu', '#Latte']);
  });

  it('includes the hashtag limit in the prompt', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'STRATEGY_READY');
    expect(buildCopyPrompt(task)).toContain('HASHTAG LIMIT');
  });

  it('rejects invalid AI output', async () => {
    const board = new InMemoryTaskBoard();
    seedTaskAt(board, 'STRATEGY_READY');
    const agent = new CopywriterAgent({ board: board.viewFor('copywriter'), llm: new FakeLlmClient(() => 'sorry') });
    await expect(agent.runOnce()).rejects.toThrow('JSON');
  });

  it('cannot approve content or write another agent’s section', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const view = board.viewFor('copywriter');
    expect(() => view.move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
    expect(() =>
      view.writeSection(task.id, 'qc', { passed: true, issues: [], checkedAt: new Date().toISOString() }),
    ).toThrow(PermissionError);
  });
});
