import { DataType } from "../common";
import { LinePosition } from "../types/token.types";
import TreeVisitor from "../types/visitor.types"

export enum NodeIdentifiers {
  N_BINARY_EXPR,
  N_BINARY_ASSIGN_EXPR,
  N_UNARY_EXPR,
  N_DIRECT_MEMBER,
  N_EXPR_CALL,
  N_MEMBER_EXPR,
  N_IF_STMNT,
  N_FOR_STMNT,
  N_WHILE_STMNT,
  N_CASE_TEST,
  N_CASE_STMNT,
  N_RETURN_STMNT,
  N_CLONE_STMNT,
  N_BREAK_STMNT,
  N_CONTINUE_STMNT,
  N_MODULE,
  N_IDENT,
  N_LITERAL,
  N_METHOD,
  N_VARIABLE,
  N_DATA_TYPE,
  N_OBJECT_EXPR,
  N_BLOCK,
  N_ACCESSING,
};

export namespace SyntaxTree {
  
  export abstract class BaseNodeAST {
    public id: NodeIdentifiers;
    public kind: string;
    public info: LinePosition;
    
    constructor(id: NodeIdentifiers, kind: string, info: LinePosition) {
      this.id = id;
      this.kind = kind;
      this.info = info;
    };

    // declare an interface

    public abstract accept(visitor: TreeVisitor): void;
  };

  export class BinaryExpressionNode extends BaseNodeAST {
    public lhs: BaseNodeAST;
    public op: string;
    public rhs: BaseNodeAST;

    constructor(kind: string = "BinaryExpression", info: LinePosition) {
      super(NodeIdentifiers.N_BINARY_EXPR, kind, info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitBinaryExpr(this);
    };
  };

  export class UnaryExpressionNode extends BaseNodeAST {
    public argument: IdentfierNode | MemberExpressionNode;
    public op: string;
    public isPrefix: boolean;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_UNARY_EXPR, "UnaryExpression", info);
      this.isPrefix = false;
    };
        
    public accept(visitor: TreeVisitor): void {
      visitor.visitUnaryExpr(this);
    };

  };
  
  export class AssignmentExpressionNode extends BaseNodeAST {
    public lhs: IdentfierNode | MemberExpressionNode;
    public op: string;
    public rhs: BaseNodeAST;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_BINARY_ASSIGN_EXPR, "AssignmentExpression", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitAssignmentExpr(this);
    };
  };


  export class LiteralNode extends BaseNodeAST {
    public value: string;
    public type: DataType;

    constructor(value: string, type: DataType, info: LinePosition) {
      super(NodeIdentifiers.N_LITERAL, "Literal", info);
      this.value = value;
      this.type = type;
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitLiteral(this);
    };
  };

  export class IdentfierNode extends BaseNodeAST {
    public name: string;

    constructor(name: string, info: LinePosition) {
      super(NodeIdentifiers.N_IDENT, "Identifier", info);
      this.name = name;
    };
    
    public accept(visitor: TreeVisitor): void {
      visitor.visitIdent(this);
    };
  };

  export class VariableNode extends BaseNodeAST {
    public isConst: boolean;
    public ident: IdentfierNode;
    public init: BaseNodeAST | null;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_VARIABLE, "Variable", info);
      this.isConst = false;
      this.init = null;
    };

    
    public accept(visitor: TreeVisitor): void {
      visitor.visitVar(this);
    };
  };

  export class BlockNode extends BaseNodeAST {
    public body: BaseNodeAST[];

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_BLOCK, "Block", info);
      this.body = [];
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitBlockStmnt(this);    
    };
  };

  export class IfStatementNode extends BaseNodeAST {
    public block: BlockNode;
    public condition: BaseNodeAST;
    public alternate: IfStatementNode | BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_IF_STMNT, "IfStmnt", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitIfStmnt(this);    
    };
  };

  export class MethodNode extends BaseNodeAST {
    public params: IdentfierNode[];
    public block: BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_METHOD, "Method", info);
      this.params = [];
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitMethod(this); 
    };
  };

  export class MemberExpressionNode extends BaseNodeAST {
    public parent: IdentfierNode | MemberExpressionNode;
    public accessing: IdentfierNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_MEMBER_EXPR, "MemberExpression", info);
    };

    
    public accept(visitor: TreeVisitor): void {
      visitor.visitMemberExpr(this); 
    };
  };

  export class ExpressionCallNode extends BaseNodeAST {
    public arguments: (LiteralNode | IdentfierNode | MemberExpressionNode)[];
    public callee: IdentfierNode | MemberExpressionNode;
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_EXPR_CALL, "ExpressionCall", info);
      this.arguments = [];
    };

    public accept(visitor: TreeVisitor): void {
       visitor.visitCallExpr(this); 
    };
  };

  export class BreakStatementNode extends BaseNodeAST {
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_BREAK_STMNT, "BreakStatement", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitBreakStmnt();
    };
  };

  export class ContinueStatementNode extends BaseNodeAST {
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_CONTINUE_STMNT, "ContinueStatement", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitContinueStmnt();
    };
  };

  export class ReturnStatementNode extends BaseNodeAST {
    public value: BaseNodeAST;
    constructor(info: LinePosition, value: BaseNodeAST) {
      super(NodeIdentifiers.N_RETURN_STMNT, "ReturnStatement", info);
      this.value = value;
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitReturnStmnt(this);
    };
  };

  export class DirectMemberNode extends BaseNodeAST {
    public key: IdentfierNode;
    public value: BaseNodeAST;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_DIRECT_MEMBER, "DirectMember", info);
    };

    public accept(): void {};
  };
  
  export class ObjectExpressionNode extends BaseNodeAST {
    public members: DirectMemberNode[];
    
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_OBJECT_EXPR, "ObjectExpression", info);
      this.members = [];
    };

    public accept(): void{};
  };

  export class CloneStatementNode extends BaseNodeAST {
    public cloning: IdentfierNode;
    public object: ObjectExpressionNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_CLONE_STMNT, "CloneStatement", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitCloneStmnt(this); 
    };
  };

  export class ForStatementNode extends BaseNodeAST {
    public init: BaseNodeAST;
    public condition: BaseNodeAST;
    public update: BaseNodeAST;
    public block: BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_FOR_STMNT, "ForStatement", info);
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitForStmnt(this);
    };
  };

  export class WhileStatementNode extends BaseNodeAST {
    public condition: BaseNodeAST;
    public block: BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_WHILE_STMNT, "WhileStatement", info);
    };
    
    public accept(visitor: TreeVisitor): void {
      visitor.visitWhileStmnt(this);
    };
  };

  export class CaseStatementTestNode extends BaseNodeAST {
    public isDefault: boolean;
    public condition: BaseNodeAST | null;
    public block: BlockNode;
  
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_CASE_TEST, "CaseTest", info);
      this.isDefault = false;
      this.condition = null;
    };

    public accept(visitor: TreeVisitor): void {
    };
  };

  export class CaseStatementNode extends BaseNodeAST {
    public discriminant: BaseNodeAST;
    public tests: CaseStatementTestNode[];

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_CASE_STMNT, "CaseStatement", info);
      this.tests = [];
    };

    public accept(visitor: TreeVisitor): void {
      visitor.visitCaseStmnt(this);   
    };
  };

  export type Program = BaseNodeAST[];
};
