import { describe, expect, it } from 'vitest';
import { FakeLlmClient } from '../../core/llm';
import { InMemoryTaskBoard, PermissionError } from '../../core/task-board';
import { SAMPLE_QC_FAIL, SAMPLE_QC_PASS } from '../../dev/fixtures';
import { seedTaskAt } from '../../dev/testing';
import { QualityControlAgent, runDeterministicChecks } from './agent';

const llmReturning = (answer: object) => new FakeLlmClient(() => JSON.stringify(answer));

describe('Quality Control Manager', () => {
  it('passes a good package and sends it to the CEO inbox', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'PACKAGE_READY');
    const agent = new QualityControlAgent({ board: board.viewFor('quality-control'), llm: llmReturning(SAMPLE_QC_PASS) });

    expect(await agent.runOnce()).toBe(1);
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('AWAITING_CEO');
    expect(after?.package.qc?.passed).toBe(true);
  });

  it('rejects a package when the reviewer finds issues', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'PACKAGE_READY');
    const agent = new QualityControlAgent({ board: board.viewFor('quality-control'), llm: llmReturning(SAMPLE_QC_FAIL) });
    await agent.runOnce();
    const after = board.viewFor('ceo').getTask(task.id);
    expect(after?.status).toBe('QC_REJECTED');
    expect(after?.package.qc?.issues).toEqual(SAMPLE_QC_FAIL.issues);
  });

  it('rule checks catch problems the Social Media Manager reported', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'PACKAGE_READY');
    const instagram = task.package.instagram;
    expect(instagram).toBeDefined();
    if (!instagram) return;
    const broken = { ...task, package: { ...task.package, instagram: { ...instagram, requirementIssues: ['Caption too long'] } } };
    expect(runDeterministicChecks(broken)).toContain('Instagram requirement: Caption too long');
  });

  it('rejects when rule checks fail, even if the AI says it passed', async () => {
    const board = new InMemoryTaskBoard();
    const ceo = board.viewFor('ceo');
    // Seed to DESIGN_READY, then let the SMM write a package that breaks a rule.
    const task = seedTaskAt(board, 'DESIGN_READY');
    const smm = board.viewFor('social-media-manager');
    smm.writeSection(task.id, 'instagram', {
      caption: 'ok',
      formats: task.brief.formats,
      suggestedPostingTimes: ['Seshanba 19:00'],
      requirementIssues: ['Reel script is empty.'],
    });
    smm.move(task.id, 'PACKAGE_READY');
    const agent = new QualityControlAgent({ board: board.viewFor('quality-control'), llm: llmReturning(SAMPLE_QC_PASS) });
    await agent.runOnce();
    expect(ceo.getTask(task.id)?.status).toBe('QC_REJECTED');
  });

  it('never leaves a rejection without a reason', async () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'PACKAGE_READY');
    const agent = new QualityControlAgent({ board: board.viewFor('quality-control'), llm: llmReturning({ passed: false, issues: [] }) });
    await agent.runOnce();
    expect(board.viewFor('ceo').getTask(task.id)?.package.qc?.issues.length).toBeGreaterThan(0);
  });

  it('can NEVER approve or publish — only the CEO approves', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    const view = board.viewFor('quality-control');
    expect(() => view.move(task.id, 'CEO_APPROVED')).toThrow(PermissionError);
    expect(() => view.move(task.id, 'PUBLISHED')).toThrow(PermissionError);
    expect(() =>
      view.writeSection(task.id, 'ceoDecision', { decision: 'approved', note: '', decidedAt: new Date().toISOString() }),
    ).toThrow(PermissionError);
  });

  it('cannot change its verdict after sending to the CEO', () => {
    const board = new InMemoryTaskBoard();
    const task = seedTaskAt(board, 'AWAITING_CEO');
    expect(() =>
      board.viewFor('quality-control').writeSection(task.id, 'qc', { passed: false, issues: ['x'], checkedAt: 'now' }),
    ).toThrow(PermissionError);
  });
});
