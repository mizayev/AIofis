/**
 * Agent 2 — Copywriter
 * Writes captions, headlines, hooks, Stories text, Reel scripts, hashtags and calls to action.
 * Reads: STRATEGY_READY tasks, and QC_REJECTED tasks for rework.
 * Writes: "copy".   Moves: STRATEGY_READY -> COPY_READY, QC_REJECTED -> COPY_READY.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { INSTAGRAM_LIMITS, normalizeHashtag } from '../../core/instagram';
import { parseJsonObject, readString, readStringArray } from '../../core/json';
import { MAX_REWORK } from '../../core/permissions';
import type { CopySection, Task } from '../../core/types';

const ID = 'copywriter' as const;

export function buildCopyPrompt(task: Task): string {
  const lines = [
    'Write Instagram copy for this content package.',
    `BRIEF: ${JSON.stringify(task.brief)}`,
    `STRATEGY: ${JSON.stringify(task.package.strategy ?? null)}`,
    `HASHTAG LIMIT: at most ${INSTAGRAM_LIMITS.maxHashtags} hashtags.`,
    `CAPTION LIMIT: the whole caption, call to action and hashtags must fit in ${INSTAGRAM_LIMITS.captionMaxChars} characters.`,
  ];
  if (task.status === 'QC_REJECTED') {
    lines.push(
      'THIS IS A REWORK. Quality Control rejected the previous version.',
      `QC ISSUES TO FIX: ${JSON.stringify(task.package.qc?.issues ?? [])}`,
      `PREVIOUS COPY: ${JSON.stringify(task.package.copy ?? null)}`,
    );
  }
  lines.push(
    'Reply with JSON only, in exactly this shape:',
    '{"headline": string, "hook": string, "caption": string, "storiesText": string[], "reelScript": string, "hashtags": string[], "callToAction": string}',
  );
  return lines.join('\n');
}

export function parseCopy(raw: string): CopySection {
  const o = parseJsonObject(raw);
  return {
    headline: readString(o, 'headline'),
    hook: readString(o, 'hook'),
    caption: readString(o, 'caption'),
    storiesText: readStringArray(o, 'storiesText'),
    reelScript: readString(o, 'reelScript', { allowEmpty: true }),
    hashtags: [...new Set(readStringArray(o, 'hashtags').map(normalizeHashtag))],
    callToAction: readString(o, 'callToAction'),
  };
}

export class CopywriterAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;

  constructor(private readonly ctx: AgentContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const fresh = this.ctx.board.listByStatus('STRATEGY_READY');
    const rework = this.ctx.board.listByStatus('QC_REJECTED').filter((t) => t.reworkCount < MAX_REWORK);
    const tasks = [...fresh, ...rework];
    for (const task of tasks) {
      const raw = await this.ctx.llm.complete({ agent: ID, system: this.instructions, prompt: buildCopyPrompt(task) });
      this.ctx.board.writeSection(task.id, 'copy', parseCopy(raw));
      const note = task.status === 'QC_REJECTED' ? `Rework #${task.reworkCount + 1}` : undefined;
      this.ctx.board.move(task.id, 'COPY_READY', note);
    }
    return tasks.length;
  }
}
