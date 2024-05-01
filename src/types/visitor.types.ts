import { SyntaxTree } from "../frontend/ast";


export abstract class AbstractVisitor {
  public abstract visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): void;
  public abstract visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode): void;
  public abstract visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): void;
  public abstract visitLiteral(node: SyntaxTree.LiteralNode): void;
  public abstract visitIdent(node: SyntaxTree.IdentfierNode): void;
  public abstract visitIfStmnt(node: SyntaxTree.IfStmntNode): void;
  public abstract visitReturnStmnt(node: SyntaxTree.ReturnNode): void;
  public abstract visitBlockStmnt(node: SyntaxTree.BlockNode): void;
  public abstract visitMethod(node: SyntaxTree.MethodNode): void;
  public abstract visitCallExpr(node: SyntaxTree.ExpressionCallNode): void;
  public abstract visitCloneExpr(node: SyntaxTree.CloneExpressionNode): void;
  public abstract visitMemberExpr(node: SyntaxTree.MemberExpressionNode): void;
  public abstract visitVar(node: SyntaxTree.VariableNode): void;
};

export default AbstractVisitor;
