import { DataType } from "../common";
import { LinePosition } from "./token.types";
import TreeVisitor from "../runtime/visitor"
import { RuntimeEnvironmentValues } from "../runtime/runtime_values";

export enum NodeIdentifiers {
  N_BINARY_EXPR,
  N_UNARY_EXPR,
  N_EXPR_CALL,
  N_MEMBER_EXPR,
  N_MEMBER,
  N_IF_STMNT,
  N_FOR_STMNT,
  N_WHILE_STMNT,
  N_SWITCH_SMTNT,
  N_SWITCH_CASE,
  N_RETURN_STMNT,
  N_BREAK_STMTN,
  N_MODULE,
  N_IDENT,
  N_LITERAL,
  N_METHOD,
  N_VARIABLE,
  N_DATA_TYPE,
  N_BLOCK,
  N_EXPR_CLONE,
};

export namespace SyntaxTree {
  export class BaseNodeAST<T = RuntimeEnvironmentValues.RuntimeValue> {
    public id: NodeIdentifiers;
    public kind: string;
    public info: LinePosition;
    
    constructor(id: NodeIdentifiers, kind: string, info: LinePosition) {
      this.id = id;
      this.kind = kind;
      this.info = info;
    };

    // declare an interface

    public accept(visitor: TreeVisitor): T {}
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
    public lhs: IdentfierNode;
    public op: string;
    public isPrefix: boolean;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_UNARY_EXPR, "UnaryExpression", info);
      this.isPrefix = false;
    };
  };

  export class LiteralNode extends BaseNodeAST {
    public value: string;
    public type: DataTypeNode;

    constructor(value: string, type: DataTypeNode, info: LinePosition) {
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

  export class DataTypeNode extends BaseNodeAST {
    public typeId: DataType;
    public name: string;

    constructor(typeId: DataType, name: string, info: LinePosition) {
      super(NodeIdentifiers.N_DATA_TYPE, "DataType", info);
      this.typeId = typeId;
      this.name = name;
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
  };

  export class BlockNode extends BaseNodeAST {
    public body: BaseNodeAST[];

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_BLOCK, "Block", info);
      this.body = [];
    };
  };

  export class IfStmntNode extends BaseNodeAST {
    public block: BlockNode;
    public expression: BaseNodeAST;
    public alternate: IfStmntNode | BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_IF_STMNT, "IfStmnt", info);
    };
  };

  export class MethodNode extends BaseNodeAST {
    public ident: IdentfierNode;
    public params: IdentfierNode[];
    public block: BlockNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_METHOD, "Method", info);
      this.params = [];
    };
  };

  export class MemberExpressionNode extends BaseNodeAST {
    public parent: BaseNodeAST;
    public accessing: BaseNodeAST;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_MEMBER_EXPR, "MemberExpression", info);
    };
  };

  export class ExpressionCallNode extends BaseNodeAST {
    public arguments: (LiteralNode | IdentfierNode)[];
    public callee: IdentfierNode;
    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_EXPR_CALL, "ExpressionCall", info);
      this.arguments = [];
    };
  };

  export class ReturnNode extends BaseNodeAST {
    public value: (IdentfierNode | LiteralNode);
    constructor(info: LinePosition, value: (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode)) {
      super(NodeIdentifiers.N_RETURN_STMNT, "Return", info);
      this.value = value;
    };
  };

  export class CloneExpressionNode extends BaseNodeAST {
    public cloning: IdentfierNode;

    constructor(info: LinePosition) {
      super(NodeIdentifiers.N_EXPR_CLONE, "CloneExpression", info);
    };
  };

  export type Program = BaseNodeAST[];
};
