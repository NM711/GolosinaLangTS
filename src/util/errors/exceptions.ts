import { EnvironmentErrorState } from "../../runtime/core/environment";
import { TokenInformation } from "../../frontend/lexer/token";

namespace GolosinaExceptions {
  export namespace Backend {
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

        this.name = "EnvironmentError";
      };
    };

    export class RuntimeError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "RuntimeError";
      };
    };

    export class TypeError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "TypeError";
      };
    };
  };

  export namespace Frontend {

    class FrontendError extends Error {
      public at: TokenInformation;
    
      constructor(message: string, info: TokenInformation) {
        super(message);
        this.at = info;
        this.name = "SyntaxError";
      };
    };

    export class TokenizerError extends FrontendError {
      constructor(message: string, info: TokenInformation) {
        super(message, info);
      };
    };


    export class SyntaxError extends FrontendError {
      public path: string;
      // public offsets: LineOffset;
      
      constructor(message: string, info: TokenInformation, path: string) {
        super(message, info);
        this.path = path;
      };
    };
  };
};

export default GolosinaExceptions;
