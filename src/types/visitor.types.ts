import { SyntaxTree } from "../frontend/parser/ast";
import { RuntimeValues } from "../runtime/core/runtime_values";


namespace VisitorTypes {
  export abstract class AbstractVisitor<T = void> {
    public abstract visitBinaryExpr(node: SyntaxTree.BinaryExpressionNode): T;
    public abstract visitAssignmentExpr(node: SyntaxTree.AssignmentExpressionNode): T;
    public abstract visitUnaryExpr(node: SyntaxTree.UnaryExpressionNode): T;
    public abstract visitLiteralExpr(node: SyntaxTree.LiteralNode): T;
    public abstract visitIdentExpr(node: SyntaxTree.IdentfierNode): T;
    public abstract visitIfStmnt(node: SyntaxTree.IfStatementNode): T;
    public abstract visitForStmnt(node: SyntaxTree.ForStatementNode): T;
    public abstract visitWhileStmnt(node: SyntaxTree.WhileStatementNode): T;
    public abstract visitReturnStmnt(node: SyntaxTree.ReturnStatementNode): T;
    public abstract visitBlockStmnt(node: SyntaxTree.BlockStatementNode): T;
    public abstract visitCaseStmnt(node: SyntaxTree.CaseStatementNode): T;
    public abstract visitMethodExpr(node: SyntaxTree.MethodExpressionNode): T;
    public abstract visitCallExpr(node: SyntaxTree.ExpressionCallNode): T;
    public abstract visitCloneExpr(node: SyntaxTree.CloneExpressionNode): T;
    public abstract visitMemberExpr(node: SyntaxTree.MemberExpressionNode): T;
    public abstract visitModuleStmnt(node: SyntaxTree.ModuleStatemenetNode): T;
    public abstract visitExportStmnt(node: SyntaxTree.ExportStatementNode): T;
    public abstract visitImportStmnt(node: SyntaxTree.ImportStatementNode): T;
    public abstract visitVarDecStmnt(node: SyntaxTree.VariableDeclarationStatementNode): T;
  };

  /**
    Visitor that is meant to visit and perform something, then return the output.
  */

  export type TEvaluatorVisitor = AbstractVisitor<RuntimeValues.AbstractValue>;
};


export default VisitorTypes;
