import { SyntaxTree } from "../frontend/ast";

export interface IVisitor {
  visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): void;
  visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode): void;
  visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): void;
  visitLiteral(node: SyntaxTree.LiteralNode): void;
  visitIdent(node: SyntaxTree.IdentfierNode): void;
  visitIfStmnt(node: SyntaxTree.IfStmntNode): void;
  visitReturnStmnt(node: SyntaxTree.ReturnNode): void;
  visitBlockStmnt(node: SyntaxTree.BlockNode): void;
  visitMethod(node: SyntaxTree.MethodNode): void;
  visitCallExpr(node: SyntaxTree.ExpressionCallNode): void;
  visitCloneExpr(node: SyntaxTree.CloneExpressionNode): void;
  visitMemberExpr(node: SyntaxTree.MemberExpressionNode): void;
  visitVar(node: SyntaxTree.VariableNode): void;
};
