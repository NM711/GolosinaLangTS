import VisitorTypes from "../../types/visitor.types";
import { SyntaxTree } from "../../frontend/parser/ast";
import { RuntimeObjects, RuntimeValues } from "./runtime_values";
import { DataType } from "../../common";
import GolosinaTypeChecker from "./typechecker";
import Environment from "./environment";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";
import TreeNodeTypeGuard from "../../guards/node_gurads";

class ASTEvaluator extends VisitorTypes.AbstractVisitor<RuntimeValues.AbstractValue> {
  private environment: Environment;
  private tc: GolosinaTypeChecker;

  constructor() {
    super();
    this.environment = new Environment();
    this.tc = new GolosinaTypeChecker();
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
          this.environment.assign(this.environment.lastResolved, evaled);
          return evaled;
        };

        if (evaled.isFloat()) {
          const old = new RuntimeObjects.FloatObject(evaled.primitive);
          evaled.primitive += 1;
          this.environment.assign(this.environment.lastResolved, evaled);

          return old;
        } else if (evaled.isInt()) {
          const old = new RuntimeObjects.IntegerObject(evaled.primitive);
          evaled.primitive += 1;
          this.environment.assign(this.environment.lastResolved, evaled);

          return old;
        };

        break;

      case "--":

        if (node.isPrefix && evaled.isNumeric()) {
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolved, evaled);

          return evaled;
        };

        if (evaled.isFloat()) {
          const old = new RuntimeObjects.FloatObject(evaled.primitive);
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolved, evaled);

          return old;
        } else if (evaled.isInt()) {
          const old = new RuntimeObjects.IntegerObject(evaled.primitive);
          evaled.primitive -= 1;
          this.environment.assign(this.environment.lastResolved, evaled);
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

    if (TreeNodeTypeGuard.isIdent(node.lhs)) {
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
      case DataType.T_NULL:
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
    
  }

  public override visitCallExpr(node: SyntaxTree.ExpressionCallNode): RuntimeValues.AbstractValue {
    const objectContext = node.callee.acceptEvalVisitor(this);
    

      
  };

  public override visitBlockStmnt(node: SyntaxTree.BlockStatementNode): RuntimeValues.AbstractValue {
    
  }
};

export default ASTEvaluator;
