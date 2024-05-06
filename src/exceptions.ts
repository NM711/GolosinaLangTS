import { styleText } from "node:util"
import { EnvironmentErrorState } from "./runtime/environment";
import type { LinePosition } from "./types/token.types"

export class GolosinaEnvironmentError extends Error {
  private state: EnvironmentErrorState;
  
  constructor(message: string, state: EnvironmentErrorState) {
    super(message);
    this.state = state;
    this.name = "GolosinaEnvironmentError";
  };
};

class OptionalBaseError extends Error {
  constructor(message: string, info: LinePosition | null, name: string) {
    if (info) {
      const formattedInfo = styleText("yellow", `line: ${info.line}, char: ${info.char}`);
      super(`${message} >>>>>> (${formattedInfo})\n`);
    } else {
      super(message);
    };
    
    this.name = name;
  };
};

export class GolosinaSyntaxError extends OptionalBaseError {  
  constructor(message: string, info: LinePosition) {
    super(message, info, "GolosinaSyntaxError");
  };
};

export class GolosinaTypeError extends OptionalBaseError {
  constructor(message: string, info: LinePosition | null) {
    super(message, info, "GolosinaTypeError");
  };
};

export class GolosinaRuntimeError extends OptionalBaseError {
  constructor(message: string, info: LinePosition | null) {
    super(message, info, "GolosinaRuntimeError");
  };
};

