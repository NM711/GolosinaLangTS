import type { SyntaxTree } from "../frontend/ast";
import { RuntimeEnvironmentValues } from "../runtime/runtime_values"

interface IVisitor<T = RuntimeEnvironmentValues.RuntimeValue> {
  visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): T;
  visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): T;
  visitLiteral(node: SyntaxTree.LiteralNode): T;
  visitIdent(node: SyntaxTree.IdentfierNode): T;
  visitIfStmnt(node: SyntaxTree.IfStmntNode): T;
  visitReturnStmnt(node: SyntaxTree.ReturnNode): T;
  visitBlockStmnt(node: SyntaxTree.BlockNode): T;
  visitMethod(node: SyntaxTree.MethodNode): T;
  visitCallExpr(node: SyntaxTree.ExpressionCallNode): T;
  visitClone(node: SyntaxTree.CloneExpressionNode): T;
  visitMemberExpr(node: SyntaxTree.MemberExpressionNode);
};


/*
  AST Visitor and Evaluator
*/

class ASTVisitor implements IVisitor  {
  public visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): RuntimeEnvironmentValues.RuntimeValue {
    node      
  };

  public visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): RuntimeEnvironmentValues.RuntimeValue {
      
  };

  public visitLiteral(node: SyntaxTree.LiteralNode): RuntimeEnvironmentValues.RuntimeValue {
      
  };

  public visitIdent(node: SyntaxTree.IdentfierNode): RuntimeEnvironmentValues.RuntimeValue {
      
  };

  public visitBlockStmnt(node: SyntaxTree.BlockNode): RuntimeEnvironmentValues.RuntimeValue {
      
  };
};

export default ASTVisitor;
