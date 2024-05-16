import { NodeIdentifiers } from "../frontend/parser/ast";
import type { SyntaxTree } from "../frontend/parser/ast";

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

  public static isCloneExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.CloneExpressionNode {
    return node.id === NodeIdentifiers.N_CLONE_EXPR;
  };

  public static isBinaryExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.BinaryExpressionNode {
    return node.id === NodeIdentifiers.N_BINARY_EXPR;
  };

  public static isUnaryExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.UnaryExpressionNode {
    return node.id === NodeIdentifiers.N_UNARY_EXPR;
  };

  public static isCallExpr(node: SyntaxTree.BaseNodeAST) {
    return node.id === NodeIdentifiers.N_EXPR_CALL;
  };

  public static isMethod(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.MethodExpressionNode {
    return node.id === NodeIdentifiers.N_METHOD_EXPR;
  };

};

export default TreeNodeTypeGuard;

