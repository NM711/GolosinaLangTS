import Environment from "./environment";
import GolosinaTypeChecker from "./typechecker";
import AbstractVisitor from "../types/visitor.types";
import NativeObjects from "./native/native_objects"
import { DataType } from "../common";
import { SyntaxTree } from "../frontend/ast";
import { RuntimeValues, RuntimeObjects, ParamState } from "../runtime/runtime_values"
import { ScopeIdentifier } from "./environment";
import { GolosinaTypeError } from "../exceptions";

class MetaData {
  public assign: boolean;
  private symbol: string;
  private collection: boolean;

  constructor() {
    this.assign = false;
    this.collection = true;
  };

  public set setSymbolCollection(active: boolean) {
    this.collection = active;
  };

  public set setSymbol(newSymbol: string) {
    if (this.collection) {
      this.symbol = newSymbol;
    };
  };

  public get getSymbol() {
    return this.symbol;
  };
};

class Handler {
  private stack: RuntimeValues.Value[];
  private tc: GolosinaTypeChecker;
  private meta: MetaData;
  
  constructor(stack: RuntimeValues.Value[], tc: GolosinaTypeChecker, meta: MetaData) {
    this.stack = stack;
    this.tc = tc;
    this.meta = meta;
  };

  public nativeMethodCall(node: SyntaxTree.ExpressionCallNode, nativeM) {
    if (nativeMethod.paramState === ParamState.FIXED) {
      this.tc.checkArgLengthMatch({
        info: node.callee.info,
        ident: this.meta.getSymbol,
        paramsLength: nativeMethod.exec.length,
        argsLength: node.arguments.length, 
      });
    };

    const values: RuntimeObjects.TypeValue[] = []

    for (const arg of node.arguments) {
      arg.accept(this);

      const value = this.stack.pop() as RuntimeObjects.ValueObject;

      // run a typecheck here make sure the values are of value objects.

      values.push(value.value);
    };

    nativeMethod.exec(values);
  };

  public methodCall() {
    
  };
   
};

class ASTVisitor extends AbstractVisitor {
  private tc: GolosinaTypeChecker;
  private environment: Environment;
  private stack: RuntimeValues.Value[];
  private context: RuntimeValues.Object | null;
  private meta: MetaData;

  constructor() {
    super();
    this.tc = new GolosinaTypeChecker();
    this.environment = new Environment();
    this.meta = new MetaData();
    this.stack = [];
    this.context = null;
    this.initNative();
  };

  private initNative() {
    const native = new NativeObjects();

    this.environment.declare("fmt", native.getFmt);
    this.environment.declare("Object", new RuntimeValues.Object());
  };

  public override visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode) {
    node.lhs.accept(this);
    node.rhs.accept(this);

    const right = this.stack.pop() as RuntimeValues.Value;

    const left = this.stack.pop() as RuntimeValues.Value;

    this.tc.checkBinaryArithmetic(node.op,
      {
        info: node.lhs.info,
        value: left,
      },
      {
        info: node.rhs.info,
        value: right
      });

    // both will 100% be valid object values but i still need ts to infer so.

    if (this.tc.guards.isObjectValue(left) && this.tc.guards.isObjectValue(right)) {
      // Refactor later once complete
      switch (node.op) {
        case "+": {
          if (left.isString() && right.isString()) {
            this.stack.push(new RuntimeObjects.StringObject(left.value + right.value));
          } else if ((left.isFloat() && right.isInt()) || (left.isInt() && right.isFloat())) {
            this.stack.push(new RuntimeObjects.FloatObject(left.value + right.value));
          } else if (left.isInt() && right.isInt()) {
            this.stack.push(new RuntimeObjects.IntegerObject(left.value + right.value));
          };

          break;
        };

        case "-": {
          if ((left.isFloat() && right.isInt()) || (left.isInt() && right.isFloat())) {
            this.stack.push(new RuntimeObjects.FloatObject(left.value - right.value));
          } else if (left.isInt() && right.isInt()) {
            this.stack.push(new RuntimeObjects.IntegerObject(left.value - right.value));
          };

          break;
        };

        case "*": {
          if ((left.isFloat() && right.isInt()) || (left.isInt() && right.isFloat())) {
            this.stack.push(new RuntimeObjects.FloatObject(left.value * right.value));
          } else if (left.isInt() && right.isInt()) {
            this.stack.push(new RuntimeObjects.IntegerObject(left.value * right.value));
          };

          break;
        };
        case "/": {
          if ((left.isFloat() && right.isInt()) || (left.isInt() && right.isFloat())) {
            this.stack.push(new RuntimeObjects.FloatObject(left.value / right.value));
          } else if (left.isInt() && right.isInt()) {
            this.stack.push(new RuntimeObjects.IntegerObject(left.value / right.value));
          };

          break;
        };
        case "%": {
          if ((left.isFloat() && right.isInt()) || (left.isInt() && right.isFloat())) {
            this.stack.push(new RuntimeObjects.FloatObject(left.value % right.value));
          } else if (left.isInt() && right.isInt()) {
            this.stack.push(new RuntimeObjects.IntegerObject(left.value % right.value));
          };

          break;
        };

        case "==": {
          this.stack.push(new RuntimeObjects.BooleanObject(left.value === right.value));
          break;
        };

        case "!=": {
          this.stack.push(new RuntimeObjects.BooleanObject(left.value !== right.value));
          break;
        };

        case ">": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(left.value > right.value));
          };
          break;
        };

        case "<": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(left.value < right.value));
          };

          break;

        };

        case ">=": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(left.value >= right.value));
          };

          break;
        };

        case "<=": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(left.value <= right.value));
          };

          break;
        };

        case "&&": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(Boolean(left.value && right.value)));
          };

          break;

        };

        case "||": {
          if (left.value && right.value) {
            this.stack.push(new RuntimeObjects.BooleanObject(Boolean(left.value || right.value)));
          };

          break;

        };
      };
    };
  };

  private handlePrefixUnaryExpr(node: SyntaxTree.UnaryExpressionNode, inMember: boolean) {
      if (node.isPrefix && this.context) {
        const objectValue = this.stack.pop() as RuntimeObjects.ValueObject;
        
        const params = {
          info: node.info,
          ident: this.meta.getSymbol,
          value: objectValue
        };

        switch (node.op) {
          case "++": {
            const numeric = this.tc.checkUnaryExpr(params, "pre-increment");
            const preIncrement = new RuntimeObjects.IntegerObject(numeric.value + 1);
            this.stack.push(preIncrement);

            if (inMember) {
              this.context.setMember(this.meta.getSymbol, preIncrement);
            } else {
              this.environment.assign(this.meta.getSymbol, preIncrement)
            };
          
            break;
          };

          case "--": {
            const numeric = this.tc.checkUnaryExpr(params, "pre-decrement");
            const preDecrement = new RuntimeObjects.IntegerObject(numeric.value - 1);
            this.stack.push(preDecrement);

            if (inMember) {
              this.context.setMember(this.meta.getSymbol, preDecrement);
            } else {
              this.environment.assign(this.meta.getSymbol, preDecrement)
            };
            
            break;
          };

          case "!": {
            const not = new RuntimeObjects.BooleanObject(!objectValue.value);
            this.stack.push(not);
            break;
          };
        };
      };    
  };

  private handlePostfixUnaryExpr() {
    
  };

  public override visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode) {

    /*
      Prefix adds directly to the storage location and then resolved
      Postfix resolves then adds to the in memory storage.
    */

    console.log(node.argument)
    node.argument.accept(this);

    let memberMode: boolean;

    if (this.tc.guards.isMemberExpr(node.argument)) {
      memberMode = true;
    } else {
      memberMode = false;
    };
    
    this.handlePrefixUnaryExpr(node, memberMode);

  };

  public override visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode) {
    if (this.tc.guards.isMemberExpr(node.lhs)) {
      node.lhs.accept(this);

      node.rhs.accept(this);

      const value = this.stack.pop() as RuntimeValues.Value;
      
      if (this.context) {
        this.context.setMember(this.meta.getSymbol, value);
      };

    } else {
      node.rhs.accept(this);
      const value = this.stack.pop() as RuntimeValues.Value;
      this.environment.assign(node.lhs.name, value);
    };
  };

  public override visitMemberExpr(node: SyntaxTree.MemberExpressionNode) {
    node.parent.accept(this);

    const parent = this.stack.pop() as RuntimeValues.Object | RuntimeValues.Variable;

    this.tc.checkObject({
      ident: null,
      info: node.info,
      message: `Attempted to perform member expression on a parent that is not a valid object or a valid reference to an object value!`,
      value: parent
    });

    let prototype: RuntimeValues.Object;

    if (this.tc.guards.isVariable(parent)) {
      prototype = parent.value;
    } else {
      prototype = parent;
    };

    this.context = prototype;
    this.meta.setSymbol = node.accessing.name;

    const retrieved = prototype.getMember(node.accessing.name);
    this.stack.push(retrieved);
  };

  public override visitCloneExpr(node: SyntaxTree.CloneExpressionNode) {
    node.cloning.accept(this);
    const resolvedPrototype = this.stack.pop() as RuntimeValues.Value;

    const ref = this.tc.checkObject({
      ident: node.cloning.name,
      info: node.cloning.info,
      value: resolvedPrototype,
      message: null
    });

    let instantiated: RuntimeValues.Object;

    if (this.tc.guards.isVariable(ref)) {
      instantiated = new RuntimeValues.Object(ref.value);
    } else {
      instantiated = new RuntimeValues.Object(ref);
    };

    for (const member of node.object.members) {
      member.value.accept(this);
      const value = this.stack.pop() as RuntimeValues.Value;
      instantiated.members.set(member.key.name, value);
    };

    this.stack.push(instantiated);
  };

  private handleNativeMethodCall(node: SyntaxTree.ExpressionCallNode, nativeMethod: RuntimeValues.MethodNative) {
    if (nativeMethod.paramState === ParamState.FIXED) {
      this.tc.checkArgLengthMatch({
        info: node.callee.info,
        ident: this.meta.getSymbol,
        paramsLength: nativeMethod.exec.length,
        argsLength: node.arguments.length, 
      });
    };

    const values: RuntimeObjects.TypeValue[] = []

    for (const arg of node.arguments) {
      arg.accept(this);

      const value = this.stack.pop() as RuntimeObjects.ValueObject;

      // run a typecheck here make sure the values are of value objects.

      values.push(value.value);
    };

    nativeMethod.exec(values);
  };

  private handleMethodCall(node: SyntaxTree.ExpressionCallNode, method: RuntimeValues.Method) {
    this.tc.checkArgLengthMatch({
      info: node.callee.info,
      ident: this.meta.getSymbol,
      paramsLength: method.params.length,
      argsLength: node.arguments.length  
    });
    
    this.environment.pushScope(ScopeIdentifier.S_METHOD);
    // inject ref to current object

    if (this.context) {
      this.environment.declare("this", this.context);
    };

    for (let i = 0; i < method.params.length; ++i) {
      const arg = node.arguments[i];
      const param = method.params[i];
      arg.accept(this);
      const value = this.stack.pop() as RuntimeValues.Value;
      this.environment.declare(param.name, value);
    };

    method.block.accept(this);

    this.environment.popScope();
  };

  public override visitCallExpr(node: SyntaxTree.ExpressionCallNode) {
    node.callee.accept(this);

    const value = this.stack.pop() as RuntimeValues.Value;

    const method = this.tc.checkMethod({
      ident: this.meta.getSymbol,
      info: node.info,
      value: value
    });

    if (this.tc.guards.isMethod(method)) {
      this.handleMethodCall(node, method);

    } else {
      this.handleNativeMethodCall(node, method);
    };

  };

  public override visitLiteral(node: SyntaxTree.LiteralNode) {
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

  public override visitIdent(node: SyntaxTree.IdentfierNode) {
    this.meta.setSymbol = node.name;

    const resolved = this.environment.resolve(node.name);
    if (this.tc.guards.isVariable(resolved)) {
      this.stack.push(resolved.value);
    } else {
      this.stack.push(resolved);
    };

  };

  public override visitVar(node: SyntaxTree.VariableNode) {
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

  public override visitMethod(node: SyntaxTree.MethodNode) {
    const method = new RuntimeValues.Method(node.block, node.params);
    this.stack.push(method);
  };

  public override visitIfStmnt(node: SyntaxTree.IfStmntNode) {
    node.expression.accept(this);
    const exprValue = this.stack.pop() as RuntimeObjects.ValueObject;

    if (exprValue && exprValue.value) {
      node.block.accept(this);
    } else if (node.alternate) {
      node.alternate.accept(this);
    };
  };

  public override visitReturnStmnt(node: SyntaxTree.ReturnNode) {
    node.value.accept(this);
  };

  public override visitBlockStmnt(node: SyntaxTree.BlockNode) {
    this.environment.pushScope(ScopeIdentifier.S_BLOCK);

    for (const stmnt of node.body) {
      stmnt.accept(this);
    };

    this.environment.popScope();
  };

};

export default ASTVisitor;
