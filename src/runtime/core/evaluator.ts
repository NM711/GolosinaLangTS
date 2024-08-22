import VisitorTypes from "../../types/visitor.types";
import { SyntaxTree } from "../../frontend/parser/ast";
import { RuntimeObjects, RuntimeValues } from "./runtime_values";
import { DataType } from "../../util/common";
import GolosinaTypeChecker from "./typechecker";
import Environment, { ScopeIdentifier } from "./environment";
import RuntimeValueTypeGuard from "./runtime_value_guards";
import GolosinaExceptions from "../../util/errors/exceptions";
import NativeObjects from "../native/native_objects";
import ChildProcess from "node:child_process";

enum DispatchState {
  NONE,
  BREAK,
  CONTINUE,
  RETURN,
};

/**
  Context stack, used to keep track of the context of the currently called method while not losing the context of the previous
  ones once complete.
*/

class Context {
  private stack: RuntimeValues.Object[];
  public updateContext: boolean;

  constructor() {
    this.stack = [];
    this.updateContext = false;
  };

  public get getAll() {
    return this.stack;
  };
  public get get() {
    return this.stack.pop();
  };

  public push(ctx: RuntimeValues.Object) {
    this.stack.push(ctx);
  };
};

/**
  Managers the dispatcher state.
*/

class DispatchManager {
  public state: DispatchState;

  constructor() {
    this.reset();
  };

  private reset() {
    this.state = DispatchState.NONE;
  }

  public set(state: DispatchState) {
    this.state = state;
  };

  public get get() {
    let state = this.state;
    this.reset();
    return state;
  };
};


class ASTEvaluator extends VisitorTypes.AbstractVisitor<RuntimeValues.AbstractValue> {
  private environment: Environment;
  private tc: GolosinaTypeChecker;
  private dispatcher: DispatchManager;
  public context: Context;

  constructor() {
    super();
    this.environment = new Environment();
    this.tc = new GolosinaTypeChecker();
    this.dispatcher = new DispatchManager();
    this.context = new Context();
    this.inject();
  };

  /**
    Converts V8 runtime values to golosina objects.
  */

  private conversion(value: any): RuntimeValues.AbstractValue {
    if (typeof value === "string") {
      return new RuntimeObjects.StringObject(value);
    } else if (typeof value === "number") {
      return (Number.isInteger(value)) ? new RuntimeObjects.IntegerObject(value) : new RuntimeObjects.FloatObject(value);
    } else if (typeof value === "undefined") {
      return new RuntimeObjects.NullObject();
    } else if (typeof value === "object") {

      if (RuntimeValueTypeGuard.isObject(value)) {
        return value;
      } else if (value.constructor === Array) {
        const vec = new RuntimeObjects.VectorObject();
        vec.setElements(value);
        return vec;
      } else {
        return new RuntimeObjects.NullObject();
      }

    } else {
      throw new GolosinaExceptions.Backend.RuntimeError(`Unexpected conversion from v8 runtime value to golosina runtime value!`);
    };

  };

  /**
    Injects objects into the environment
  */

  private inject() {
    this.environment.declare("Object", new RuntimeValues.Object());
    this.environment.declare("fmt", NativeObjects.getFmt);
    this.environment.declare("os", NativeObjects.getOS);
    this.environment.declare("containers", NativeObjects.getContainers);
  };

  public override visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): RuntimeValues.AbstractValue {
    const { lhs, rhs } = this.tc.checkBinaryArithmetic(node.op, node.lhs.acceptEvalVisitor(this), node.rhs.acceptEvalVisitor(this));
    let left: any = lhs.primitive;
    let right: any = rhs.primitive;
    let value: any = null;

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
      return new RuntimeObjects.StringObject(value);
    } else if (typeof value === "boolean") {
      return new RuntimeObjects.BooleanObject(value);
    } else if (typeof value === "number") {
      return (Number.isInteger(value)) ? new RuntimeObjects.IntegerObject(value) : new RuntimeObjects.FloatObject(value);
    } else {
      // just return null if nothing else matches/
      return new RuntimeObjects.NullObject();
    };
  };

  public override visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): RuntimeValues.AbstractValue {
    const arg = node.argument.acceptEvalVisitor(this);
    const evaled = this.tc.checkUnaryExpr(arg, node.op);

    switch (node.op) {
      case "++":
        if (node.isPrefix && evaled.isNumeric()) {
          evaled.primitive += 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);
          return evaled;
        };

        if (evaled.isFloat()) {
          const old = new RuntimeObjects.FloatObject(evaled.primitive);
          evaled.primitive += 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);

          return old;
        } else if (evaled.isInt()) {
          const old = new RuntimeObjects.IntegerObject(evaled.primitive);
          evaled.primitive += 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);

          return old;
        };

        break;

      case "--":

        if (node.isPrefix && evaled.isNumeric()) {
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);

          return evaled;
        };

        if (evaled.isFloat()) {
          const old = new RuntimeObjects.FloatObject(evaled.primitive);
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);

          return old;
        } else if (evaled.isInt()) {
          const old = new RuntimeObjects.IntegerObject(evaled.primitive);
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolvedSymbol, evaled);
          return old;
        };
        break;
    };

    if (node.isPrefix) {
      switch (node.op) {
        case "+":
          if (evaled.isInt()) {
            return new RuntimeObjects.IntegerObject(+evaled.primitive);
          } else if (evaled.isFloat()) {
            return new RuntimeObjects.FloatObject(+evaled.primitive);
          };
          break;

        case "-":
          if (evaled.isInt()) {
            return new RuntimeObjects.IntegerObject(-evaled.primitive);
          } else if (evaled.isFloat()) {
            return new RuntimeObjects.FloatObject(-evaled.primitive);
          };
          break;

        case "!":
          return new RuntimeObjects.BooleanObject(!evaled.primitive);
      };
    };

    return new RuntimeObjects.NullObject();
  };

  public override visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode): RuntimeValues.AbstractValue {
    let ident: SyntaxTree.IdentfierNode;

    if (node.lhs instanceof SyntaxTree.IdentfierNode) {
      ident = node.lhs;

    } else {
      ident = node.lhs.accessing;
    };

    this.environment.assign(ident.name, node.rhs.acceptEvalVisitor(this));
    return ident.acceptEvalVisitor(this);
  };

  public override visitIdentExpr(node: SyntaxTree.IdentfierNode): RuntimeValues.AbstractValue {
    const resolved = this.environment.resolve(node.name);
    if (RuntimeValueTypeGuard.isVariable(resolved)) {
      return resolved.value;
    } else {
      return resolved;
    };
  };

  public override visitLiteralExpr(node: SyntaxTree.LiteralNode): RuntimeValues.AbstractValue {
    switch (node.type) {
      case DataType.T_BOOLEAN:
        return (node.value === "true") ? new RuntimeObjects.BooleanObject(true) : new RuntimeObjects.BooleanObject(false);
      case DataType.T_FLOAT:
        return new RuntimeObjects.FloatObject(parseFloat(node.value));
      case DataType.T_INTEGER:
        return new RuntimeObjects.IntegerObject(parseInt(node.value));
      case DataType.T_STRING:
        return new RuntimeObjects.StringObject(node.value);
      default:
        return new RuntimeObjects.NullObject();
    };
  };

  public override visitCloneExpr(node: SyntaxTree.CloneExpressionNode): RuntimeValues.AbstractValue {
    const resolved = node.cloning.acceptEvalVisitor(this);
    const resolvedObject = this.tc.checkObject(resolved);

    const golosinaCustomObject = new RuntimeValues.Object(resolvedObject);

    for (const member of node.members) {
      golosinaCustomObject.setMember(member.key.name, member.value.acceptEvalVisitor(this));
    };

    return golosinaCustomObject;
  };

  public override visitVarDecStmnt(node: SyntaxTree.VariableDeclarationStatementNode): RuntimeValues.AbstractValue {
    const variable = new RuntimeValues.Variable();
    variable.isConst = node.isConst;
    if (node.init) {
      const evaluated = this.tc.checkObject(node.init.acceptEvalVisitor(this));
      variable.value = evaluated;
    } else {
      variable.value = new RuntimeObjects.NullObject();
    };

    this.environment.declare(node.ident.name, variable);

    return variable.value;
  };

  public override visitMethodExpr(node: SyntaxTree.MethodExpressionNode): RuntimeValues.AbstractValue {
    const golosinaMethod = new RuntimeValues.Method(node.block as SyntaxTree.BlockStatementNode, node.params);
    return golosinaMethod;
  };

  public override visitMemberExpr(node: SyntaxTree.MemberExpressionNode): RuntimeValues.AbstractValue {
    const resolved = node.parent.acceptEvalVisitor(this);
    const golosinaObject = this.tc.checkObject(resolved);
    const accessed = golosinaObject.getMember(node.accessing.name);

    if (this.context.updateContext && !RuntimeValueTypeGuard.isNativeMethod(accessed)) {
      this.context.push(golosinaObject);
    };

    return golosinaObject.getMember(node.accessing.name);
  };

  public override visitCallExpr(node: SyntaxTree.ExpressionCallNode): RuntimeValues.AbstractValue {

    this.context.updateContext = true;
    const resolved = node.callee.acceptEvalVisitor(this);
    this.context.updateContext = false;
    const golosinaMethod = this.tc.checkMethod(resolved);

    if (RuntimeValueTypeGuard.isNativeMethod(golosinaMethod)) {

      if (golosinaMethod.paramState === RuntimeValues.ParamState.FIXED) {
        this.tc.checkArgLengthMatch(node.arguments.length, golosinaMethod.exec.length);
      };

      const runtimeArguments: RuntimeValues.Object[] = [];

      for (const arg of node.arguments) {
        const value = arg.acceptEvalVisitor(this);
        runtimeArguments.push(this.tc.checkObject(value));
      };

      const v8Primitve = golosinaMethod.exec(...runtimeArguments);

      // we need to convert v8 pritimitves into actual golosina objects.
      return this.conversion(v8Primitve);

    } else {
      this.tc.checkArgLengthMatch(node.arguments.length, golosinaMethod.params.length)
      this.environment.pushScope(ScopeIdentifier.S_METHOD);

      const ctx = this.context.get;

      if (ctx) {
        this.environment.declare("this", ctx);
      };

      // inject arguments locally.

      for (let i = 0; i < golosinaMethod.params.length; ++i) {
        const arg = node.arguments[i];
        const param = golosinaMethod.params[i];
        const value = arg.acceptEvalVisitor(this);
        this.environment.declare(param.name, value);
      };

      const returnedFromBlock = golosinaMethod.block.acceptEvalVisitor(this);
      this.environment.popScope();

      return returnedFromBlock;
    };
  };

  public override visitReturnStmnt(node: SyntaxTree.ReturnStatementNode): RuntimeValues.AbstractValue {
    this.dispatcher.set(DispatchState.RETURN);
    return node.expr.acceptEvalVisitor(this);
  };

  public override visitBreakStmnt(node: SyntaxTree.BreakStatementNode): RuntimeValues.AbstractValue {
    this.dispatcher.set(DispatchState.BREAK);
    return new RuntimeObjects.NullObject();
  };

  public override visitContinueStmnt(node: SyntaxTree.ContinueStatementNode): RuntimeValues.AbstractValue {
    this.dispatcher.set(DispatchState.CONTINUE);
    return new RuntimeObjects.NullObject();
  };

  public override visitIfStmnt(node: SyntaxTree.IfStatementNode): RuntimeValues.AbstractValue {
    const expr = node.condition.acceptEvalVisitor(this);

    if (RuntimeValueTypeGuard.isObjectValue(expr) && expr.primitive) {
      return node.block.acceptEvalVisitor(this);
    } else if (node.alternate) {
      return node.alternate.acceptEvalVisitor(this);
    } else {
      return expr;
    };
  };

  public override visitForStmnt(node: SyntaxTree.ForStatementNode): RuntimeValues.AbstractValue {
    this.environment.pushScope(ScopeIdentifier.S_LOOP);

    node.init.acceptEvalVisitor(this);

    let value: RuntimeValues.AbstractValue = new RuntimeObjects.NullObject();

    while (true) {
      const expr = node.condition.acceptEvalVisitor(this);
      if (!expr || (RuntimeValueTypeGuard.isObjectValue(expr) && expr && !expr.primitive)) {
        break;
      };

      value = node.block.acceptEvalVisitor(this);

      const state = this.dispatcher.get;

      if (state === DispatchState.RETURN || state === DispatchState.BREAK) {
        break;
      } else {
        node.update.acceptEvalVisitor(this);
      };
    };

    this.environment.popScope();

    return value;
  };

  public override visitWhileStmnt(node: SyntaxTree.WhileStatementNode): RuntimeValues.AbstractValue {
    this.environment.pushScope(ScopeIdentifier.S_LOOP);

    let value: RuntimeValues.AbstractValue = new RuntimeObjects.NullObject();

    while (true) {
      const expr = node.condition.acceptEvalVisitor(this);

      if (!expr || (RuntimeValueTypeGuard.isObjectValue(expr) && expr && !expr.primitive)) {
        break;
      };

      value = node.block.acceptEvalVisitor(this);

      const state = this.dispatcher.get;

      if (state === DispatchState.RETURN || state === DispatchState.BREAK) {
        break;
      };
    };

    this.environment.popScope();

    return value;
  };

  public override visitBlockStmnt(node: SyntaxTree.BlockStatementNode): RuntimeValues.AbstractValue {
    this.environment.pushScope(ScopeIdentifier.S_BLOCK);

    let value: RuntimeValues.AbstractValue = new RuntimeObjects.NullObject();

    for (const stmnt of node.body) {
      value = stmnt.acceptEvalVisitor(this);
      const state = this.dispatcher.get;

      if (state === DispatchState.RETURN || state === DispatchState.BREAK) {
        break;
      };
    };

    this.environment.popScope();
    return value;
  };

  public override visitCaseExpr(node: SyntaxTree.CaseExpressionNode): RuntimeValues.AbstractValue {
    const discriminant = node.discriminant.acceptEvalVisitor(this);

    if (!discriminant || !RuntimeValueTypeGuard.isObjectValue(discriminant)) {
      throw new GolosinaExceptions.Backend.RuntimeError(`Case discriminant appears to be undefined!`);
    };

    let value: RuntimeValues.AbstractValue = new RuntimeObjects.NullObject();

    for (const test of node.tests) {

      if (!test.isDefault && test.condition) {
        const expr = test.condition.acceptEvalVisitor(this);

        if (!expr || !RuntimeValueTypeGuard.isObjectValue(expr)) {
          throw new GolosinaExceptions.Backend.RuntimeError(`Case test appears to be undefined!`);
        };

        if (expr.primitive === discriminant.primitive) {
          value = test.consequent.acceptEvalVisitor(this);
          break;
        };

      } else {
        value = test.consequent.acceptEvalVisitor(this);
      };

      const state = this.dispatcher.get;

      if (state === DispatchState.RETURN || state === DispatchState.BREAK) {
        break;
      };
    };

    return value;
  };
};

export default ASTEvaluator;
