/**
 * SAFETY RULES — these tests must never be deleted or weakened.
 *  - Only the CEO creates briefs and approves/rejects content.
 *  - No agent can approve or publish.
 *  - No one can reach PUBLISHED in this version.
 *  - Publishing stays disabled until the CEO explicitly turns it on.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InMemoryTaskBoard, PermissionError } from '../src/core/task-board';
import { AGENT_IDS, TASK_STATUSES } from '../src/core/types';
import type { Actor } from '../src/core/types';
import { canMove, TRANSITIONS } from '../src/core/permissions';
import { ApprovalInbox } from '../src/ceo/approval-inbox';
import { checkPublishGate, publish, PublishingDisabledError } from '../src/publishing/publisher';
import { SAMPLE_BRIEF } from '../src/dev/fixtures';
import { seedTaskAt } from '../src/dev/testing';

const decision = (d: 'approved' | 'rejected') => ({ decision: d, note: '', decidedAt: new Date().toISOString() });

describe('Only the CEO approves', () => {
  for (const agent of AGENT_IDS) {
    describe(agent, () => {
      it('cannot approve or reject content', () => {
        const board = new InMemoryTaskBoard();
        const task = seedTaskAt(board, 'AWAITING_CEO');
        const view = board.viewFor(agent);
        expect(() => view.move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
        expect(() => view.move(task.id, 'CEO_REJECTED')).toThrow(PermissionError);
      });

      it('cannot write the CEO decision', () => {
        const board = new InMemoryTaskBoard();
        const task = seedTaskAt(board, 'AWAITING_CEO');
        expect(() => board.viewFor(agent).writeSection(task.id, 'ceoDecision', decision('approved'))).toThrow(
          PermissionError,
        );
      });

      it('cannot publish', () => {
        const board = new InMemoryTaskBoard();
        const task = seedTaskAt(board, 'AWAITING_CEO');
        expect(() => board.viewFor(agent).move(task.id, 'PUBLISHED')).toThrow(PermissionError);
      });

      it('cannot create briefs', () => {
        const board = new InMemoryTaskBoard();
        expect(() => board.viewFor(agent).createTask(SAMPLE_BRIEF)).toThrow(PermissionError);
      });

      it('cannot change content after it was sent to the CEO', () => {
        const board = new InMemoryTaskBoard();
        const task = seedTaskAt(board, 'AWAITING_CEO');
        const view = board.viewFor(agent);
        for (const section of ['strategy', 'copy', 'design', 'instagram', 'qc'] as const) {
          // Any data: the write must be refused before the data is even looked at.
          expect(() => view.writeSection(task.id, section, {} as never)).toThrow(PermissionError);
        }
      });
    });
  }

  it('the permission table gives CEO_APPROVED / CEO_REJECTED to the CEO only', () => {
    const ceoOnly = TRANSITIONS.filter((t) => t.to === 'CEO_APPROVED' || t.to === 'CEO_REJECTED');
    expect(ceoOnly.length).toBeGreaterThan(0);
    for (const t of ceoOnly) expect(t.actor).toBe('ceo');
  });

  it('no actor at all — not even the CEO — can reach PUBLISHED in this version', () => {
    const actors: Actor[] = [...AGENT_IDS, 'ceo'];
    for (const actor of actors) for (const from of TASK_STATUSES) expect(canMove(actor, from, 'PUBLISHED')).toBe(false);
  });

  it('the CEO cannot approve a package that did not pass Quality Control', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'PACKAGE_READY');
    const inbox = new ApprovalInbox(board);
    expect(() => inbox.approve(task.id)).toThrow(PermissionError);
  });

  it('the CEO can approve a package in the inbox, and approval does not publish', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const approved = new ApprovalInbox(board).approve(task.id, 'OK');
    expect(approved.status).toBe('CEO_APPROVED');
    expect(approved.status).not.toBe('PUBLISHED');
  });

  it('a CEO rejection needs a reason', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    expect(() => new ApprovalInbox(board).reject(task.id, '  ')).toThrow('reason');
  });

  it('unknown actors are refused', () => {
    const board = new InMemoryTaskBoard();
    expect(() => board.viewFor('hacker' as Actor)).toThrow(PermissionError);
  });

  it('tasks handed out are copies — changing them does not change the board', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const copy = board.viewFor('quality-control').getTask(task.id);
    if (copy) copy.status = 'CEO_APPROVED';
    expect(board.viewFor('ceo').getTask(task.id)?.status).toBe('AWAITING_CEO');
  });
});

describe('Publishing stays disabled', () => {
  it('publish() always throws — even after CEO approval with PUBLISHING_ENABLED=true', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const approved = new ApprovalInbox(board).approve(task.id);
    await expect(publish(approved, { PUBLISHING_ENABLED: 'true' })).rejects.toThrow(PublishingDisabledError);
  });

  it('the future gate needs BOTH CEO approval AND PUBLISHING_ENABLED=true', () => {
    const board = new InMemoryTaskBoard();
    const waiting = seedTaskAt(board, 'AWAITING_CEO');
    expect(checkPublishGate(waiting, { PUBLISHING_ENABLED: 'true' }).allowed).toBe(false);

    const approved = new ApprovalInbox(board).approve(waiting.id);
    expect(checkPublishGate(approved, {}).allowed).toBe(false);
    expect(checkPublishGate(approved, { PUBLISHING_ENABLED: 'false' }).allowed).toBe(false);
    expect(checkPublishGate(approved, { PUBLISHING_ENABLED: 'TRUE' }).allowed).toBe(false);
    expect(checkPublishGate(approved, { PUBLISHING_ENABLED: 'true' }).allowed).toBe(true);
  });

  it('.env.example keeps publishing switched off', () => {
    const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
    expect(env).toMatch(/^PUBLISHING_ENABLED=false$/m);
  });
});
