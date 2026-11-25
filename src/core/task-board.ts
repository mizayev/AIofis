/**
 * AI OFFICE — the shared task board.
 *
 * This is the ONLY channel between agents. Agents never call each other.
 * Each actor gets its own "view" of the board, bound to its identity, so an
 * agent can never act as someone else (for example, as the CEO).
 *
 * This version keeps everything in memory. A database-backed board can
 * implement the same TaskBoard interface later without changing any agent.
 */
import { randomUUID } from 'node:crypto';
import {
  canCreateTask,
  canMove,
  canWriteInsight,
  canWriteSection,
  MAX_REWORK,
  movePreconditionError,
} from './permissions';
import { AGENT_IDS, INSTAGRAM_FORMATS } from './types';
import type { Actor, Brief, ContentPackage, Insight, SectionName, Task, TaskStatus } from './types';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

/** What one actor can see and do. Every method acts as `actor` — no exceptions. */
export interface BoardView {
  readonly actor: Actor;
  getTask(taskId: string): Task | undefined;
  listByStatus(status: TaskStatus): Task[];
  listInsights(): Insight[];
  createTask(brief: Brief): Task;
  writeSection<S extends SectionName>(taskId: string, section: S, data: NonNullable<ContentPackage[S]>): Task;
  move(taskId: string, to: TaskStatus, note?: string): Task;
  addInsight(input: { summary: string; recommendations: string[] }): Insight;
}

export interface TaskBoard {
  viewFor(actor: Actor): BoardView;
}

const KNOWN_ACTORS: ReadonlySet<string> = new Set<string>([...AGENT_IDS, 'ceo']);

export class InMemoryTaskBoard implements TaskBoard {
  private readonly tasks = new Map<string, Task>();
  private readonly insights: Insight[] = [];

  constructor(private readonly now: () => Date = () => new Date()) {}

  viewFor(actor: Actor): BoardView {
    if (!KNOWN_ACTORS.has(actor)) throw new PermissionError(`Unknown actor "${String(actor)}"`);
    return Object.freeze({
      actor,
      getTask: (taskId: string) => this.read(taskId),
      listByStatus: (status: TaskStatus) => this.list(status),
      listInsights: () => structuredClone(this.insights),
      createTask: (brief: Brief) => this.createTask(actor, brief),
      writeSection: <S extends SectionName>(taskId: string, section: S, data: NonNullable<ContentPackage[S]>) =>
        this.writeSection(actor, taskId, section, data),
      move: (taskId: string, to: TaskStatus, note?: string) => this.move(actor, taskId, to, note),
      addInsight: (input: { summary: string; recommendations: string[] }) => this.addInsight(actor, input),
    });
  }

  // ---------- internals (never exposed to agents) ----------

  private stamp(): string {
    return this.now().toISOString();
  }

  private mustGet(taskId: string): Task {
    const task = this.tasks.get(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return task;
  }

  /** Always hand out copies, so no one can change the board without going through the rules. */
  private read(taskId: string): Task | undefined {
    const task = this.tasks.get(taskId);
    return task ? structuredClone(task) : undefined;
  }

  private list(status: TaskStatus): Task[] {
    return [...this.tasks.values()].filter((t) => t.status === status).map((t) => structuredClone(t));
  }

  private createTask(actor: Actor, brief: Brief): Task {
    if (!canCreateTask(actor)) {
      throw new PermissionError(`"${actor}" cannot create tasks. Only the CEO creates briefs.`);
    }
    validateBrief(brief);
    const at = this.stamp();
    const task: Task = {
      id: randomUUID(),
      brief: structuredClone(brief),
      status: 'NEW',
      package: {},
      reworkCount: 0,
      history: [{ at, actor, action: 'created', to: 'NEW' }],
      createdAt: at,
      updatedAt: at,
    };
    this.tasks.set(task.id, task);
    return structuredClone(task);
  }

  private writeSection<S extends SectionName>(
    actor: Actor,
    taskId: string,
    section: S,
    data: NonNullable<ContentPackage[S]>,
  ): Task {
    const task = this.mustGet(taskId);
    if (!canWriteSection(actor, section, task.status)) {
      throw new PermissionError(`"${actor}" cannot write section "${section}" while the task is ${task.status}.`);
    }
    task.package[section] = structuredClone(data);
    const at = this.stamp();
    task.history.push({ at, actor, action: 'wrote', section });
    task.updatedAt = at;
    return structuredClone(task);
  }

  private move(actor: Actor, taskId: string, to: TaskStatus, note?: string): Task {
    const task = this.mustGet(taskId);
    const from = task.status;
    if (!canMove(actor, from, to)) {
      throw new PermissionError(`"${actor}" cannot move a task from ${from} to ${to}.`);
    }
    const missing = movePreconditionError(task, to);
    if (missing) throw new PermissionError(`Cannot move to ${to}: ${missing}.`);
    if (from === 'QC_REJECTED' && to === 'COPY_READY') {
      if (task.reworkCount >= MAX_REWORK) {
        throw new PermissionError(`Rework limit (${MAX_REWORK}) reached for task ${taskId}. The CEO must decide.`);
      }
      task.reworkCount += 1;
    }
    task.status = to;
    const at = this.stamp();
    task.history.push({ at, actor, action: 'moved', from, to, ...(note ? { note } : {}) });
    task.updatedAt = at;
    return structuredClone(task);
  }

  private addInsight(actor: Actor, input: { summary: string; recommendations: string[] }): Insight {
    if (!canWriteInsight(actor)) {
      throw new PermissionError(`"${actor}" cannot write insights. Only the Marketing Analyst can.`);
    }
    if (!input.summary.trim()) throw new PermissionError('An insight needs a summary.');
    const insight: Insight = {
      id: randomUUID(),
      author: 'marketing-analyst',
      summary: input.summary.trim(),
      recommendations: input.recommendations.map((r) => r.trim()).filter(Boolean),
      createdAt: this.stamp(),
    };
    this.insights.push(insight);
    return structuredClone(insight);
  }
}

function validateBrief(brief: Brief): void {
  if (!brief.title?.trim()) throw new PermissionError('A brief needs a title.');
  if (!brief.goal?.trim()) throw new PermissionError('A brief needs a goal.');
  if (!Array.isArray(brief.formats) || brief.formats.length === 0) {
    throw new PermissionError('A brief needs at least one Instagram format.');
  }
  for (const f of brief.formats) {
    if (!(INSTAGRAM_FORMATS as readonly string[]).includes(f)) {
      throw new PermissionError(`Unknown Instagram format "${f}".`);
    }
  }
}
