import { EnvironmentErrorState } from "./runtime/environment";
import type { LinePosition } from "./types/token.types"

export class GolosinaEnvironmentError extends Error {
  private state: EnvironmentErrorState;
  
  constructor(message: string, state: EnvironmentErrorState) {
    super(message);
    this.state = state;
  };
};

class OptionalBaseError extends Error {
  constructor(message: string, info: LinePosition | null) {
    if (info) {
      super(`${message} >>>>>> (line: ${info.line}, char: ${info.char})\n`);
    } else {
      super(message);
    };
  };
};

export class GolosinaSyntaxError extends OptionalBaseError {  
  constructor(message: string, info: LinePosition) {
    super(message, info);
  };
};

export class GolosinaTypeError extends OptionalBaseError {
  constructor(message: string, info: LinePosition | null) {
    super(message, info);
  };
};

export class GolosinaRuntimeError extends OptionalBaseError {
  constructor(message: string, info: LinePosition | null) {
    super(message, info);
  };
};

