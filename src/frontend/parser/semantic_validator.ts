import GolosinaExceptions from "../../errors/exceptions";
import ReporterMetaData from "../../errors/reporter_meta_data";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import { TokenIdentifiers } from "../../types/token.types";
import { Token, TokenInformation } from "../lexer/token";
import { SyntaxTree } from "./ast";

class Expect {
  private error(expected: string, received: string, info: TokenInformation) {
    return new GolosinaExceptions.Frontend.SyntaxError(`Expected "${expected}" instead received "${received}"!`, info, ReporterMetaData.FilePath);
  };

  public token(id: TokenIdentifiers, lexeme: string, received: Token) {
    if (id !== received.id) {
      throw this.error(lexeme, received.lexeme, received.info);
    };
  };

  public semicolon(received: Token) {
    if (TokenIdentifiers.SEMICOLON_SYMB !== received.id) {
      throw this.error(";", received.lexeme, received.info);
    };
  };

  public seperator(received: Token) {
    if (TokenIdentifiers.COMMA_SYMB !== received.id) {
      throw this.error(",", received.lexeme, received.info);
    };
  };

  public leftParenthesis(received: Token) {
    if (TokenIdentifiers.LEFT_PARENTHESIS_SYMB !== received.id) {
      throw this.error("(", received.lexeme, received.info);
    };
  };

  public rightParenthesis(received: Token) {
    if (TokenIdentifiers.RIGHT_PARENTHESIS_SYMB !== received.id) {
      throw this.error(")", received.lexeme, received.info);
    };
  };

  public leftCurly(received: Token) {
    if (TokenIdentifiers.LEFT_CURLY_SYMB !== received.id) {
      throw this.error("{", received.lexeme, received.info);
    };
  };

  public rightCurly(received: Token) {
    if (TokenIdentifiers.RIGHT_CURLY_SYMB !== received.id) {
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
      throw new GolosinaExceptions.Frontend.SyntaxError(`No top level "module" statement present in file!`, token.info, ReporterMetaData.FilePath); 
    };
  };

  public declaration(token: Token) {
    if (token.id !== TokenIdentifiers.CONST && token.id !== TokenIdentifiers.LET) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to export a non declarative statement!`, token.info, ReporterMetaData.FilePath);
    };
  };

  public test(token: Token) {
    if (token.id !== TokenIdentifiers.OF && token.id !== TokenIdentifiers.DEFAULT) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Expected a valid test within "case" statement!`, token.info, ReporterMetaData.FilePath);
    };
  };
};

/**
  Parser state in order to detect out of place statements.
*/

class State {
  public inLoop: boolean;
  public inCase: boolean;
  public inMethod: boolean;
  constructor() {
    this.inCase = false;
    this.inLoop = false;
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

  constructor() {
    this.expect = new Expect();
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

  public validateAssignmentLHS(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid lhs value is present within assignment expression!`, node.info, ReporterMetaData.FilePath);
    };

    return node;
  };

  public validateCallExprCallee(node: SyntaxTree.BaseNodeAST): SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid callee present within "call" expression!`, node.info, ReporterMetaData.FilePath);
    };

    return node;
  };

  public validateReturn(info: TokenInformation) {
    if (!this.state.inMethod) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "return" statement outside of a method body!`, info, ReporterMetaData.FilePath);
    };
  };

  public validateCloningInCloneExpr(node: SyntaxTree.BaseNodeAST) {
    if (!TreeNodeTypeGuard.isIdent(node) && !TreeNodeTypeGuard.isMemberExpr(node)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to clone an object from an invalid expression type!`, node.info, ReporterMetaData.FilePath);
    };

    return node;
  };

  public validateConstant(node: SyntaxTree.VariableDeclarationStatementNode) {
    if (!node.init && node.isConst) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Uninitialized constant at "${node.ident.name}"`, node.info, ReporterMetaData.FilePath);
    };
  };

  public validateBreak(info: TokenInformation) {
    if (!this.state.inLoop && !this.state.inCase) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "break" statement outside of a loop or case statement!`, info, ReporterMetaData.FilePath);
    };
  };

  public validateUnaryExpr(node: SyntaxTree.UnaryExpressionNode) {
    if (!TreeNodeTypeGuard.isMemberExpr(node.argument) && !TreeNodeTypeGuard.isIdent(node.argument)) {
      if (node.isPrefix) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid left-hand side argument in unary prefix expression!`, node.info, ReporterMetaData.FilePath);
      } else {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Invalid left-hand side argument in unary postfix expression!`, node.info, ReporterMetaData.FilePath);
      };

    };

    return node;
  };

  public validateContinue(info: TokenInformation) {
    if (!this.state.inLoop) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered an unexpected "continue" statement oustide of a loop!`, info, ReporterMetaData.FilePath);
    };
  };
};

export default SemanticValidator;
