import GolosinaExceptions from "../../errors/exceptions";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import { TokenIdentifiers } from "../../types/token.types";
import { Token, TokenInformation } from "../lexer/token";
import { SyntaxTree } from "./ast";

class Expect {
  private input: string[];
  private file: string

  set setInput(input: string[]) {
    this.input = input;
  };

  set setFile(file: string) {
    this.file = file;
  };


  private error(expected: string, received: string, info: TokenInformation) {
    return new GolosinaExceptions.Frontend.SyntaxError(`Expected "${expected}" instead received "${received}"!`, info, this.file, this.input);
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

  public module(token: Token) {
    if (token.id !== TokenIdentifiers.MODULE) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`No top level "module" statement present in file!`, token.info, this.file, this.input);
    };
  };

  public declaration(token: Token) {
    if (token.id !== TokenIdentifiers.CONST && token.id !== TokenIdentifiers.LET) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to export a non declarative statement!`, token.info, this.file, this.input);
    };
  };

  public test(token: Token) {
    if (token.id !== TokenIdentifiers.OF && token.id !== TokenIdentifiers.DEFAULT) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Expected a valid test within "case" statement!`, token.info, this.file, this.input);
    };
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
  public state: State;
  private input: string[];
  private file: string;

  constructor() {
    this.expect = new Expect();
    this.state = new State();
  };

  public set setInput(input: string[]) {
    this.input = input;
    this.expect.setInput = input;
  };

  public set setFile(file: string) {
    this.file = file;
    this.expect.setFile = file;
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
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected rhs value within assignment expression!`, node.info, this.file, this.input)
      };

    } else {
      if (this.isInvalidNode(node) && !TreeNodeTypeGuard.isMethod(node)) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected rhs value within direct member assignment expression!`, node.info, this.file, this.input)
      };

    };

    return node;
  };

  public validateAssignmentLHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid lhs value is present within assignment expression!`, node.info, this.file, this.input);
    };

    return node;
  };

  public validateCallExprCallee(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid callee present within "call" expression!`, node.info, this.file, this.input);
    };

    return node;
  };

  public validateVarInit(node: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    if (this.isInvalidNode(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected value within a variable initializer!`, node.info, this.file, this.input)
    };

    return node;
  };

  public validateReturn(node: SyntaxTree.BaseNodeAST) {
    if (!this.state.inMethod) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "return" statement outside of a method body!`, node.info, this.file, this.input);
    };

    return node;
  };

  public validateCloningInCloneExpr(node: SyntaxTree.BaseNodeAST) {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to clone an object from an invalid expression type!`, node.info, this.file, this.input);
    };

    return node;
  };

  public validateConstant(node: SyntaxTree.VariableDeclarationStatementNode) {
    if (!node.init && node.isConst) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Uninitialized constant at "${node.ident.name}"`, node.info, this.file, this.input);
    };
  };

  public validateBreak(info: TokenInformation) {
    if (!this.state.inLoop && !this.state.inCase) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "break" statement outside of a loop or case statement!`, info, this.file, this.input);
    };
  };

  public validateUnaryExpr(node: SyntaxTree.BaseNodeAST, isPrefix: boolean = false) {
    if (!TreeNodeTypeGuard.isMemberExpr(node) && !TreeNodeTypeGuard.isIdent(node)) {
      if (isPrefix) {
        console.log(node);
        throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid expression argument in unary prefix expression!`, node.info, this.file, this.input);

      } else {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid expression argument in unary postfix expression!`, node.info, this.file, this.input);
      };

    };

    return node;
  };

  public validateContinue(info: TokenInformation) {
    if (!this.state.inLoop) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "continue" statement oustide of a loop!`, info, this.file, this.input);
    };
  };

  public validateMethod(info: LinePosition) {
    if (!this.state.inObj) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered a "method" expression outside of an object!`, info, this.file, this.input);
    };
  };
};

export default SemanticValidator;
