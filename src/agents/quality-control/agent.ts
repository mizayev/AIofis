/**
 * Agent 6 — Quality Control Manager
 * Checks every content package for quality, spelling, brand consistency,
 * accuracy and compliance before it goes to the CEO's approval inbox.
 * QC can only PASS or REJECT. QC can NEVER approve or publish — only the CEO approves.
 * Reads: PACKAGE_READY tasks.   Writes: "qc".
 * Moves: PACKAGE_READY -> QC_PASSED -> AWAITING_CEO, or PACKAGE_READY -> QC_REJECTED.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { countHashtags, INSTAGRAM_LIMITS } from '../../core/instagram';
import { parseJsonObject, readBoolean, readStringArray } from '../../core/json';
import type { Task } from '../../core/types';

const ID = 'quality-control' as const;

/** Rule-based checks that do not need AI. */
export function runDeterministicChecks(task: Task): string[] {
  const issues: string[] = [];
  const p = task.package;
  if (!p.strategy) issues.push('Strategy is missing.');
  if (!p.copy) issues.push('Copy is missing.');
  if (!p.design) issues.push('Design is missing.');
  if (!p.instagram) {
    issues.push('Instagram package is missing.');
    return issues;
  }
  for (const problem of p.instagram.requirementIssues) issues.push(`Instagram requirement: ${problem}`);
  if (p.instagram.caption.length > INSTAGRAM_LIMITS.captionMaxChars) issues.push('Caption is too long.');
  if (countHashtags(p.instagram.caption) > INSTAGRAM_LIMITS.maxHashtags) issues.push('Too many hashtags.');
  if (p.instagram.suggestedPostingTimes.length === 0) issues.push('No posting time suggested.');
  return issues;
}

export function buildReviewPrompt(task: Task): string {
  return [
    'Review this Instagram content package before it goes to the CEO.',
    'Check: spelling and grammar, quality, brand consistency, factual accuracy, legal/platform compliance.',
    `BRIEF: ${JSON.stringify(task.brief)}`,
    `PACKAGE: ${JSON.stringify({ strategy: task.package.strategy, copy: task.package.copy, design: task.package.design, instagram: task.package.instagram })}`,
    'Reply with JSON only, in exactly this shape:',
    '{"passed": boolean, "issues": string[]}',
  ].join('\n');
}

export function parseReview(raw: string): { passed: boolean; issues: string[] } {
  const o = parseJsonObject(raw);
  return { passed: readBoolean(o, 'passed'), issues: readStringArray(o, 'issues') };
}

export class QualityControlAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;

  constructor(private readonly ctx: AgentContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const tasks = this.ctx.board.listByStatus('PACKAGE_READY');
    for (const task of tasks) {
      const ruleIssues = runDeterministicChecks(task);
      const raw = await this.ctx.llm.complete({ agent: ID, system: this.instructions, prompt: buildReviewPrompt(task) });
      const review = parseReview(raw);
      const issues = [...ruleIssues, ...review.issues];
      const passed = ruleIssues.length === 0 && review.passed;
      if (!passed && issues.length === 0) issues.push('Reviewer rejected the package without listing issues.');

      this.ctx.board.writeSection(task.id, 'qc', { passed, issues, checkedAt: new Date().toISOString() });
      if (passed) {
        this.ctx.board.move(task.id, 'QC_PASSED');
        this.ctx.board.move(task.id, 'AWAITING_CEO', 'Sent to the CEO approval inbox');
      } else {
        this.ctx.board.move(task.id, 'QC_REJECTED', `${issues.length} issue(s) found`);
      }
    }
    return tasks.length;
  }
}
