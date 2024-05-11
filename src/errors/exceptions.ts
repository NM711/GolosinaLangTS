import { styleText } from "util";
import { EnvironmentErrorState } from "../runtime/core/environment";
import { LinePosition, TokenInformation } from "../frontend/lexer/token";

namespace GolosinaExceptions {

  function formatLinePosition(at: LinePosition) {
    return styleText("yellow", `line: ${at.line}, char: ${at.char}`);
  };

  export namespace Runtime {
    export class EnvironmentError extends Error {
      constructor(ident: string, code: EnvironmentErrorState) {
        super();

        switch (code) {
          case EnvironmentErrorState.ENV_ERR_CONST_RE_ASSIGNMENT:
            this.message = `Attempted to perform constant re-assignment at "${ident}"!`;
          break;

          case EnvironmentErrorState.ENV_ERR_DECL_EXISTS:
            this.message = `Attempted to perform a re-declaration at "${ident}"!`;
          break;

          case EnvironmentErrorState.ENV_ERR_UNRESOLVED:
            this.message = `Could not resolve symbol at "${ident}"!`;
          break;
        };

        this.message += ` (ENV_STATE: ${code})`;
        this.name = "EnvironmentError";
      };
    };

    export class RuntimeError extends Error {
      constructor(message: string, info: TokenInformation | null = null) {
        super(message);
        this.name = "RuntimeError";
      };
    };

    export class TypeError extends Error {
      constructor(message: string, info: TokenInformation) {
        super(message);
        this.name = "TypeError";
      };
    };
  };

  export namespace Frontend {
    export class SyntaxError extends Error {
      public at: LinePosition;
      public start: LinePosition | undefined;
      public end: LinePosition | undefined;
      public startIndex: number;
      public endIndex: number;      
      constructor(message: string, at: LinePosition) {
        super(message);
        this.at = at;
        this.name = "SyntaxError";
      }
    };
  };

};

export default GolosinaExceptions;
