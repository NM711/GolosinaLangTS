import { NodeIdentifiers } from "../frontend/ast";
import type { SyntaxTree } from "../frontend/ast";

/*
  Typeguards for nodes.
*/

class TreeNodeTypeGuard {
  public static isIdent(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.IdentfierNode {
    return node.id === NodeIdentifiers.N_IDENT;
  };
  
  public static isLiteral(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.LiteralNode {
    return node.id === NodeIdentifiers.N_LITERAL;  
  };

  public static isMemberExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.MemberExpressionNode {
    return node.id === NodeIdentifiers.N_MEMBER_EXPR;
  };

  public static isCloneStmnt(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.CloneStatementNode {
    return node.id === NodeIdentifiers.N_CLONE_STMNT;
  };

  public static isBinaryExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.BinaryExpressionNode {
    return node.id === NodeIdentifiers.N_BINARY_EXPR;
  };

  public static isUnaryExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.UnaryExpressionNode {
    return node.id === NodeIdentifiers.N_UNARY_EXPR;
  };

  public static isMethod(node: SyntaxTree.MethodNode): node is SyntaxTree.MethodNode {
    return node.id === NodeIdentifiers.N_METHOD;
  };
};

export default TreeNodeTypeGuard;

