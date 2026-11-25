/**
 * End-to-end: a CEO brief travels through all six agents to the CEO's inbox.
 */
import { describe, expect, it } from 'vitest';
import { createFakeLlm, createFakeMetrics, SAMPLE_BRIEF, SAMPLE_INSIGHT, SAMPLE_QC_FAIL, SAMPLE_QC_PASS } from '../src/dev/fixtures';
import { MAX_REWORK } from '../src/core/permissions';
import { createOffice } from '../src/office';
import { publish } from '../src/publishing/publisher';

describe('Full pipeline', () => {
  it('takes a brief through all six agents and stops in the CEO inbox', async () => {
    const office = createOffice({ llm: createFakeLlm(), metrics: createFakeMetrics() });
    const task = office.inbox.createBrief(SAMPLE_BRIEF);

    const report = await office.orchestrator.runUntilIdle();
    expect(report.errors).toEqual([]);

    const awaiting = office.inbox.listAwaiting();
    expect(awaiting.map((t) => t.id)).toEqual([task.id]);

    const moves = (office.inbox.getTask(task.id)?.history ?? []).filter((h) => h.action === 'moved');
    expect(moves.map((h) => `${h.actor}:${h.to}`)).toEqual([
      'marketing-strategist:STRATEGY_READY',
      'copywriter:COPY_READY',
      'graphic-designer:DESIGN_READY',
      'social-media-manager:PACKAGE_READY',
      'quality-control:QC_PASSED',
      'quality-control:AWAITING_CEO',
    ]);
  });

  it('nothing is approved or published until the CEO acts — and publishing stays blocked after', async () => {
    const office = createOffice({ llm: createFakeLlm(), metrics: createFakeMetrics() });
    const task = office.inbox.createBrief(SAMPLE_BRIEF);
    await office.orchestrator.runUntilIdle();

    const before = office.inbox.getTask(task.id);
    expect(before?.status).toBe('AWAITING_CEO');
    expect(before?.package.ceoDecision).toBeUndefined();

    const approved = office.inbox.approve(task.id, 'Zoʻr');
    expect(approved.status).toBe('CEO_APPROVED');
    await expect(publish(approved, { PUBLISHING_ENABLED: 'true' })).rejects.toThrow('Publishing disabled');
  });

  it('the analyst’s insight reaches the strategist', async () => {
    const llm = createFakeLlm();
    const office = createOffice({ llm, metrics: createFakeMetrics() });
    office.inbox.createBrief(SAMPLE_BRIEF);
    await office.orchestrator.runUntilIdle();
    const strategistCall = llm.calls.find((c) => c.agent === 'marketing-strategist');
    expect(strategistCall?.prompt).toContain(SAMPLE_INSIGHT.summary);
  });

  it('a QC rejection goes back to the copywriter, then passes', async () => {
    const llm = createFakeLlm({
      'quality-control': (_request, n) => JSON.stringify(n === 0 ? SAMPLE_QC_FAIL : SAMPLE_QC_PASS),
    });
    const office = createOffice({ llm, metrics: createFakeMetrics() });
    const task = office.inbox.createBrief(SAMPLE_BRIEF);
    await office.orchestrator.runUntilIdle();

    const after = office.inbox.getTask(task.id);
    expect(after?.status).toBe('AWAITING_CEO');
    expect(after?.reworkCount).toBe(1);
    const copywriterCalls = llm.calls.filter((c) => c.agent === 'copywriter');
    expect(copywriterCalls).toHaveLength(2);
    expect(copywriterCalls[1]?.prompt).toContain(SAMPLE_QC_FAIL.issues[0] ?? '');
  });

  it(`after ${MAX_REWORK} failed reworks the package waits for the CEO in "needs attention"`, async () => {
    const llm = createFakeLlm({ 'quality-control': JSON.stringify(SAMPLE_QC_FAIL) });
    const office = createOffice({ llm, metrics: createFakeMetrics() });
    const task = office.inbox.createBrief(SAMPLE_BRIEF);
    await office.orchestrator.runUntilIdle();

    const after = office.inbox.getTask(task.id);
    expect(after?.status).toBe('QC_REJECTED');
    expect(after?.reworkCount).toBe(MAX_REWORK);
    expect(office.inbox.listAwaiting()).toHaveLength(0);
    expect(office.inbox.listNeedsAttention().map((t) => t.id)).toEqual([task.id]);
  });

  it('bad AI output is reported, does not crash the office, and does not move the task', async () => {
    const llm = createFakeLlm({ 'marketing-strategist': 'I cannot help with that' });
    const office = createOffice({ llm, metrics: createFakeMetrics() });
    const task = office.inbox.createBrief(SAMPLE_BRIEF);
    const report = await office.orchestrator.runUntilIdle();

    expect(report.errors.some((e) => e.agent === 'marketing-strategist')).toBe(true);
    expect(office.inbox.getTask(task.id)?.status).toBe('NEW');
  });
});
