import { SyntaxTree } from "../frontend/ast";


export abstract class AbstractVisitor {
  public abstract visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): void;
  public abstract visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode): void;
  public abstract visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): void;
  public abstract visitLiteral(node: SyntaxTree.LiteralNode): void;
  public abstract visitIdent(node: SyntaxTree.IdentfierNode): void;
  public abstract visitIfStmnt(node: SyntaxTree.IfStatementNode): void;
  public abstract visitForStmnt(node: SyntaxTree.ForStatementNode): void;
  public abstract visitWhileStmnt(node: SyntaxTree.WhileStatementNode): void;
  public abstract visitReturnStmnt(node: SyntaxTree.ReturnStatementNode): void;
  public abstract visitBlockStmnt(node: SyntaxTree.BlockNode): void;
  public abstract visitCaseStmnt(node: SyntaxTree.CaseStatementNode): void;
  public abstract visitBreakStmnt(): void;
  public abstract visitContinueStmnt(): void;
  public abstract visitMethod(node: SyntaxTree.MethodNode): void;
  public abstract visitCallExpr(node: SyntaxTree.ExpressionCallNode): void;
  public abstract visitCloneStmnt(node: SyntaxTree.CloneStatementNode): void;
  public abstract visitMemberExpr(node: SyntaxTree.MemberExpressionNode): void;
  public abstract visitVar(node: SyntaxTree.VariableNode): void;
};

export default AbstractVisitor;
