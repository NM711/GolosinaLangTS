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
  Helper class that contains a set of often used conditionals.
*/

class TokenConditionalHelpers {

  public isTokenID(id: TokenIdentifiers, token: Token): boolean {
    return id === token.id;
  };
  
  public isPrefix(token: Token) {
    return this.isTokenID(TokenIdentifiers.UNARY_NOT, token) || this.isTokenID(TokenIdentifiers.UNARY_DECREMENT, token) || this.isTokenID(TokenIdentifiers.UNARY_INCREMENT, token);
  };

  public isPostfix(token: Token) {
    return this.isTokenID(TokenIdentifiers.UNARY_DECREMENT, token) || this.isTokenID(TokenIdentifiers.UNARY_INCREMENT, token);
  };

  public isAdditive(token: Token) {
    return this.isTokenID(TokenIdentifiers.BINARY_ADDITION, token) || this.isTokenID(TokenIdentifiers.BINARY_SUBTRACTION, token);
  };

  public isMultiplicative(token: Token) {
    return this.isTokenID(TokenIdentifiers.BINARY_MULTIPLICATION, token) || this.isTokenID(TokenIdentifiers.BINARY_DIVISION, token) || this.isTokenID(TokenIdentifiers.BINARY_MODULUS, token); 
  };

  public isRelational(token: Token) {
    return this.isTokenID(TokenIdentifiers.BINARY_LT, token) || this.isTokenID(TokenIdentifiers.BINARY_LT_EQ, token) || this.isTokenID(TokenIdentifiers.BINARY_GT, token) || this.isTokenID(TokenIdentifiers.BINARY_GT_EQ, token);
  };

  public isEquality(token: Token) {
    return this.isTokenID(TokenIdentifiers.BINARY_EQUALITY, token) || this.isTokenID(TokenIdentifiers.BINARY_NOT_EQUALITY, token);
  };

  public isLeftCurly(token: Token) {
    return this.isTokenID(TokenIdentifiers.LEFT_CURLY, token);    
  };

  public isRightCurly(token: Token) {
    return this.isTokenID(TokenIdentifiers.RIGHT_CURLY, token);
  };

  public isLeftParenthesis(token: Token) {
    return this.isTokenID(TokenIdentifiers.LEFT_PARENTHESIS, token);
  };

  public isRightParenthesis(token: Token) {
    return this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS, token);
  };

  public isArrow(token: Token) {
    return this.isTokenID(TokenIdentifiers.ARROW, token);
  };

  public isCaseTest(token: Token) {
    return this.isTokenID(TokenIdentifiers.OF, token) || this.isTokenID(TokenIdentifiers.DEFAULT, token);
  };
};

/**
  Validator that validates the integrity of what is being parsed.
  Validate methods are more descriptive than expect methods.
*/

class SemanticValidator {
  public expect: Expect;
  public tokenConditions: TokenConditionalHelpers;
  
  constructor() {
    this.expect = new Expect();
    this.tokenConditions = new TokenConditionalHelpers();
  };
    
  /**
    Validates whether a value is going to be valid.
    This is a helper which can be used in order to validate assignment, initializers, returns, etc.
  */

  private isInvalidValue(node: SyntaxTree.BaseNodeAST): boolean {
    return !TreeNodeTypeGuard.isCloneStmnt(node) &&
      !TreeNodeTypeGuard.isIdent(node) &&
      !TreeNodeTypeGuard.isLiteral(node) &&
      !TreeNodeTypeGuard.isMemberExpr(node) &&
      !TreeNodeTypeGuard.isBinaryExpr(node) &&
      !TreeNodeTypeGuard.isUnaryExpr(node) &&
      !TreeNodeTypeGuard.isCallExpr(node)
  };

  public validateAssignmentRHS(node: SyntaxTree.BaseNodeAST, isMember: boolean = false): SyntaxTree.BaseNodeAST {

    if (!isMember) {
      
      if (this.isInvalidValue(node)) {
        throw new GolosinaSyntaxError(`Unexpected rhs value within assignment expression!`, node.info)
      };

    } else {
      if (this.isInvalidValue(node) && !TreeNodeTypeGuard.isMethod(node)) {
        throw new GolosinaSyntaxError(`Unexpected rhs value within direct member assignment expression!`, node.info)
      };
      
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

  public validateConditionExpression(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
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
