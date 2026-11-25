import { describe, expect, it } from 'vitest';
import { INSTAGRAM_LIMITS } from '../../core/instagram';
import { FakeLlmClient } from '../../core/llm';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { SAMPLE_COPY, SAMPLE_POSTING_TIMES } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { buildFinalCaption, checkInstagramRequirements, SocialMediaManagerAgent } from './agent';

const goodLlm = () => new FakeLlmClient(() => JSON.stringify(SAMPLE_POSTING_TIMES));

describe('Social Media Manager', () => {
  it('builds the Instagram package and moves the task to PACKAGE_READY', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'DESIGN_READY');
    const agent = new SocialMediaManagerAgent({ board: board.viewFor('social-media-manager'), llm: goodLlm() });

    expect(await agent.runOnce()).toBe(1);
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('PACKAGE_READY');
    expect(after?.package.instagram?.requirementIssues).toEqual([]);
    expect(after?.package.instagram?.suggestedPostingTimes).toEqual(SAMPLE_POSTING_TIMES.suggestedPostingTimes);
    expect(after?.package.instagram?.caption).toContain('#NurCoffee');
  });

  it('builds the caption as hook, caption, call to action, hashtags', () => {
    const caption = buildFinalCaption(SAMPLE_COPY);
    expect(caption.startsWith(SAMPLE_COPY.hook)).toBe(true);
    expect(caption.endsWith(SAMPLE_COPY.hashtags.join(' '))).toBe(true);
  });

  it('flags too many hashtags', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'DESIGN_READY');
    const tooMany = Array.from({ length: INSTAGRAM_LIMITS.maxHashtags + 1 }, (_, i) => `#tag${i}`).join(' ');
    expect(checkInstagramRequirements(task, tooMany).join(' ')).toContain('hashtags');
  });

  it('flags a caption that is too long', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'DESIGN_READY');
    const long = 'a'.repeat(INSTAGRAM_LIMITS.captionMaxChars + 1);
    expect(checkInstagramRequirements(task, long).join(' ')).toContain('characters');
  });

  it('flags a missing Reel script when a Reel is requested', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'DESIGN_READY');
    const noScript = { ...task, package: { ...task.package, copy: { ...SAMPLE_COPY, reelScript: '' } } };
    expect(checkInstagramRequirements(noScript, 'ok').join(' ')).toContain('Reel script');
  });

  it('cannot publish or approve', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const view = board.viewFor('social-media-manager');
    expect(() => view.move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
    expect(() => view.move(task.id, 'PUBLISHED')).toThrow(PermissionError);
  });
});
