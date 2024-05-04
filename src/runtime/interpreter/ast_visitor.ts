import Environment from "../environment";
import GolosinaTypeChecker from "./typechecker";
import AbstractVisitor from "../../types/visitor.types";
import NativeObjects from "../native/native_objects"
import MetaData from "./meta";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";
import { DataType } from "../../common";
import { SyntaxTree } from "../../frontend/ast";
import { RuntimeValues, RuntimeObjects, ParamState } from "../runtime_values"
import { ScopeIdentifier } from "../environment";
import { INSPECT_MAX_BYTES } from "buffer";

class ASTVisitor extends AbstractVisitor {
  private tc: GolosinaTypeChecker;
  private environment: Environment;
  private meta: MetaData;
  private stack: RuntimeValues.Value[];
  private context: RuntimeValues.Object;

  constructor() {
    super();
    this.tc = new GolosinaTypeChecker();
    this.environment = new Environment();
    this.meta = new MetaData();
    this.context = new RuntimeValues.Object();
    this.stack = [];
    this.initNative();
  };

  private initNative() {
    const native = new NativeObjects();

    this.environment.declare("fmt", native.getFmt);
    this.environment.declare("Object", new RuntimeValues.Object());
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

  private handlePostfixUnaryExpr(node: SyntaxTree.UnaryExpressionNode, inMember: boolean) {
    if (!node.isPrefix && this.context) {

    };
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


  public override visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode) {
    node.lhs.accept(this);
    node.rhs.accept(this);

    let uncheckedRHS = this.stack.pop() as RuntimeValues.Value;

    let uncheckedLHS = this.stack.pop() as RuntimeValues.Value;

    const { lhs, rhs } = this.tc.checkBinaryArithmetic(node.op,
      {
        info: node.lhs.info,
        value: uncheckedLHS,
      },
      {
        info: node.rhs.info,
        value: uncheckedRHS
      });


    let value: any = false;
    let left: any = lhs.value;
    let right: any = rhs.value;

    switch (node.op) {
      case "+":
        value = left + right;
        break;

      case "-":
        value = left - right;
        break;

      case "*":
        value = left * right;
        break;

      case "/":
        value = left / right;
        break;

      case "%":
        value = left % right;
        break;

      case "==":
        value = left === right;
        break;


      case "!=":
        value = left !== right;
        break;

      case ">":
        value = left > right;
        break;


      case "<":
        value = left < right;
        break;

      case ">=":
        value = left >= right;
        break;

      case "<=":
        value = left <= right;
        break;

      case "&&":
        value = left && right;
        break;

      case "||":
        value = left || right;
        break;
    };


    if (typeof value === "string") {
      this.stack.push(new RuntimeObjects.StringObject(value));
    } else if (typeof value === "boolean") {
      this.stack.push(new RuntimeObjects.BooleanObject(value));
    } else if (typeof value === "number") {
      (Number.isInteger(value)) ? this.stack.push(new RuntimeObjects.IntegerObject(value)) : this.stack.push(new RuntimeObjects.FloatObject(value));
    };

  };


  public override visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode) {

    /*
      Prefix adds directly to the storage location and then resolved
      Postfix resolves then adds to the in memory storage.
    */

    node.argument.accept(this);

    let inMember: boolean;

    if (TreeNodeTypeGuard.isMemberExpr(node.argument)) {
      inMember = true;
    } else {
      inMember = false;
    };

    const objectValue = this.stack.pop() as RuntimeObjects.ValueObject;

    const params = {
      info: node.info,
      ident: this.meta.getSymbol,
      value: objectValue
    };

    let numericObject: RuntimeObjects.NumericObject | null = null;

    switch (node.op) {
      case "++":

        if (node.isPrefix) {
          // this can encompass either float object or int object.
          numericObject = this.tc.checkUnaryExpr(params, "pre-increment");
          numericObject.value = numericObject.value + 1;
        } else {

        };

        break;

      case "--":
        if (node.isPrefix) {
          // this can encompass either float object or int object.
          numericObject = this.tc.checkUnaryExpr(params, "pre-decrement");
          numericObject.value = numericObject.value - 1;
        } else {

        };

        break;

      case "!":
    };

    if (numericObject) {
      this.stack.push(numericObject);

      (TreeNodeTypeGuard.isMemberExpr(node.argument)) ? this.context?.setMember(this.meta.getSymbol, numericObject) : this.environment.assign(this.meta.getSymbol, numericObject);
    };

  };

  public override visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode) {
    if (TreeNodeTypeGuard.isMemberExpr(node.lhs)) {
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

    if (RuntimeValueTypeGuard.isVariable(parent)) {
      prototype = parent.value;
    } else {
      prototype = parent;
    };

    this.context = prototype;
    this.meta.setSymbol = node.accessing.name;

    const retrieved = prototype.getMember(node.accessing.name);
    this.stack.push(retrieved);
  };

  public override visitCloneStmnt(node: SyntaxTree.CloneStatementNode) {
    node.cloning.accept(this);
    const resolvedPrototype = this.stack.pop() as RuntimeValues.Value;

    const ref = this.tc.checkObject({
      ident: node.cloning.name,
      info: node.cloning.info,
      value: resolvedPrototype,
      message: null
    });

    let instantiated: RuntimeValues.Object;

    if (RuntimeValueTypeGuard.isVariable(ref)) {
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

  public override visitCallExpr(node: SyntaxTree.ExpressionCallNode) {
    node.callee.accept(this);

    const value = this.stack.pop() as RuntimeValues.Value;

    const method = this.tc.checkMethod({
      ident: this.meta.getSymbol,
      info: node.info,
      value: value
    });

    if (RuntimeValueTypeGuard.isMethod(method)) {
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

    if (RuntimeValueTypeGuard.isVariable(resolved)) {
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
