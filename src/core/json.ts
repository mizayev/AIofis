/**
 * AI OFFICE — helpers for reading the AI's JSON replies safely.
 * If the AI returns something unexpected, we stop with a clear error
 * instead of putting broken data on the board.
 */

export class AgentOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentOutputError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts plain JSON or JSON wrapped in ```json fences. */
export function parseJsonObject(raw: string): Record<string, unknown> {
  const text = raw.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AgentOutputError('AI reply did not contain a JSON object.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AgentOutputError('AI reply contained invalid JSON.');
  }
  if (!isRecord(parsed)) throw new AgentOutputError('AI reply must be a JSON object.');
  return parsed;
}

export function readString(obj: Record<string, unknown>, key: string, opts: { allowEmpty?: boolean } = {}): string {
  const value = obj[key];
  if (typeof value !== 'string') throw new AgentOutputError(`"${key}" must be a string.`);
  const trimmed = value.trim();
  if (!opts.allowEmpty && trimmed === '') throw new AgentOutputError(`"${key}" must not be empty.`);
  return trimmed;
}

export function readStringArray(obj: Record<string, unknown>, key: string, opts: { min?: number } = {}): string[] {
  const value = obj[key];
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new AgentOutputError(`"${key}" must be a list of strings.`);
  }
  const items = (value as string[]).map((v) => v.trim()).filter((v) => v !== '');
  const min = opts.min ?? 0;
  if (items.length < min) throw new AgentOutputError(`"${key}" needs at least ${min} item(s).`);
  return items;
}

export function readBoolean(obj: Record<string, unknown>, key: string): boolean {
  const value = obj[key];
  if (typeof value !== 'boolean') throw new AgentOutputError(`"${key}" must be true or false.`);
  return value;
}
