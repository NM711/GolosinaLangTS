import Environment from "./environment";
import GolosinaTypeChecker from "./typechecker";
import AbstractVisitor from "../../types/visitor.types";
import NativeObjects from "../native/native_objects"
import MetaData, { DispatchID } from "./meta";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";
import { DataType } from "../../common";
import { SyntaxTree } from "../../frontend/parser/ast";
import { RuntimeValues, RuntimeObjects, ParamState } from "./runtime_values"
import { ScopeIdentifier } from "./environment";
import GolosinaExceptions from "../../errors/exceptions";
import GolosinaDataStructures from "../native/data_structures";

class Stack {
  private frames: RuntimeValues.Value[][];
  public frame: RuntimeValues.Value[];

  constructor() {
    // we init the frame and push the frame that pertains to the global execution environment.
    this.frames = [[]];
    this.frame = this.frames[0];
  };

  private updateFrame() {
    this.frame = this.frames[this.frames.length - 1];
  };

  public popFrame(): void {
    this.frames.pop();
    this.updateFrame();
  };

  public pushFrame(): void {
    this.frames.push([]);
    this.updateFrame();
  };

  public popValue(): RuntimeValues.Value {
    return this.frame.pop() as RuntimeValues.Value;
  };

  public pushValue(value: RuntimeValues.Value): void {
    this.frame.push(value);
  };
};


class ASTVisitor extends AbstractVisitor {
  private tc: GolosinaTypeChecker;
  private environment: Environment;
  private meta: MetaData;
  private stack: Stack;
  private context: RuntimeValues.Object;

  constructor() {
    super();
    this.tc = new GolosinaTypeChecker();
    this.environment = new Environment();
    this.meta = new MetaData();
    this.context = new RuntimeValues.Object();
    this.stack = new Stack();
    this.initNative();
  };

  private initNative() {
    const native = new NativeObjects();
    this.environment.declare("containers", native.getContainers);
    this.environment.declare("fmt", native.getFmt);
    this.environment.declare("os", native.getOS);
    this.environment.declare("Object", new RuntimeValues.Object());
  };

  private convertV8ValueToGolosinaObj(value: any) {
    switch (typeof value) {
      case "string":
        return new RuntimeObjects.StringObject(value);

      case "boolean":
        return new RuntimeObjects.BooleanObject(value);

      case "object":
        if (RuntimeValueTypeGuard.isObject(value)) {
          return value;
        } else if (value.constructor === Array) {
          const vector = new GolosinaDataStructures.Vector();
          vector.setElements = value;
          return vector.retreive;
        } else {
          return new RuntimeObjects.NullObject();
        };

      case "number":
        return (Number.isInteger(value)) ? new RuntimeObjects.IntegerObject(value) : new RuntimeObjects.FloatObject(value);

      case "undefined":
        return new RuntimeObjects.NullObject();

      default:
        console.log("Unexpected conversion!");
        process.exit(1);
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

    const runtimeArgs: RuntimeValues.Object[] = []

    for (const arg of node.arguments) {
      arg.accept(this);
      const value = this.stack.popValue();

      if (value === undefined) {
        console.log(value, arg)
      }
      
      if (!RuntimeValueTypeGuard.isObject(value)) {
        throw new GolosinaExceptions.Runtime.RuntimeError(`Arguments passed to a method call is of invalid object type value!`, arg.info);
      };

      runtimeArgs.push(value);
    };

    const value = nativeMethod.exec(...runtimeArgs);

    // if the native fn returns something other than undefined, we tell the dispatcher at the end of execution that this is supposed to return something.

    if (value) {
      this.meta.setDispatchID = DispatchID.RETURN;
    };
    
    // we need to convert native v8 values into a representation we can read in golosina.
    const newObject = this.convertV8ValueToGolosinaObj(value);
    this.stack.pushValue(newObject);
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
    this.environment.declare("this", this.context);

    for (let i = 0; i < method.params.length; ++i) {
      const arg = node.arguments[i];
      const param = method.params[i];
      arg.accept(this);
      const value = this.stack.popValue();
      this.environment.declare(param.name, value);
    };

    method.block.accept(this);
    this.environment.popScope();
  };

  public override visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode) {
    node.lhs.accept(this);
    node.rhs.accept(this);

    let uncheckedRHS = this.stack.popValue();

    let uncheckedLHS = this.stack.popValue();

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
      this.stack.pushValue(new RuntimeObjects.StringObject(value));
    } else if (typeof value === "boolean") {
      this.stack.pushValue(new RuntimeObjects.BooleanObject(value));
    } else if (typeof value === "number") {
      (Number.isInteger(value)) ? this.stack.pushValue(new RuntimeObjects.IntegerObject(value)) : this.stack.pushValue(new RuntimeObjects.FloatObject(value));
    };

  };


  public override visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode) {

    /*
      Postfix, increments but pushes the value before the increment to the stack.
      Prefix, increments and pushes the incremented value to the stack.
    */

    node.argument.accept(this);

    const objectValue = this.stack.popValue() as RuntimeObjects.ValueObject;

    const params = {
      info: node.info,
      ident: this.meta.getSymbol,
      value: objectValue
    };

    switch (node.op) {
      case "++": {
        const numeric = this.tc.checkUnaryExpr(params, "pre-increment");

        if (node.isPrefix) {
          // this can encompass either float object or int object.
          numeric.value += 1;
          this.stack.pushValue(numeric);
          (TreeNodeTypeGuard.isMemberExpr(node.argument)) ? this.context.setMember(this.meta.getSymbol, numeric) : this.environment.assign(this.meta.getSymbol, numeric);
          break;
        } else {

          // since the object will modify the int directly even after we push due to the referential nature of node objects.
          // we need to create a new one, then perform the operation on the original.

          const postNumeric = (!Number.isInteger(numeric.value)) ? new RuntimeObjects.FloatObject(numeric.value) : new RuntimeObjects.IntegerObject(numeric.value);
          this.stack.pushValue(postNumeric);
          numeric.value += 1;
          (TreeNodeTypeGuard.isMemberExpr(node.argument)) ? this.context.setMember(this.meta.getSymbol, numeric) : this.environment.assign(this.meta.getSymbol, numeric);
        };

        break;
      };

      case "--": {
        const numeric = this.tc.checkUnaryExpr(params, "pre-decrement");

        if (node.isPrefix) {
          // this can encompass either float object or int object.
          numeric.value -= 1;
          this.stack.pushValue(numeric);
          (TreeNodeTypeGuard.isMemberExpr(node.argument)) ? this.context.setMember(this.meta.getSymbol, numeric) : this.environment.assign(this.meta.getSymbol, numeric);

        } else {

          // since the object will modify the int directly even after we push due to the referential nature of node objects.
          // we need to create a new one, then perform the operation on the original.

          const postNumeric = (!Number.isInteger(numeric.value)) ? new RuntimeObjects.FloatObject(numeric.value) : new RuntimeObjects.IntegerObject(numeric.value);
          this.stack.pushValue(postNumeric);
          numeric.value -= 1;
          (TreeNodeTypeGuard.isMemberExpr(node.argument)) ? this.context.setMember(this.meta.getSymbol, numeric) : this.environment.assign(this.meta.getSymbol, numeric);
        };

        break;

      };

      case "!": {
        if (node.isPrefix) {
          const not = new RuntimeObjects.BooleanObject(!objectValue.value);
          this.stack.pushValue(not);
        };

        break;
      };
    };
  };

  public override visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode) {
    if (TreeNodeTypeGuard.isMemberExpr(node.lhs)) {
      node.lhs.accept(this);

      node.rhs.accept(this);

      const value = this.stack.popValue();

      this.context.setMember(this.meta.getSymbol, value);

    } else {
      node.rhs.accept(this);
      const value = this.stack.popValue();
      this.environment.assign(node.lhs.name, value);
    };
  };

  public override visitMemberExpr(node: SyntaxTree.MemberExpressionNode) {
    node.parent.accept(this);

    const parent = this.stack.popValue() as RuntimeValues.Object | RuntimeValues.Variable;

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
    this.stack.pushValue(retrieved);
  };

  public override visitCloneExpr(node: SyntaxTree.CloneExpressionNode) {
    node.cloning.accept(this);
    const resolvedPrototype = this.stack.popValue();

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
      const value = this.stack.popValue();
      instantiated.members.set(member.key.name, value);
    };

    this.stack.pushValue(instantiated);
  };

  public override visitCallExpr(node: SyntaxTree.ExpressionCallNode) {
    node.callee.accept(this);
    const value = this.stack.popValue();
    const method = this.tc.checkMethod({
      ident: this.meta.getSymbol,
      info: node.info,
      value: value
    });

    this.stack.pushFrame();

    if (RuntimeValueTypeGuard.isMethod(method)) {
      this.handleMethodCall(node, method);
    } else {
      this.handleNativeMethodCall(node, method);
    };

    let returned: RuntimeValues.Value | null = null;

    if (this.meta.getDispatchID === DispatchID.RETURN) {
      this.meta.resetDispatchID();
      returned = this.stack.popValue();
    };

    this.stack.popFrame();


    if (returned) {
      this.stack.pushValue(returned);
    };
  };

  public override visitLiteral(node: SyntaxTree.LiteralNode) {
    switch (node.type) {
      case DataType.T_BOOLEAN:
        (node.value === "true") ? this.stack.pushValue(new RuntimeObjects.BooleanObject(true)) : this.stack.pushValue(new RuntimeObjects.BooleanObject(false));
        break;

      case DataType.T_NULL:
        this.stack.pushValue(new RuntimeObjects.NullObject());
        break;

      case DataType.T_INTEGER:
        this.stack.pushValue(new RuntimeObjects.IntegerObject(parseInt(node.value)));
        break;

      case DataType.T_FLOAT:
        this.stack.pushValue(new RuntimeObjects.FloatObject(parseFloat(node.value)));
        break;

      case DataType.T_STRING:
        this.stack.pushValue(new RuntimeObjects.StringObject(node.value));
        break;
    };
  };

  public override visitIdent(node: SyntaxTree.IdentfierNode) {
    this.meta.setSymbol = node.name;

    const resolved = this.environment.resolve(node.name);
    if (RuntimeValueTypeGuard.isVariable(resolved)) {
      (!resolved.value) ? this.stack.pushValue(new RuntimeObjects.NullObject()) : this.stack.pushValue(resolved.value);
    } else {
      this.stack.pushValue(resolved);
    };
  };

  public override visitVar(node: SyntaxTree.VariableNode) {
    let init: RuntimeValues.Object = new RuntimeObjects.NullObject();

    if (node.init) {
      node.init.accept(this);
      init = this.stack.popValue() as RuntimeValues.Object;
    };

    const runtimeVariable = new RuntimeValues.Variable();
    runtimeVariable.isConst = node.isConst;
    runtimeVariable.value = init;

    this.environment.declare(node.ident.name, runtimeVariable);
  };

  public override visitMethodExpr(node: SyntaxTree.MethodExpressionNode) {
    const method = new RuntimeValues.Method(node.block, node.params);
    this.stack.pushValue(method);
  };

  public override visitCaseStmnt(node: SyntaxTree.CaseStatementNode): void {
    node.discriminant.accept(this);

    const discriminant = this.stack.popValue() as RuntimeObjects.ValueObject;

    for (const test of node.tests) {
      if (!test.isDefault && test.condition) {
        test.condition.accept(this);
        const expr = this.stack.popValue() as RuntimeObjects.ValueObject;

        if ((expr && discriminant) && expr.value === discriminant.value) {
          test.block.accept(this);
        };

      } else {
        test.block.accept(this);
      };

      if (this.meta.getDispatchID === DispatchID.BREAK) {
        this.meta.resetDispatchID();
        break;
      };
    };
  };

  public override visitIfStmnt(node: SyntaxTree.IfStatementNode) {
    node.condition.accept(this);
    const expr = this.stack.popValue() as RuntimeObjects.ValueObject;

    if (expr && expr.value) {
      node.block.accept(this);
    } else if (node.alternate) {
      node.alternate.accept(this);
    };
  };

  public override visitForStmnt(node: SyntaxTree.ForStatementNode): void {
    this.environment.pushScope(ScopeIdentifier.S_LOOP);
    node.init.accept(this);

    while (true) {
      node.condition.accept(this);
      const expr = this.stack.popValue() as RuntimeObjects.ValueObject;

      if (!expr || (expr && !expr.value)) {
        break;
      };

      node.block.accept(this);


      if (this.meta.getDispatchID === DispatchID.CONTINUE || this.meta.getDispatchID === DispatchID.NONE) {
        node.update.accept(this);
      };

      if (this.meta.getDispatchID === DispatchID.BREAK) {
        this.meta.resetDispatchID();
        break;
      } else if (this.meta.getDispatchID === DispatchID.CONTINUE) {
        this.meta.resetDispatchID();
        continue;
      } else if (this.meta.getDispatchID === DispatchID.RETURN) {
        break;
      };
    };

    this.environment.popScope();
  };

  public override visitWhileStmnt(node: SyntaxTree.WhileStatementNode): void {
    while (true) {
      node.condition.accept(this);
      const expr = this.stack.popValue() as RuntimeObjects.ValueObject;

      if (!expr || (expr && !expr.value)) {
        break;
      };

      node.block.accept(this);

      if (this.meta.getDispatchID === DispatchID.BREAK) {
        this.meta.resetDispatchID();
        break;
      } else if (this.meta.getDispatchID === DispatchID.CONTINUE) {
        this.meta.resetDispatchID();
        continue;
      } else if (this.meta.getDispatchID === DispatchID.RETURN) {
        break;
      };
    };
  };

  public override visitReturnStmnt(node: SyntaxTree.ReturnStatementNode) {
    this.meta.setDispatchID = DispatchID.RETURN;
    node.value.accept(this);
  };

  public override visitBreakStmnt(): void {
    this.meta.setDispatchID = DispatchID.BREAK;
  };

  public override visitContinueStmnt(): void {
    this.meta.setDispatchID = DispatchID.CONTINUE;
  };

  public override visitBlockStmnt(node: SyntaxTree.BlockNode) {
    this.environment.pushScope(ScopeIdentifier.S_BLOCK);

    for (const stmnt of node.body) {

      if (this.meta.getDispatchID !== DispatchID.NONE) {
        break;
      };

      stmnt.accept(this);
    };

    this.environment.popScope();
  };

};

export default ASTVisitor;
