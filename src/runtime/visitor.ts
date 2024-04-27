import Environment  from "./environment";
import GolosinaTypeChecker from "./typechecker";
import { DataType } from "../common";
import { NodeIdentifiers, SyntaxTree } from "../frontend/ast";
import { RuntimeValues, RuntimeObjects, RuntimeValueID } from "../runtime/runtime_values"
import { ScopeIdentifier } from "./environment";
import type { IVisitor } from "../types/visitor.types";
import { GolosinaEnvironmentError } from "../exceptions";

class MetaData {
  public assign: boolean;
  public symbol: string;

  constructor() {
    this.assign = false;
  };
   
};

class ASTVisitor implements IVisitor {
  private tc: GolosinaTypeChecker;
  private environment: Environment;
  private stack: RuntimeValues.Value[];
  private context: RuntimeValues.Object | null;
  private meta: MetaData;
   
  constructor() {
    this.tc = new GolosinaTypeChecker();
    this.environment = new Environment();
    this.meta = new MetaData();
    this.stack = [];
    this.context = null;
    this.initNative();
  };

  private initNative() {
    this.environment.declare("Object", new RuntimeValues.Object());
  };

  private prototypeLookup(accessing: SyntaxTree.IdentfierNode, prototype: RuntimeValues.Object | null) {

    /*
      Group all members within a single accessible scope, if a member has already been declared in a prototype or something just re assign it
      with the new value.
    */

    const accSymbol = accessing.name;

    while (true) {
      try {
        accessing.accept(this);
        break;
      } catch (e) {

        if (e instanceof GolosinaEnvironmentError) {
          if (prototype === null) {
            throw e;
          };

          if (prototype.members.has(accSymbol)) {
            const member = prototype.members.get(accSymbol) as SyntaxTree.BaseNodeAST;

            // kind of a hacky way to access the global scope, i only care about that when im doing member expression
            // but in this case we are assigning a value to a member which is different.

            this.environment.strict = false;
            
            member.accept(this);

            this.environment.strict = true;
            const value = this.stack.pop() as RuntimeValues.Value;
            this.environment.declare(accSymbol, value);
          };
      
          prototype = prototype.prototype;
          // console.log(e.message, this.environment)
          
        } else {
          throw e;
        };
      };
    };
  };

  public visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode) {
  };

  public visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode) {

  };

  public visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode) {
    
    /*
      1. We eval the rhs first, this way we have something to pop out.
      2. We accept the lhs but before doing so we set the runtime state to ASSIGN, this way if an ident is called, instead of resolving,
         we assign the popped rhs to it and end the ident visit.
    
      3. When a value is found in the prototype chain, assignment occurs if the lhs is that of member expression.
      4. When runtime variable value is found in ident specifically, assignment occurs cos the lhs is that of ident.
    */
  
    node.rhs.accept(this);

    const value = this.stack.pop() as RuntimeValues.Value;

    // tc validate value.

    this.meta.assign = true;

    node.lhs.accept(this);

    this.meta.assign = false;
  
    this.environment.assign(this.meta.symbol, value);
  };

  public visitMemberExpr(node: SyntaxTree.MemberExpressionNode) {
    node.parent.accept(this);
    
    const parent = this.stack.pop() as RuntimeValues.Object | RuntimeValues.Variable;
    
    this.tc.checkObject({
      ident: null,
      info: node.info,
      message: `Attempted to perform member expression on a parent that is not a valid object or a valid reference to an object value!`,
      value: parent
    });

    this.environment.pushScope(ScopeIdentifier.S_OBJECT);

    let prototype: RuntimeValues.Object;

    if (this.tc.guards.isVariable(parent)) {
      prototype = parent.value;
    } else {
      prototype = parent;
    };

    
    this.context = prototype;
    
    this.prototypeLookup(node.accessing, prototype);
    
    this.environment.popScope();
  };

  public visitCloneExpr(node: SyntaxTree.CloneExpressionNode) {
    const resolvedPrototype = this.environment.resolve(node.cloning.name);

    const ref = this.tc.checkObject({
      ident: node.cloning.name,
      info: node.cloning.info,
      value: resolvedPrototype,
      message: null
    });

    let instantiated: RuntimeValues.Object;

    if (this.tc.guards.isVariable(ref)) {
      instantiated = new RuntimeValues.Object(ref.value, node.object.members);
    } else {
      instantiated = new RuntimeValues.Object(ref, node.object.members);
    };

    this.stack.push(instantiated);
  };

  public visitCallExpr(node: SyntaxTree.ExpressionCallNode) {
    node.callee.accept(this);

    const value = this.stack.pop() as RuntimeValues.Value;
    
    const method = this.tc.checkMethod({
      ident: this.meta.symbol,
      info: node.info,
      value: value
    });


    this.tc.checkArgLengthMatch(node, method.params.length);

    this.environment.pushScope(ScopeIdentifier.S_METHOD);
    // inject ref to current object

    if (this.context) {
      this.environment.declare("this", this.context);
    };
    
    for (const param of method.params) {
      param.accept(this);
      const value = this.stack.pop() as RuntimeValues.Value;
      this.environment.declare(param.name, value);
    };

    method.block.accept(this);

    this.environment.popScope();
  };

  public visitLiteral(node: SyntaxTree.LiteralNode) {
      switch (node.type) {
      case DataType.T_BOOLEAN:
        (node.value === "true") ? this.stack.push(new RuntimeObjects.BooleanObject(true)) : this.stack.push(new RuntimeObjects.BooleanObject(false));
        break;

      case DataType.T_NULL:
        this.stack.push(new RuntimeObjects.NullObject());
        break;

      case DataType.T_INTEGER:
        this.stack.push(new RuntimeObjects.IntegerObject(parseInt(node.value)));
        break;

      case DataType.T_FLOAT:
        this.stack.push(new RuntimeObjects.FloatObject(parseFloat(node.value)));
        break;

      case DataType.T_STRING:
        this.stack.push(new RuntimeObjects.StringObject(node.value));
        break;
    };
  };

  public visitIdent(node: SyntaxTree.IdentfierNode) {    
    this.meta.symbol = node.name;

    if (this.meta.assign) {
      /*
        The idea here is that if assign is set, then we are telling the resolver to not resolve and push something to the stack.
        This is because we will handle the saved symbol ourselves.
      */
      
      return;    
    };
    
    const resolved = this.environment.resolve(node.name);
  
    if (this.tc.guards.isVariable(resolved)) {
      this.stack.push(resolved.value);      
    } else {
      this.stack.push(resolved);
    };

  };

  public visitVar(node: SyntaxTree.VariableNode) {
    let init: RuntimeValues.Object = new RuntimeObjects.NullObject();
    
    if (node.init) {
      node.init.accept(this);
      init = this.stack.pop() as RuntimeValues.Object;
    };

    const runtimeVariable = new RuntimeValues.Variable();
    runtimeVariable.isConst = node.isConst;
    runtimeVariable.value = init;

    
    this.environment.declare(node.ident.name, runtimeVariable);
  };

  public visitMethod(node: SyntaxTree.MethodNode) {
    const method = new RuntimeValues.Method(node.block, node.params);
    this.stack.push(method);
  };
  
  public visitIfStmnt(node: SyntaxTree.IfStmntNode) {

  };

  public visitReturnStmnt(node: SyntaxTree.ReturnNode) {

  };
  
  public visitBlockStmnt(node: SyntaxTree.BlockNode) {
    this.environment.pushScope(ScopeIdentifier.S_BLOCK);
    
    for (const stmnt of node.body) {
      stmnt.accept(this);
    };

    this.environment.popScope();
  };

};

export default ASTVisitor;
