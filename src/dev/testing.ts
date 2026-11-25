/**
 * AI OFFICE — test helper.
 * Puts a sample task at a given stage by following the real board rules
 * (each step is done by the correct actor). Used only by tests.
 */
import type { TaskBoard } from '../core/task-board';
import type { Brief, Task } from '../core/types';
import { SAMPLE_BRIEF, SAMPLE_COPY, SAMPLE_STRATEGY, sampleDesignSection, sampleInstagramSection } from './fixtures';

export type SeedStatus =
  | 'NEW'
  | 'STRATEGY_READY'
  | 'COPY_READY'
  | 'DESIGN_READY'
  | 'PACKAGE_READY'
  | 'QC_REJECTED'
  | 'AWAITING_CEO';

export function seedTaskAt(board: TaskBoard, target: SeedStatus, brief: Brief = SAMPLE_BRIEF): Task {
  let task = board.viewFor('ceo').createTask(brief);
  const id = task.id;
  if (target === 'NEW') return task;

  const strategist = board.viewFor('marketing-strategist');
  strategist.writeSection(id, 'strategy', SAMPLE_STRATEGY);
  task = strategist.move(id, 'STRATEGY_READY');
  if (target === 'STRATEGY_READY') return task;

  const copywriter = board.viewFor('copywriter');
  copywriter.writeSection(id, 'copy', SAMPLE_COPY);
  task = copywriter.move(id, 'COPY_READY');
  if (target === 'COPY_READY') return task;

  const designer = board.viewFor('graphic-designer');
  designer.writeSection(id, 'design', sampleDesignSection(brief.formats));
  task = designer.move(id, 'DESIGN_READY');
  if (target === 'DESIGN_READY') return task;

  const smm = board.viewFor('social-media-manager');
  smm.writeSection(id, 'instagram', sampleInstagramSection(brief.formats));
  task = smm.move(id, 'PACKAGE_READY');
  if (target === 'PACKAGE_READY') return task;

  const qc = board.viewFor('quality-control');
  const checkedAt = new Date().toISOString();
  if (target === 'QC_REJECTED') {
    qc.writeSection(id, 'qc', { passed: false, issues: ['Sample QC issue'], checkedAt });
    return qc.move(id, 'QC_REJECTED');
  }
  qc.writeSection(id, 'qc', { passed: true, issues: [], checkedAt });
  qc.move(id, 'QC_PASSED');
  return qc.move(id, 'AWAITING_CEO');
}
