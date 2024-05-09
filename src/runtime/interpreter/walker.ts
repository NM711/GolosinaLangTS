import ASTVisitor from "./ast_visitor";
import type { SyntaxTree } from "../../frontend/ast";
import { GolosinaRuntimeError, GolosinaTypeError } from "../../exceptions";


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
      try {
      node.accept(this.visitor);
        
      } catch (e) {
        if (e instanceof GolosinaRuntimeError) {
          console.error(e.name, e.message);
        } else if (e instanceof GolosinaTypeError) {
          console.error(e.name, e.message);
        } else {
          console.error("GolosinaRuntimeError: Program unexpectedly panicked!\n");
          console.log(e)
        };
        
        process.exit(1);
      };
    };
  }; 
};

export default Walker;
