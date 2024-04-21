import type { LinePosition } from "./frontend/token.types";

export class GolosinaSyntaxError extends Error {  
  constructor(message: string, info: LinePosition) {
    super(`${message} >>>>>> (line: ${info.line}, char: ${info.char})\n`);
  };
};

export class GolosinaEnvironmentError extends Error {
  constructor(message: string) {
    super(message) 
  };
};
