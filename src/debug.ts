import { Token } from "./frontend/lexer/token";
import type { SyntaxTree } from "./frontend/parser/ast";

class GolosinaDebug {
  public logTokens(tokens: Token[]): void {
    for (const token of tokens) {
      console.log(token);
    };
  };

  public logAST(source: SyntaxTree.Program): void {
    console.log(JSON.stringify(source, null, 2));
  };
};

export default GolosinaDebug;
