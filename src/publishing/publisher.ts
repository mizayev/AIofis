/**
 * AI OFFICE — publishing (DISABLED).
 *
 * In this version publishing is NOT implemented and ALWAYS throws.
 * No agent can reach this module (see tests/architecture.test.ts).
 *
 * Future rule (both conditions required):
 *   1. The CEO approved the package (status CEO_APPROVED + ceoDecision "approved"), AND
 *   2. The environment variable PUBLISHING_ENABLED is exactly "true".
 * The CEO turns publishing on explicitly. The default is "false".
 */
import type { Task } from '../core/types';

export class PublishingDisabledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishingDisabledError';
  }
}

export interface PublishGate {
  allowed: boolean;
  reasons: string[];
}

type Env = Record<string, string | undefined>;

export function isPublishingEnabled(env: Env = process.env): boolean {
  return env['PUBLISHING_ENABLED'] === 'true';
}

/** Explains whether a task would be allowed to publish under the future rule. */
export function checkPublishGate(task: Task, env: Env = process.env): PublishGate {
  const reasons: string[] = [];
  if (task.status !== 'CEO_APPROVED') reasons.push(`status is ${task.status}, not CEO_APPROVED`);
  if (task.package.ceoDecision?.decision !== 'approved') reasons.push('the CEO has not approved this package');
  if (!isPublishingEnabled(env)) reasons.push('PUBLISHING_ENABLED is not "true"');
  return { allowed: reasons.length === 0, reasons };
}

/** SCAFFOLD VERSION: always refuses. Instagram publishing will be built in a later, CEO-approved step. */
export async function publish(task: Task, env: Env = process.env): Promise<never> {
  const gate = checkPublishGate(task, env);
  const why = gate.allowed ? 'publishing is not implemented in this version' : gate.reasons.join('; ');
  throw new PublishingDisabledError(`Publishing disabled: ${why}.`);
}
