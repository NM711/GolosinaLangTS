import { GolosinaSyntaxError } from "../exceptions";
import TreeNodeTypeGuard from "../guards/node_gurads";
import { LinePosition, Token, TokenIdentifiers } from "../types/token.types";
import { NodeIdentifiers, SyntaxTree } from "./ast";

class Expect {

  private error(expected: string, received: string, info: LinePosition) {
    return new GolosinaSyntaxError(`Expected "${expected}" instead received "${received}"`, info);
  };

  public token(id: TokenIdentifiers, lexeme: string, received: Token) {
    if (id !== received.id) {
      throw this.error(lexeme, received.lexeme, received.info);
    };
  };


  public semicolon(received: Token) {
    if (TokenIdentifiers.SEMICOLON !== received.id) {
      throw this.error(";", received.lexeme, received.info);
    };
  };

  public seperator(received: Token) {
    if (TokenIdentifiers.SEPERATOR !== received.id) {
      throw this.error(",", received.lexeme, received.info);
    };
  };

  public leftParenthesis(received: Token) {
    if (TokenIdentifiers.LEFT_PARENTHESIS !== received.id) {
      throw this.error("(", received.lexeme, received.info);
    };
  };

  public rightParenthesis(received: Token) {
    if (TokenIdentifiers.RIGHT_PARENTHESIS !== received.id) {
      throw this.error(")", received.lexeme, received.info);
    };
  };

  public leftCurly(received: Token) {
    if (TokenIdentifiers.LEFT_CURLY !== received.id) {
      throw this.error("{", received.lexeme, received.info);
    };
  };

  public rightCurly(received: Token) {
    if (TokenIdentifiers.RIGHT_CURLY !== received.id) {
      throw this.error("}", received.lexeme, received.info);
    };
  };


  public ident(node: SyntaxTree.BaseNodeAST, expected: string = "Identifier"): SyntaxTree.IdentfierNode {
    if (!TreeNodeTypeGuard.isIdent(node)) {
      throw this.error(expected, node.kind, node.info);
    };

    return node;
  };

  public memberOrIdent(node: SyntaxTree.BaseNodeAST, expected: string = "Identifier or MemberExpression"): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw this.error(expected, node.kind, node.info);
    };

    return node;
  };
};

/**
  Validator that validates the integrity of what is being parsed.
  Validate methods are more descriptive than expect methods.
*/

class SemanticValidator {
  public expect: Expect;

  constructor() {
    this.expect = new Expect();
  };

  /**
    Validates whether a value is going to be valid.
    This is a helper which can be used in order to validate assignment, initializers, returns, etc.
  */

  private isInvalidValue(node: SyntaxTree.BaseNodeAST): boolean {
    return !TreeNodeTypeGuard.isCloneStmnt(node) && !TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isLiteral(node) && !TreeNodeTypeGuard.isMemberExpr(node)
  };

  public validateAssignmentRHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    if (this.isInvalidValue(node)) {
      throw new GolosinaSyntaxError(`Unexpected rhs value within assignment expression!`, node.info)
    };

    return node;
  };

  public validateAssignmentLHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaSyntaxError(`Invalid lhs value is present within assignment expression!`, node.info);
    };

    return node;
  };

  public validateCallLHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaSyntaxError(`Invalid lhs value present within call expression!`, node.info);
    };

    return node;
  };



  public validateVarInit(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    if (this.isInvalidValue(node)) {
      throw new GolosinaSyntaxError(`Unexpected value within a variable initializer!`, node.info)
    };

    return node;
  };

  public validateReturn(node: SyntaxTree.BaseNodeAST) {
    if (this.isInvalidValue(node)) {
      throw new GolosinaSyntaxError(`Unexpected value within return statement!`, node.info);
    };
  };

  private isInvalidExpression(node: SyntaxTree.BaseNodeAST): boolean {
    return !TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isBinaryExpr(node) && !TreeNodeTypeGuard.isLiteral(node) && !TreeNodeTypeGuard.isUnaryExpr(node)
  };

  public validateIfExpression(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    if (this.isInvalidExpression(node)) {
      throw new GolosinaSyntaxError(`Invalid expression present in if statement condition!`, node.info);
    };

    return node;
  };

  public validateArguments(node: SyntaxTree.BaseNodeAST) {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isLiteral(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaSyntaxError(`Invalid argument value has been set!`, node.info);
    };

    return node;
  };

  public validateConstant(node: SyntaxTree.VariableNode) {
    if (!node.init && node.isConst) {
      throw new GolosinaSyntaxError(`Uninitialized constant at "${node.ident.name}"`, node.info);
    };
  };
};

export default SemanticValidator;
