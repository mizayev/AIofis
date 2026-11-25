/**
 * AI OFFICE — the CEO's approval inbox.
 *
 * This is the ONLY place where content can be approved or rejected,
 * and the ONLY place where new briefs are created.
 * Approving content does NOT publish it. Publishing is disabled.
 *
 * Later this will sit behind a login-protected web page so only the CEO can use it.
 */
import { MAX_REWORK } from '../core/permissions';
import type { BoardView, TaskBoard } from '../core/task-board';
import type { Brief, Task } from '../core/types';

export class ApprovalInbox {
  private readonly view: BoardView;

  constructor(board: TaskBoard, private readonly now: () => Date = () => new Date()) {
    this.view = board.viewFor('ceo');
  }

  /** Give the office a new job. */
  createBrief(brief: Brief): Task {
    return this.view.createTask(brief);
  }

  /** Packages that passed Quality Control and wait for your decision. */
  listAwaiting(): Task[] {
    return this.view.listByStatus('AWAITING_CEO');
  }

  /** Packages Quality Control kept rejecting after all reworks — you decide what to do. */
  listNeedsAttention(): Task[] {
    return this.view.listByStatus('QC_REJECTED').filter((t) => t.reworkCount >= MAX_REWORK);
  }

  getTask(taskId: string): Task | undefined {
    return this.view.getTask(taskId);
  }

  /** Approve a package. This does NOT publish it. */
  approve(taskId: string, note = ''): Task {
    this.view.writeSection(taskId, 'ceoDecision', {
      decision: 'approved',
      note: note.trim(),
      decidedAt: this.now().toISOString(),
    });
    return this.view.move(taskId, 'CEO_APPROVED', note.trim() || undefined);
  }

  /** Reject a package. A reason is required so the team can learn from it. */
  reject(taskId: string, reason: string): Task {
    if (!reason.trim()) throw new Error('A rejection reason is required.');
    this.view.writeSection(taskId, 'ceoDecision', {
      decision: 'rejected',
      note: reason.trim(),
      decidedAt: this.now().toISOString(),
    });
    return this.view.move(taskId, 'CEO_REJECTED', reason.trim());
  }
}
