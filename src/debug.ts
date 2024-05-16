import { Token } from "./frontend/lexer/token";
import type { SyntaxTree } from "./frontend/parser/ast";

class GolosinaDebug {
  public logTokens(tokens: Token[]): void {
    console.log(JSON.stringify(tokens, null, 2));
  };

  public logAST(source: SyntaxTree.Program): void {
    console.log(JSON.stringify(source, null, 2));
  };
};

export default GolosinaDebug;
