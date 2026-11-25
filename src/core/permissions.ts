/**
 * AI OFFICE — who may do what.
 *
 * NON-NEGOTIABLE RULES (see CLAUDE.md):
 *  - Only the CEO creates briefs.
 *  - Only the CEO can approve or reject (CEO_APPROVED / CEO_REJECTED).
 *  - No one can reach PUBLISHED in this version.
 *  - Each section of a content package has exactly one owner.
 *  - Content is locked once Quality Control passes it.
 */
import type { Actor, SectionName, Task, TaskStatus } from './types';

export interface Transition {
  readonly from: TaskStatus;
  readonly to: TaskStatus;
  readonly actor: Actor;
}

/** The ONLY allowed status changes. Anything not listed here is refused by the board. */
export const TRANSITIONS: readonly Transition[] = Object.freeze([
  { from: 'NEW', to: 'STRATEGY_READY', actor: 'marketing-strategist' },
  { from: 'STRATEGY_READY', to: 'COPY_READY', actor: 'copywriter' },
  { from: 'QC_REJECTED', to: 'COPY_READY', actor: 'copywriter' }, // rework after QC rejection
  { from: 'COPY_READY', to: 'DESIGN_READY', actor: 'graphic-designer' },
  { from: 'DESIGN_READY', to: 'PACKAGE_READY', actor: 'social-media-manager' },
  { from: 'PACKAGE_READY', to: 'QC_PASSED', actor: 'quality-control' },
  { from: 'PACKAGE_READY', to: 'QC_REJECTED', actor: 'quality-control' },
  { from: 'QC_PASSED', to: 'AWAITING_CEO', actor: 'quality-control' },
  { from: 'AWAITING_CEO', to: 'CEO_APPROVED', actor: 'ceo' },
  { from: 'AWAITING_CEO', to: 'CEO_REJECTED', actor: 'ceo' },
  // There is deliberately NO transition to PUBLISHED.
] as const satisfies readonly Transition[]);

/** Each section has exactly one owner. */
export const SECTION_OWNERS: Readonly<Record<SectionName, Actor>> = Object.freeze({
  strategy: 'marketing-strategist',
  copy: 'copywriter',
  design: 'graphic-designer',
  instagram: 'social-media-manager',
  qc: 'quality-control',
  ceoDecision: 'ceo',
});

export const CEO_ONLY_STATUSES: readonly TaskStatus[] = Object.freeze(['CEO_APPROVED', 'CEO_REJECTED']);

/** How many times the copywriter may rework a package that QC rejected. */
export const MAX_REWORK = 2;

export function canMove(actor: Actor, from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS.some((t) => t.actor === actor && t.from === from && t.to === to);
}

/**
 * An agent may write its own section only while the task is at a stage
 * that agent works on. The CEO may write only the decision, only while the
 * task waits in the approval inbox.
 */
export function canWriteSection(actor: Actor, section: SectionName, status: TaskStatus): boolean {
  if (SECTION_OWNERS[section] !== actor) return false;
  if (actor === 'ceo') return status === 'AWAITING_CEO';
  if (status === 'QC_PASSED') return false; // content is locked after QC passes it
  return TRANSITIONS.some((t) => t.actor === actor && t.from === status);
}

export function canCreateTask(actor: Actor): boolean {
  return actor === 'ceo';
}

export function canWriteInsight(actor: Actor): boolean {
  return actor === 'marketing-analyst';
}

/**
 * Extra checks before a move: the work for that stage must really exist.
 * Returns a reason string when the move must be refused, otherwise null.
 */
export function movePreconditionError(task: Task, to: TaskStatus): string | null {
  const p = task.package;
  switch (to) {
    case 'STRATEGY_READY':
      return p.strategy ? null : 'strategy section is missing';
    case 'COPY_READY':
      return p.copy ? null : 'copy section is missing';
    case 'DESIGN_READY':
      return p.design ? null : 'design section is missing';
    case 'PACKAGE_READY':
      return p.instagram ? null : 'instagram section is missing';
    case 'QC_PASSED':
    case 'AWAITING_CEO':
      return p.qc?.passed === true ? null : 'quality control has not passed this package';
    case 'QC_REJECTED':
      return p.qc && p.qc.passed === false ? null : 'quality control rejection is missing';
    case 'CEO_APPROVED':
      return p.ceoDecision?.decision === 'approved' ? null : 'CEO approval decision is missing';
    case 'CEO_REJECTED':
      return p.ceoDecision?.decision === 'rejected' ? null : 'CEO rejection decision is missing';
    default:
      return null;
  }
}
