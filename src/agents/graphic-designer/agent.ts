/**
 * Agent 3 — Graphic Designer
 * Creates visual design specs for Instagram posts, Stories and Reels
 * (layout, colours, text overlay, image prompt, exact size).
 * Reads: COPY_READY tasks.   Writes: "design".   Moves: COPY_READY -> DESIGN_READY.
 *
 * This version produces design SPECS. Rendering real images is a later step.
 */
import { assertOwnView, loadInstructions } from '../../core/agent';
import type { Agent, AgentContext } from '../../core/agent';
import { INSTAGRAM_LIMITS } from '../../core/instagram';
import { AgentOutputError, isRecord, parseJsonObject, readString, readStringArray } from '../../core/json';
import type { DesignSection, InstagramFormat, Task } from '../../core/types';

const ID = 'graphic-designer' as const;

export function buildDesignPrompt(task: Task): string {
  const sizes = task.brief.formats.map((f) => `${f}: ${INSTAGRAM_LIMITS.sizes[f].width}x${INSTAGRAM_LIMITS.sizes[f].height}`);
  const copy = task.package.copy;
  return [
    'Design Instagram visuals for this content package.',
    `FORMATS NEEDED: ${task.brief.formats.join(', ')}`,
    `SIZES (px): ${sizes.join('; ')}`,
    `BRAND NOTES: ${task.brief.brandNotes ?? 'none'}`,
    `KEY MESSAGES: ${JSON.stringify(task.package.strategy?.keyMessages ?? [])}`,
    `COPY: ${JSON.stringify(copy ? { headline: copy.headline, hook: copy.hook, storiesText: copy.storiesText, reelScript: copy.reelScript } : null)}`,
    'Reply with JSON only, one design per needed format, in exactly this shape:',
    '{"designs": [{"format": "post"|"story"|"reel", "layout": string, "colors": string[], "textOverlay": string, "imagePrompt": string}]}',
  ].join('\n');
}

export function parseDesign(raw: string, formats: InstagramFormat[]): DesignSection {
  const o = parseJsonObject(raw);
  const list = o['designs'];
  if (!Array.isArray(list)) throw new AgentOutputError('"designs" must be a list.');
  const designs = formats.map((format) => {
    const item: unknown = list.find((d) => isRecord(d) && d['format'] === format);
    if (!isRecord(item)) throw new AgentOutputError(`Missing design for format "${format}".`);
    const size = INSTAGRAM_LIMITS.sizes[format];
    return {
      format,
      width: size.width,
      height: size.height,
      layout: readString(item, 'layout'),
      colors: readStringArray(item, 'colors', { min: 1 }),
      textOverlay: readString(item, 'textOverlay', { allowEmpty: true }),
      imagePrompt: readString(item, 'imagePrompt'),
    };
  });
  return { designs };
}

export class GraphicDesignerAgent implements Agent {
  readonly id = ID;
  private readonly instructions: string;

  constructor(private readonly ctx: AgentContext) {
    assertOwnView(ctx, ID);
    this.instructions = loadInstructions(import.meta.url);
  }

  async runOnce(): Promise<number> {
    const tasks = this.ctx.board.listByStatus('COPY_READY');
    for (const task of tasks) {
      const raw = await this.ctx.llm.complete({ agent: ID, system: this.instructions, prompt: buildDesignPrompt(task) });
      this.ctx.board.writeSection(task.id, 'design', parseDesign(raw, task.brief.formats));
      this.ctx.board.move(task.id, 'DESIGN_READY');
    }
    return tasks.length;
  }
}
