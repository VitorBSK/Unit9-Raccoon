/**
 * Core engine error types.
 */
export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export class EngineConfigError extends EngineError {
  constructor(message: string) {
    super(message);
    this.name = "EngineConfigError";
  }
}

export class EngineValidationError extends EngineError {
  constructor(message: string) {
    super(message);
    this.name = "EngineValidationError";
  }
}

export class EnginePipelineError extends EngineError {
  readonly stage: string;

  constructor(message: string, stage: string) {
    super(message);
    this.name = "EnginePipelineError";
    this.stage = stage;
  }
}
