import GolosinaExceptions from "../../errors/exceptions";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import { TokenIdentifiers } from "../../types/token.types";
import { LinePosition, Token, TokenInformation } from "../lexer/token";
import { SyntaxTree } from "./ast";

class Expect {

  private error(expected: string, received: string, info: LinePosition) {
    return new GolosinaExceptions.Frontend.SyntaxError(`Expected "${expected}" instead received "${received}"!`, info);
  };

  public token(id: TokenIdentifiers, lexeme: string, received: Token) {
    if (id !== received.id) {
      throw this.error(lexeme, received.lexeme, received.info.start);
    };
  };


  public semicolon(received: Token) {
    if (TokenIdentifiers.SEMICOLON !== received.id) {
      throw this.error(";", received.lexeme, received.info.start);
    };
  };

  public seperator(received: Token) {
    if (TokenIdentifiers.SEPERATOR !== received.id) {
      throw this.error(",", received.lexeme, received.info.start);
    };
  };

  public leftParenthesis(received: Token) {
    if (TokenIdentifiers.LEFT_PARENTHESIS !== received.id) {
      throw this.error("(", received.lexeme, received.info.start);
    };
  };

  public rightParenthesis(received: Token) {
    if (TokenIdentifiers.RIGHT_PARENTHESIS !== received.id) {
      throw this.error(")", received.lexeme, received.info.start);
    };
  };

  public leftCurly(received: Token) {
    if (TokenIdentifiers.LEFT_CURLY !== received.id) {
      throw this.error("{", received.lexeme, received.info.start);
    };
  };

  public rightCurly(received: Token) {
    if (TokenIdentifiers.RIGHT_CURLY !== received.id) {
      throw this.error("}", received.lexeme, received.info.start);
    };
  };


  public ident(node: SyntaxTree.BaseNodeAST, expected: string = "Identifier"): SyntaxTree.IdentfierNode {
    if (!TreeNodeTypeGuard.isIdent(node)) {
      throw this.error(expected, node.kind, node.info.start);
    };

    return node;
  };

  public memberOrIdent(node: SyntaxTree.BaseNodeAST, expected: string = "Identifier or MemberExpression"): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw this.error(expected, node.kind, node.info.start);
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

class State {
  public inObj: boolean;
  public inLoop: boolean;
  public inCase: boolean;
  public inMethod: boolean;

  constructor() {
    this.inCase = false;
    this.inLoop = false;
    this.inObj = false;
    this.inMethod = false;
  };
};

/**
  Validator that validates the integrity of what is being parsed.
  Validate methods are more descriptive than expect methods.
*/

class SemanticValidator {
  public expect: Expect;
  public tokenConditions: TokenConditionalHelpers;
  public state: State;
  
  constructor() {
    this.expect = new Expect();
    this.tokenConditions = new TokenConditionalHelpers();
    this.state = new State();
  };
    
  /**
    Validates whether a value is going to be valid.
    This is a helper which can be used in order to validate assignment, initializers, returns, etc.
  */

  private isInvalidNode(node: SyntaxTree.BaseNodeAST): boolean {
    return !TreeNodeTypeGuard.isCloneExpr(node) &&
      !TreeNodeTypeGuard.isIdent(node) &&
      !TreeNodeTypeGuard.isLiteral(node) &&
      !TreeNodeTypeGuard.isMemberExpr(node) &&
      !TreeNodeTypeGuard.isBinaryExpr(node) &&
      !TreeNodeTypeGuard.isUnaryExpr(node) &&
      !TreeNodeTypeGuard.isCallExpr(node)
  };

  public validateAssignmentRHS(node: SyntaxTree.BaseNodeAST, isMember: boolean = false): SyntaxTree.BaseNodeAST {

    if (!isMember) {
      
      if (this.isInvalidNode(node)) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected rhs value within assignment expression!`, node.info.start)
      };

    } else {
      if (this.isInvalidNode(node) && !TreeNodeTypeGuard.isMethod(node)) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected rhs value within direct member assignment expression!`, node.info.start)
      };
      
    };
    
    return node;
  };

  public validateAssignmentLHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid lhs value is present within assignment expression!`, node.info.start);
    };

    return node;
  };

  public validateCallExprCallee(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid callee present within "call" expression!`, node.info.start);
    };

    return node;
  };

  public validateVarInit(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    if (this.isInvalidNode(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected value within a variable initializer!`, node.info.start)
    };

    return node;
  };
  
  public validateReturn(node: SyntaxTree.BaseNodeAST) {
    if (!this.state.inMethod) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "return" statement outside of a method body!`, node.info.start);
    };

    return node;
  };

  public validateArgument(node: SyntaxTree.BaseNodeAST) {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isLiteral(node) && !TreeNodeTypeGuard.isMemberExpr(node) && !TreeNodeTypeGuard.isCallExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid argument value has been set!`, node.info.start);
    };

    return node;
  };

  public validateConstant(node: SyntaxTree.VariableNode) {
    if (!node.init && node.isConst) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Uninitialized constant at "${node.ident.name}"`, node.info.start);
    };
  };

  public validateBreak(info: TokenInformation) {
    if (!this.state.inLoop && !this.state.inCase) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "break" statement outside of a loop or case statement!`, info.start);
    };
  };

  public validateContinue(info: TokenInformation) {
    if (!this.state.inLoop) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "continue" statement oustide of a loop!`, info.start);
    };
  };

  public validateMethod(info: LinePosition) {
    if (!this.state.inObj) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered a "method" expression outside of an object!`, info);
    };
  };
};

export default SemanticValidator;
