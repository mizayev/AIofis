/**
 * AI OFFICE — the AI model connection.
 *
 * This version has NO real AI calls. Agents talk to the LlmClient interface,
 * and tests/demo use FakeLlmClient. A real client (e.g. Anthropic API) will be
 * added in a later step and will implement the same interface.
 */
import type { AgentId } from './types';

export interface LlmRequest {
  /** Which agent is asking. Used for logging and for fakes in tests. */
  agent: AgentId;
  /** The agent's instructions.md text. */
  system: string;
  /** The concrete request for this task. */
  prompt: string;
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<string>;
}

export type FakeResponder = (request: LlmRequest, callIndex: number) => string;

/** A pretend AI that returns canned answers. Records every call for tests. */
export class FakeLlmClient implements LlmClient {
  readonly calls: LlmRequest[] = [];

  constructor(private readonly responder: FakeResponder) {}

  async complete(request: LlmRequest): Promise<string> {
    this.calls.push(structuredClone(request));
    return this.responder(request, this.calls.length - 1);
  }
}
