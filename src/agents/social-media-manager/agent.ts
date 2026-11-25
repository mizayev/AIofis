/**
 * Agent 4 — Social Media Manager
 * Prepares and formats the Instagram content package, checks publishing
 * requirements and suggests posting times. It does NOT publish.
 * Reads: DESIGN_READY tasks.   Writes: "instagram".   Moves: DESIGN_READY -> PACKAGE_READY.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { countHashtags, INSTAGRAM_LIMITS } from '../../core/instagram';
import { parseJsonObject, readStringArray } from '../../core/json';
import type { CopySection, Task } from '../../core/types';

const ID = 'social-media-manager' as const;

/** Hook, caption, call to action and hashtags, separated by blank lines. */
export function buildFinalCaption(copy: CopySection): string {
  return [copy.hook, copy.caption, copy.callToAction, copy.hashtags.join(' ')]
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join('\n\n');
}

/** Rule-based checks. Returns a list of problems; empty list = all good. */
export function checkInstagramRequirements(task: Task, finalCaption: string): string[] {
  const issues: string[] = [];
  const { copy, design } = task.package;
  if (!copy) issues.push('Copy is missing.');
  if (!design) issues.push('Design is missing.');

  if (finalCaption.length > INSTAGRAM_LIMITS.captionMaxChars) {
    issues.push(`Caption is ${finalCaption.length} characters; the limit is ${INSTAGRAM_LIMITS.captionMaxChars}.`);
  }
  const tags = countHashtags(finalCaption);
  if (tags > INSTAGRAM_LIMITS.maxHashtags) {
    issues.push(`Caption has ${tags} hashtags; the limit is ${INSTAGRAM_LIMITS.maxHashtags}.`);
  }

  for (const format of task.brief.formats) {
    const spec = design?.designs.find((d) => d.format === format);
    const size = INSTAGRAM_LIMITS.sizes[format];
    if (!spec) issues.push(`No design for ${format}.`);
    else if (spec.width !== size.width || spec.height !== size.height) {
      issues.push(`${format} design is ${spec.width}x${spec.height}; expected ${size.width}x${size.height}.`);
    }
    if (format === 'reel' && copy && copy.reelScript.trim() === '') issues.push('Reel script is empty.');
    if (format === 'story' && copy && copy.storiesText.length === 0) issues.push('Stories text is empty.');
  }
  return issues;
}

export function buildPostingPrompt(task: Task): string {
  return [
    'Suggest the best Instagram posting times for this content package.',
    `TARGET AUDIENCE: ${task.package.strategy?.targetAudience ?? 'unknown'}`,
    `FORMATS: ${task.brief.formats.join(', ')}`,
    'Reply with JSON only, in exactly this shape:',
    '{"suggestedPostingTimes": string[]}',
  ].join('\n');
}

export function parsePostingTimes(raw: string): string[] {
  return readStringArray(parseJsonObject(raw), 'suggestedPostingTimes', { min: 1 });
}

export class SocialMediaManagerAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;

  constructor(private readonly ctx: AgentContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const tasks = this.ctx.board.listByStatus('DESIGN_READY');
    for (const task of tasks) {
      const caption = task.package.copy ? buildFinalCaption(task.package.copy) : '';
      const raw = await this.ctx.llm.complete({ agent: ID, system: this.instructions, prompt: buildPostingPrompt(task) });
      this.ctx.board.writeSection(task.id, 'instagram', {
        caption,
        formats: [...task.brief.formats],
        suggestedPostingTimes: parsePostingTimes(raw),
        requirementIssues: checkInstagramRequirements(task, caption),
      });
      this.ctx.board.move(task.id, 'PACKAGE_READY');
    }
    return tasks.length;
  }
}
