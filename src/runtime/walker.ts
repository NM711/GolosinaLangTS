import Environment from "./environment";
import ASTVisitor from "./visitor";
import { NodeIdentifiers, type SyntaxTree } from "../frontend/ast";
import { RuntimeEnvironmentValues, RuntimeValueType } from "./runtime_values";


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
