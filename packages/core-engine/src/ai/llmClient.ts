/**
 * Abstract client for interacting with a language model. The core-engine
 * does not depend on any specific provider; callers can implement this
 * interface and inject it into higher-level orchestration.
 */
export interface LlmCompletionParams {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  text: string;
}

export interface LlmClient {
  complete(params: LlmCompletionParams): Promise<LlmCompletionResult>;
}

/**
 * A dummy LlmClient that can be used for testing without external calls.
 */
export class NoopLlmClient implements LlmClient {
  async complete(params: LlmCompletionParams): Promise<LlmCompletionResult> {
    return {
      text: `Noop completion for prompt of length ${params.prompt.length}`
    };
  }
}
