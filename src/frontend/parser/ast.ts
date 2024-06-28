import { DataType } from "../../common";
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

export enum NodeIdentifiers {
  N_BINARY_EXPR,
  N_BINARY_ASSIGN_EXPR,
  N_UNARY_EXPR,
  N_DIRECT_MEMBER,
  N_EXPR_CALL,
  N_PAREN_EXPR,
  N_MEMBER_EXPR,
  N_IF_STMNT,
  N_FOR_STMNT,
  N_WHILE_STMNT,
  N_CASE_TEST,
  N_CASE_STMNT,
  N_RETURN_STMNT,
  N_CLONE_EXPR,
  N_BREAK_STMNT,
  N_CONTINUE_STMNT,
  N_MODULE_STMNT,
  N_IMPORT_STMNT,
  N_EXPORT_STMNT,
  N_IDENT,
  N_LITERAL,
  N_METHOD_EXPR,
  N_VARIABLE,
  N_DATA_TYPE,
  N_BLOCK_STMNT,
  N_ACCESSING,
};

export namespace SyntaxTree {

  export abstract class BaseNodeAST {
    public id: NodeIdentifiers;
    public kind: string;
    public info: TokenInformation;

    constructor(id: NodeIdentifiers, kind: string, info: TokenInformation) {
      this.id = id;
      this.kind = kind;
      this.info = info;
    };

    public abstract acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue;
  };

  export class BinaryExpressionNode extends BaseNodeAST {
    public lhs: BaseNodeAST;
    public op: string;
    public rhs: BaseNodeAST;

    constructor(kind: string = "BinaryExpression", info: TokenInformation) {
      super(NodeIdentifiers.N_BINARY_EXPR, kind, info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitBinaryExpr(this);
    };
  };

  export class UnaryExpressionNode extends BaseNodeAST {
    public argument: BaseNodeAST;
    public op: string;
    public isPrefix: boolean;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_UNARY_EXPR, "UnaryExpression", info);
      this.isPrefix = false;
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
      super(NodeIdentifiers.N_BINARY_ASSIGN_EXPR, "AssignmentExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitAssignmentExpr(this);
    };

  };


  export class LiteralNode extends BaseNodeAST {
    public value: string;
    public type: DataType;

    constructor(value: string, type: DataType, info: TokenInformation) {
      super(NodeIdentifiers.N_LITERAL, "Literal", info);
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
      super(NodeIdentifiers.N_IDENT, "Identifier", info);
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
      super(NodeIdentifiers.N_VARIABLE, "Variable", info);
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
      super(NodeIdentifiers.N_BLOCK_STMNT, "BlockStatement", info);
      this.body = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitBlockStmnt(this);
    };
  };

  export class ExportStatementNode extends BaseNodeAST {
    public declaration: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_EXPORT_STMNT, "ExportStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitExportStmnt(this);
    };
  };

  export class ImportStatementNode extends BaseNodeAST {
    public path: string;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_IMPORT_STMNT, "ImportStatement", info);
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
      super(NodeIdentifiers.N_IF_STMNT, "IfStmnt", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitIfStmnt(this);
    };
  };

  export class MethodExpressionNode extends BaseNodeAST {
    public params: IdentfierNode[];
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_METHOD_EXPR, "MethodExpression", info);
      this.params = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitMethodExpr(this);
    };
  };


  export class ModuleStatemenetNode extends BaseNodeAST {
    public ident: IdentfierNode;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_MODULE_STMNT, "ModuleStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitModuleStmnt(this);
    };
  };

  export class MemberExpressionNode extends BaseNodeAST {
    public parent: BaseNodeAST;
    public accessing: IdentfierNode;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_MEMBER_EXPR, "MemberExpression", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitMemberExpr(this);
    };
  };

  export class ExpressionCallNode extends BaseNodeAST {
    public arguments: BaseNodeAST[];
    public callee: IdentfierNode | MemberExpressionNode;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_EXPR_CALL, "ExpressionCall", info);
      this.arguments = [];
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitCallExpr(this);
    };
  };

  export class BreakStatementNode extends BaseNodeAST {
    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_BREAK_STMNT, "BreakStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { 
      return visitor.visitBreakStmnt(this);
    };
  };

  export class ContinueStatementNode extends BaseNodeAST {
    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_CONTINUE_STMNT, "ContinueStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { 
      return visitor.visitContinueStmnt(this);
    };
  };

  export class ReturnStatementNode extends BaseNodeAST {
    public expr: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_RETURN_STMNT, "ReturnStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitReturnStmnt(this);
    };
  };

  export class DirectMemberNode extends BaseNodeAST {
    public key: IdentfierNode;
    public value: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_DIRECT_MEMBER, "DirectMember", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { };
  };

  export class CloneExpressionNode extends BaseNodeAST {
    public cloning: IdentfierNode | MemberExpressionNode;
    public members: DirectMemberNode[];

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_CLONE_EXPR, "CloneExpression", info);
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
      super(NodeIdentifiers.N_FOR_STMNT, "ForStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitForStmnt(this);
    };
  };

  export class WhileStatementNode extends BaseNodeAST {
    public condition: BaseNodeAST;
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_WHILE_STMNT, "WhileStatement", info);
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitWhileStmnt(this);
    };
  };

  export class CaseStatementTestNode extends BaseNodeAST {
    public isDefault: boolean;
    public condition: BaseNodeAST | null;
    public block: BaseNodeAST;

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_CASE_TEST, "CaseTest", info);
      this.isDefault = false;
      this.condition = null;
    };

    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue { };
  };

  export class CaseStatementNode extends BaseNodeAST {
    public discriminant: BaseNodeAST;
    public tests: CaseStatementTestNode[];

    constructor(info: TokenInformation) {
      super(NodeIdentifiers.N_CASE_STMNT, "CaseStatement", info);
      this.tests = [];
    };
    
    public override acceptEvalVisitor(visitor: VisitorTypes.TEvaluatorVisitor): RuntimeValues.AbstractValue {
      return visitor.visitCaseStmnt(this);
    };
  };

  export type Program = BaseNodeAST[];
};
