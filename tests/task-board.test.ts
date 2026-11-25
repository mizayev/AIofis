/**
 * The task board: the only channel between agents.
 */
import { describe, expect, it } from 'vitest';
import { InMemoryTaskBoard, PermissionError, TaskNotFoundError } from '../src/core/task-board';
import { SAMPLE_BRIEF, SAMPLE_COPY, SAMPLE_STRATEGY } from '../src/dev/fixtures';

describe('Task board', () => {
  it('only lets the owner write a section', () => {
    const board = new InMemoryTaskBoard();
    const task = board.viewFor('ceo').createTask(SAMPLE_BRIEF);
    expect(() => board.viewFor('copywriter').writeSection(task.id, 'strategy', SAMPLE_STRATEGY)).toThrow(PermissionError);
    expect(board.viewFor('marketing-strategist').writeSection(task.id, 'strategy', SAMPLE_STRATEGY).package.strategy).toEqual(
      SAMPLE_STRATEGY,
    );
  });

  it('lets an agent write only at its own stage', () => {
    const board = new InMemoryTaskBoard();
    const task = board.viewFor('ceo').createTask(SAMPLE_BRIEF);
    // Task is NEW — the copywriter's stage has not come yet.
    expect(() => board.viewFor('copywriter').writeSection(task.id, 'copy', SAMPLE_COPY)).toThrow(PermissionError);
  });

  it('refuses to move a task without the work for that stage', () => {
    const board = new InMemoryTaskBoard();
    const task = board.viewFor('ceo').createTask(SAMPLE_BRIEF);
    expect(() => board.viewFor('marketing-strategist').move(task.id, 'STRATEGY_READY')).toThrow('strategy section is missing');
  });

  it('refuses to skip stages', () => {
    const board = new InMemoryTaskBoard();
    const task = board.viewFor('ceo').createTask(SAMPLE_BRIEF);
    expect(() => board.viewFor('quality-control').move(task.id, 'AWAITING_CEO')).toThrow(PermissionError);
  });

  it('records who did what, in order', () => {
    const board = new InMemoryTaskBoard();
    const task = board.viewFor('ceo').createTask(SAMPLE_BRIEF);
    const strategist = board.viewFor('marketing-strategist');
    strategist.writeSection(task.id, 'strategy', SAMPLE_STRATEGY);
    const moved = strategist.move(task.id, 'STRATEGY_READY', 'done');
    expect(moved.history.map((h) => `${h.actor}:${h.action}`)).toEqual([
      'ceo:created',
      'marketing-strategist:wrote',
      'marketing-strategist:moved',
    ]);
    expect(moved.history[2]?.note).toBe('done');
  });

  it('validates briefs', () => {
    const ceo = new InMemoryTaskBoard().viewFor('ceo');
    expect(() => ceo.createTask({ ...SAMPLE_BRIEF, title: ' ' })).toThrow('title');
    expect(() => ceo.createTask({ ...SAMPLE_BRIEF, formats: [] })).toThrow('format');
  });

  it('only the analyst can write insights', () => {
    const board = new InMemoryTaskBoard();
    expect(() => board.viewFor('marketing-strategist').addInsight({ summary: 'x', recommendations: [] })).toThrow(
      PermissionError,
    );
    expect(board.viewFor('marketing-analyst').addInsight({ summary: 'x', recommendations: ['y'] }).author).toBe(
      'marketing-analyst',
    );
  });

  it('reports unknown tasks clearly', () => {
    const board = new InMemoryTaskBoard();
    expect(() => board.viewFor('marketing-strategist').move('nope', 'STRATEGY_READY')).toThrow(TaskNotFoundError);
  });
});
