import { DataType } from "../../util/common";
import { TokenInformation, LineOffset } from "../lexer/token"
import VisitorTypes from "../../types/visitor.types";
import { RuntimeValues } from "../../runtime/core/runtime_values";

export class StatementOffsetTracker {
  private offset: LineOffset;

  constructor() {
    this.offset = new LineOffset();
  };

  public setOffset(offset: number, type: "START" | "END") {
    if (type === "START") {
      this.offset.start = offset;
    } else {
      this.offset.end = offset;
    };
  };

  public get getOffset() {
    return this.offset;
  };
};

export namespace SyntaxTree {
  export enum BinaryExpressionType {
    ASSIGNMENT,
    LOGICAL_OR,
    LOGICAL_AND,
    BITWISE_OR,
    BITWISE_AND,
    EQUALITY,
    RELATIONAL,
    BITWISE_SHIFT,
    ADDITIVE,
    MULTIPLICATIVE,
  };

  export abstract class BaseNodeAST {
    public kind: string;
    public info: TokenInformation;

    constructor(kind: string, info: TokenInformation) {
      this.kind = kind;
      this.info = info;
    };

    public abstract acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue;
  };

  export class BinaryExpressionNode extends BaseNodeAST {
    public type: BinaryExpressionType;
    public lhs: BaseNodeAST;
    public op: string;
    public rhs: BaseNodeAST;

    constructor(type: BinaryExpressionType, info: TokenInformation) {
      super("BinaryExpression", info);
      this.type = type;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitBinaryExpr(this);
    };
  };

  export class UnaryExpressionNode extends BaseNodeAST {
    public argument: BaseNodeAST;
    public op: string;
    public isPrefix: boolean;

    constructor(prefix: boolean, info: TokenInformation) {
      super("UnaryExpression", info);
      this.isPrefix = prefix;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitUnaryExpr(this);
    };
  };

  export class AssignmentExpressionNode extends BaseNodeAST {
    public lhs: IdentfierNode | MemberExpressionNode;
    public op: string;
    public rhs: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("AssignmentExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitAssignmentExpr(this);
    };

  };


  export class LiteralNode extends BaseNodeAST {
    public value: string;
    public type: DataType;

    constructor(value: string, type: DataType, info: TokenInformation) {
      super("Literal", info);
      this.value = value;
      this.type = type;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitLiteralExpr(this);
    };

  };

  export class IdentfierNode extends BaseNodeAST {
    public name: string;

    constructor(name: string, info: TokenInformation) {
      super("Identifier", info);
      this.name = name;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitIdentExpr(this);
    };
  };

  export class VariableDeclarationStatementNode extends BaseNodeAST {
    public isConst: boolean;
    public ident: IdentfierNode;
    public init: BaseNodeAST | null;

    constructor(info: TokenInformation) {
      super("Variable", info);
      this.isConst = false;
      this.init = null;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitVarDecStmnt(this);
    };
  };

  export class BlockStatementNode extends BaseNodeAST {
    public body: BaseNodeAST[];

    constructor(info: TokenInformation) {
      super("BlockStatement", info);
      this.body = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitBlockStmnt(this);
    };
  };

  export class ExportStatementNode extends BaseNodeAST {
    public declaration: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("ExportStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitExportStmnt(this);
    };
  };

  export class ImportStatementNode extends BaseNodeAST {
    public path: string;

    constructor(info: TokenInformation) {
      super("ImportStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitImportStmnt(this);
    };
  };

  export class IfStatementNode extends BaseNodeAST {
    public block: BaseNodeAST;
    public condition: BaseNodeAST;
    public alternate: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("IfStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitIfStmnt(this);
    };
  };

  export class MethodExpressionNode extends BaseNodeAST {
    public params: IdentfierNode[];
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("MethodExpression", info);
      this.params = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitMethodExpr(this);
    };
  };


  // export class ModuleStatemenetNode extends BaseNodeAST {
  //   public ident: IdentfierNode;

  //   constructor(info: TokenInformation) {
  //     super("ModuleStatement", info);
  //   };

  //   public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
  //     return visitor.visitModuleStmnt(this);
  //   };
  // };

  export class MemberExpressionNode extends BaseNodeAST {
    public parent: BaseNodeAST;
    public accessing: IdentfierNode;

    constructor(info: TokenInformation) {
      super("MemberExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitMemberExpr(this);
    };
  };

  export class ExpressionCallNode extends BaseNodeAST {
    public arguments: BaseNodeAST[];
    public callee: IdentfierNode | MemberExpressionNode;

    constructor(info: TokenInformation) {
      super("ExpressionCall", info);
      this.arguments = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitCallExpr(this);
    };
  };

  export class BreakStatementNode extends BaseNodeAST {
    constructor(info: TokenInformation) {
      super("BreakStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitBreakStmnt(this);
    };
  };

  export class ContinueStatementNode extends BaseNodeAST {
    constructor(info: TokenInformation) {
      super("ContinueStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitContinueStmnt(this);
    };
  };

  export class ReturnStatementNode extends BaseNodeAST {
    public expr: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("ReturnStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitReturnStmnt(this);
    };
  };

  export class DirectMemberExpressionNode extends BaseNodeAST {
    public key: IdentfierNode;
    public value: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("DirectMemberExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { };
  };

  export class CloneExpressionNode extends BaseNodeAST {
    public cloning: IdentfierNode | MemberExpressionNode;
    public members: DirectMemberExpressionNode[];

    constructor(info: TokenInformation) {
      super("CloneExpression", info);
      this.members = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitCloneExpr(this);
    };
  };

  export class ForStatementNode extends BaseNodeAST {
    public init: BaseNodeAST;
    public condition: BaseNodeAST;
    public update: BaseNodeAST;
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("ForStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitForStmnt(this);
    };
  };

  export class WhileStatementNode extends BaseNodeAST {
    public condition: BaseNodeAST;
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("WhileStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitWhileStmnt(this);
    };
  };

  export class CaseExpressionTestNode extends BaseNodeAST {
    public isDefault: boolean;
    public condition: BaseNodeAST | null;
    public consequent: BaseNodeAST;

    constructor(info: TokenInformation) {
      super("CaseExpressionTest", info);
      this.isDefault = false;
      this.condition = null;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { };
  };

  export class CaseExpressionNode extends BaseNodeAST {
    public discriminant: BaseNodeAST;
    public tests: CaseExpressionTestNode[];

    constructor(info: TokenInformation) {
      super("CaseExpression", info);
      this.tests = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitCaseExpr(this);
    };
  };


  export class ShellExpressionNode extends BaseNodeAST {
    public exec: string;
    constructor(info: TokenInformation) {
      super("ShellExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitShellExpr(this);
    };
  };

  export type Program = BaseNodeAST[];
};
