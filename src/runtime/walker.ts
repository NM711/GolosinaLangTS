import Environment from "./environment";
import { NodeIdentifiers, type SyntaxTree } from "../frontend/ast";


/*
  Im learning the visitor pattern for a clean c++ implementation, so this typescript implementation is but a test run.
  I could typecast like crazy but, Im giving the visitor pattern a try for traversing the tree.
*/

class Visitor {
  public visit() {
  };
};

class Walker {
  private source: SyntaxTree.Program;
  private environment: Environment;

  constructor() {
    this.environment = new Environment();  
  };
  
  public set setSource(source: SyntaxTree.Program) {
    this.source = source;
  };

  public evalBinaryExpr(node: SyntaxTree.BinaryExpressionNode) {
  
  };

  public eval(node: SyntaxTree.BaseNodeAST) {
    switch (node.id) {
      case NodeIdentifiers.N_VARIABLE:
        // this.environment.declare()  
      break;
        
      case NodeIdentifiers.N_METHOD:

      break;

      case NodeIdentifiers.N_BINARY_EXPR:
      return this.evalBinaryExpr(node);
        
      case NodeIdentifiers.N_UNARY_EXPR:
    }
  };

  public execute() {
    for (const node of this.source) {
      this.eval(node);
    }
  }; 
};
