import ASTVisitor from "./ast_visitor";
import type { SyntaxTree } from "../../frontend/ast";


/*
  Im learning the visitor pattern for a clean c++ implementation, so this typescript implementation is but a test run.
  I could typecast like crazy but, Im giving the visitor pattern a try for traversing the tree.
*/


class Walker {
  private source: SyntaxTree.Program;
  private visitor: ASTVisitor;
  
  constructor() {
    this.visitor = new ASTVisitor();
  };
  
  public set setSource(source: SyntaxTree.Program) {
    this.source = source;
  };

  public execute() {
    for (const node of this.source) {
      node.accept(this.visitor);
    };
  }; 
};

export default Walker;
