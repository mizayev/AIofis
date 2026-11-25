import { describe, expect, it } from 'vitest';
import { INSTAGRAM_LIMITS } from '../../core/instagram';
import { FakeLlmClient } from '../../core/llm';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { SAMPLE_BRIEF, SAMPLE_DESIGN_OUTPUT } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { buildDesignPrompt, GraphicDesignerAgent, parseDesign } from './agent';

const goodLlm = () => new FakeLlmClient(() => JSON.stringify(SAMPLE_DESIGN_OUTPUT));

describe('Graphic Designer', () => {
  it('creates one design per requested format and moves the task to DESIGN_READY', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'COPY_READY');
    const agent = new GraphicDesignerAgent({ board: board.viewFor('graphic-designer'), llm: goodLlm() });

    expect(await agent.runOnce()).toBe(1);
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('DESIGN_READY');
    expect(after?.package.design?.designs.map((d) => d.format)).toEqual(SAMPLE_BRIEF.formats);
  });

  it('always uses the official Instagram sizes, whatever the AI says', () => {
    const output = { designs: [{ ...SAMPLE_DESIGN_OUTPUT.designs[0], format: 'post', width: 50, height: 50 }] };
    const section = parseDesign(JSON.stringify(output), ['post']);
    expect(section.designs[0]?.width).toBe(INSTAGRAM_LIMITS.sizes.post.width);
    expect(section.designs[0]?.height).toBe(INSTAGRAM_LIMITS.sizes.post.height);
  });

  it('only keeps the formats the CEO asked for', () => {
    const section = parseDesign(JSON.stringify(SAMPLE_DESIGN_OUTPUT), ['story']);
    expect(section.designs).toHaveLength(1);
    expect(section.designs[0]?.format).toBe('story');
  });

  it('fails when a requested format has no design', () => {
    const output = { designs: SAMPLE_DESIGN_OUTPUT.designs.filter((d) => d.format !== 'reel') };
    expect(() => parseDesign(JSON.stringify(output), ['post', 'reel'])).toThrow('reel');
  });

  it('puts the brand notes and sizes in the prompt', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'COPY_READY');
    const prompt = buildDesignPrompt(task);
    expect(prompt).toContain('1080x1350');
    expect(prompt).toContain('qahvarang');
  });

  it('cannot approve content', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    expect(() => board.viewFor('graphic-designer').move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
  });
});
