import { SyntaxTree } from "./ast";
import { Token, TokenIdentifiers } from "../types/token.types";
import { GolosinaSyntaxError } from "../exceptions"
import { DataType } from "../common";
import TreeNodeTypeGuard from "../guards/node_gurads";
import SemanticValidator from "./semantic_validator";

enum ParserState {
  NONE,
  IN_LOOP,
  IN_CASE,
};


class Parser {
  private validator: SemanticValidator;
  private tokens: Token[];
  private index: number;
  private state: ParserState;

  constructor() {
    this.validator = new SemanticValidator();
    this.state = ParserState.NONE;
    this.index = 0;
  };

  public set setSource(tokens: Token[]) {
    this.tokens = tokens;
  };

  private reset(): void {
    this.tokens = [];
    this.index = 0;
  };

  private get look(): Token {
    if (this.index < this.tokens.length) {
      return this.tokens[this.index]
    } else {
      return this.tokens[this.index - 1];
    };
  };

  private eat(): void {
    if (this.index < this.tokens.length) {
      ++this.index;
    };
  };

  private parsePrimary(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.BOOLEAN_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_BOOLEAN, this.look.info);
      case TokenIdentifiers.INTEGER_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_INTEGER, this.look.info);
      case TokenIdentifiers.FLOAT_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_FLOAT, this.look.info);
      case TokenIdentifiers.NULL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_NULL, this.look.info);
      case TokenIdentifiers.STRING_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_STRING, this.look.info);
      case TokenIdentifiers.IDENT:
        return new SyntaxTree.IdentfierNode(this.look.lexeme, this.look.info)
      default:
        // temporary error
        throw new GolosinaSyntaxError(`Unexpected primary expression at "${this.look.lexeme}"!`, this.look.info);
    };
  };

  private parseReturn(): SyntaxTree.ReturnStatementNode {
    this.eat();
    const returned = new SyntaxTree.ReturnStatementNode(this.look.info, this.validator.validateReturn(this.parse()));

    return returned;
  };

  private parseBlock(): SyntaxTree.BlockNode {
    const block = new SyntaxTree.BlockNode(this.look.info);

    this.validator.expect.leftCurly(this.look);
    this.eat();

    while (this.look.id !== TokenIdentifiers.RIGHT_CURLY) {
      block.body.push(this.parse());
      this.validator.expect.semicolon(this.look);
      this.eat();
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();

    return block;
  };

  private parseParams(params: SyntaxTree.IdentfierNode[]) {
    while (true) {
      const ident = this.validator.expect.ident(this.parsePrimary(), "Parameter Identifier");
      this.eat();

      params.push(ident);

      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info);
      };

      if (this.validator.tokenConditions.isRightParenthesis(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseBreakStmnt(): SyntaxTree.BreakStatementNode {
    if (this.state !== ParserState.IN_LOOP && this.state !== ParserState.IN_CASE) {
      throw new GolosinaSyntaxError(`Encountered an unexpected "break" statement outside of a loop or case statement!`, this.look.info);
    };

    const breakStmnt = new SyntaxTree.BreakStatementNode(this.look.info);
    this.eat();

    return breakStmnt;
  };

  private parseContinueStmnt(): SyntaxTree.ContinueStatementNode {
    if (this.state !== ParserState.IN_LOOP) {
      throw new GolosinaSyntaxError(`Encountered an unexpected "continue" statement oustide of a loop!`, this.look.info);
    };

    const continueStmnt = new SyntaxTree.ContinueStatementNode(this.look.info);
    this.eat();

    return continueStmnt;
  };

  private parseIfStmnt(): SyntaxTree.IfStatementNode {
    const ifStmnt = new SyntaxTree.IfStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    ifStmnt.condition = this.validator.validateConditionExpression(this.parse());
    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    ifStmnt.block = this.parseBlock();

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.ELSE, this.look)) {
      this.eat();
      ifStmnt.alternate = (this.validator.tokenConditions.isTokenID(TokenIdentifiers.IF, this.look)) ? this.parseIfStmnt() : this.parseBlock();
    };

    return ifStmnt;
  };

  public parseCaseStmnt(): SyntaxTree.CaseStatementNode {
    this.state = ParserState.IN_CASE;
    const caseStmnt = new SyntaxTree.CaseStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    caseStmnt.discriminant = this.validator.validateConditionExpression(this.parse());

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    this.validator.expect.leftCurly(this.look);
    this.eat();

    let defaultCounter: number = 0;

    while (true) {
      const caseTest = new SyntaxTree.CaseStatementTestNode(this.look.info);

      if (!this.validator.tokenConditions.isCaseTest(this.look)) {
        throw new GolosinaSyntaxError(`Expected a valid test within "case" statement!`, this.look.info);
      };

      if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.DEFAULT, this.look)) {
        ++defaultCounter;
        this.eat();
        caseTest.isDefault = true;
        caseTest.block = this.parseBlock();
      } else {
        this.eat();
        caseTest.condition = this.validator.validateConditionExpression(this.parse());
        caseTest.block = this.parseBlock();
      };

      caseStmnt.tests.push(caseTest);
      
      if (!this.validator.tokenConditions.isCaseTest(this.look)) {
        break;
      };
    };

    if (defaultCounter > 1) {
      throw new GolosinaSyntaxError(`Encountered more than one case "default"!`, caseStmnt.info);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();
    return caseStmnt;
  };

  private parseForStmnt(): SyntaxTree.ForStatementNode {
    this.state = ParserState.IN_LOOP;
    const forStmnt = new SyntaxTree.ForStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    forStmnt.init = this.parse();
    this.validator.expect.semicolon(this.look);
    this.eat();
    forStmnt.condition = this.validator.validateConditionExpression(this.parse());
    this.validator.expect.semicolon(this.look);
    this.eat();
    forStmnt.update = this.parse();
    this.validator.expect.rightParenthesis(this.look);
    this.eat();
    forStmnt.block = this.parseBlock();

    this.state = ParserState.NONE;
    return forStmnt;
  };

  public parseWhileStmnt(): SyntaxTree.WhileStatementNode {
    const whileStmnt = new SyntaxTree.WhileStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    whileStmnt.condition = this.validator.validateConditionExpression(this.parse());

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    whileStmnt.block = this.parseBlock();

    return whileStmnt;
  };

  private parseMethod(): SyntaxTree.BaseNodeAST {
    const method = new SyntaxTree.MethodNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();
    
    if (!this.validator.tokenConditions.isRightParenthesis(this.look)) {
      this.parseParams(method.params);
    };

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    method.block = this.parseBlock();

    return method;
  };

  private parseVar(): SyntaxTree.BaseNodeAST {
    const variable = new SyntaxTree.VariableNode(this.look.info);

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.CONST, this.look)) {
      variable.isConst = true;
    };

    this.eat();

    variable.ident = this.validator.expect.ident(this.parsePrimary(), "Variable Identifier");
    this.eat();

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.BINARY_ASSIGNMENT, this.look)) {
      this.eat();
      variable.init = this.validator.validateVarInit(this.parse());
    };

    this.validator.validateConstant(variable);

    return variable;
  };

  private parseObjectMembers(members: SyntaxTree.DirectMemberNode[]) {
    while (true) {
      const direct = new SyntaxTree.DirectMemberNode(this.look.info);

      direct.key = this.validator.expect.ident(this.parsePrimary(), "Object Key Identfier");
      this.eat();

      this.validator.expect.token(TokenIdentifiers.BINARY_ASSIGNMENT, "=", this.look);
      this.eat();

      direct.value = this.validator.validateAssignmentRHS(this.parse(), true);

      members.push(direct);

      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected object end "}" but instead reached "EOF"!`, this.look.info);
      };

      if (this.validator.tokenConditions.isRightCurly(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseObjectExpr(): SyntaxTree.ObjectExpressionNode {
    this.validator.expect.leftCurly(this.look);
    const object = new SyntaxTree.ObjectExpressionNode(this.look.info);
    this.eat();

    if (!this.validator.tokenConditions.isTokenID(TokenIdentifiers.RIGHT_CURLY, this.look)) {
      this.parseObjectMembers(object.members);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();

    return object;
  };

  private parseCloneStmnt(): SyntaxTree.CloneStatementNode {
    const cloningExpr = new SyntaxTree.CloneStatementNode(this.look.info);
    this.eat();

    cloningExpr.cloning = this.validator.expect.memberOrIdent(this.parse(), "Clone Object Identifier");

    cloningExpr.object = this.parseObjectExpr();

    return cloningExpr;
  };

  private parseArguments(args: SyntaxTree.BaseNodeAST[]) {
    while (true) {
      const arg = this.validator.validateArgument(this.parse());

      args.push(arg);

      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info);
      };

      if (this.validator.tokenConditions.isRightParenthesis(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseMemberExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = new SyntaxTree.UnaryExpressionNode(this.look.info);

    if (!this.validator.tokenConditions.isPrefix(this.look)) {
      lhs = this.parsePrimary();
      this.eat();
    };

    while ((TreeNodeTypeGuard.isIdent(lhs) || TreeNodeTypeGuard.isMemberExpr(lhs)) && this.validator.tokenConditions.isArrow(this.look)) {
      const memberExpr = new SyntaxTree.MemberExpressionNode(this.look.info);
      // eat operator "->"
      this.eat();
      memberExpr.parent = lhs;

      memberExpr.accessing = this.validator.expect.ident(this.parsePrimary(), `Member Accessor Identifier`);
      this.eat();

      lhs = memberExpr;
    };
    return lhs;
  };

  private parseCallExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseMemberExpr();

    if (this.validator.tokenConditions.isLeftParenthesis(this.look)) {
      const call = new SyntaxTree.ExpressionCallNode(this.look.info);
      this.eat();

      call.callee = this.validator.validateCallExprCallee(lhs);

      // parse arguments

      if (!this.validator.tokenConditions.isRightParenthesis(this.look)) {
        this.parseArguments(call.arguments);
      };

      this.validator.expect.rightParenthesis(this.look);
      this.eat();

      lhs = call;
    };
    return lhs;
  };

  private parsePostfix(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseCallExpr();
    if ((TreeNodeTypeGuard.isIdent(lhs) || TreeNodeTypeGuard.isMemberExpr(lhs)) && this.validator.tokenConditions.isPostfix(this.look)) {
      const unary = new SyntaxTree.UnaryExpressionNode(this.look.info);
      unary.argument = lhs;
      unary.op = this.look.lexeme;
      this.eat();

      lhs = unary;
    };
    return lhs;
  };

  private parsePrefix(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parsePostfix();

    if (this.validator.tokenConditions.isPrefix(this.look)) {
      const unary = new SyntaxTree.UnaryExpressionNode(this.look.info);
      unary.isPrefix = true;
      unary.op = this.look.lexeme;
      this.eat();
      unary.argument = this.validator.expect.memberOrIdent(this.parse());
      lhs = unary;
    };

    return lhs;
  };

  private parseMultiplicative(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parsePrefix();

    while (this.validator.tokenConditions.isMultiplicative(this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("BinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseMemberExpr();

      lhs = binary;
    };

    return lhs
  };

  private parseAdditive(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseMultiplicative();

    while (this.validator.tokenConditions.isAdditive(this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("BinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseMultiplicative();
      lhs = binary;
    };
    return lhs
  };

  private parseRelational(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseAdditive();

    while (this.validator.tokenConditions.isRelational(this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("RelationalBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseAdditive();
      lhs = binary;
    };

    return lhs

  };

  private parseEquality(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseRelational();

    while (this.validator.tokenConditions.isEquality(this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("EqualityBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseRelational();
      lhs = binary;
    };

    return lhs;
  };

  private parseLogical(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseEquality();

    while (this.validator.tokenConditions.isTokenID(TokenIdentifiers.BINARY_AND, this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("LogicalBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseEquality();
      lhs = binary;
    };

    while (this.validator.tokenConditions.isTokenID(TokenIdentifiers.BINARY_OR, this.look)) {
      const binary = new SyntaxTree.BinaryExpressionNode("LogicalBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseEquality();
      lhs = binary;
    };

    return lhs;
  };

  private parseAssignment(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseLogical();

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.BINARY_ASSIGNMENT, this.look)) {
      const assignment = new SyntaxTree.AssignmentExpressionNode(this.look.info);

      assignment.lhs = this.validator.validateAssignmentLHS(lhs);
      assignment.op = this.look.lexeme;
      this.eat();
      assignment.rhs = this.validator.validateAssignmentRHS(this.parse());
      lhs = assignment;
    };

    return lhs;
  };

  private parseExpr(): SyntaxTree.BaseNodeAST {
    return this.parseAssignment();
  };

  private parse(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.LET:
      case TokenIdentifiers.CONST:
        return this.parseVar()

      case TokenIdentifiers.CLONE:
        return this.parseCloneStmnt();

      case TokenIdentifiers.BREAK:
        return this.parseBreakStmnt();

      case TokenIdentifiers.CONTINUE:
        return this.parseContinueStmnt();

      case TokenIdentifiers.METHOD:
        return this.parseMethod();

      case TokenIdentifiers.IF:
        return this.parseIfStmnt();

      case TokenIdentifiers.CASE:
        return this.parseCaseStmnt();

      case TokenIdentifiers.FOR:
        return this.parseForStmnt();

      case TokenIdentifiers.WHILE:
        return this.parseWhileStmnt();

      case TokenIdentifiers.RETURN:
        return this.parseReturn();

      default:
        return this.parseExpr()
    };
  };

  public generateAST(): SyntaxTree.Program {
    const program: SyntaxTree.Program = [];

    while (this.index < this.tokens.length) {
      try {
        program.push(this.parse());
        this.validator.expect.semicolon(this.look);
        this.eat();
      } catch (e) {
        console.error(`${e.name}: ${e.message}`);
        process.exit(1);
      }
    };

    this.reset();
    return program;
  };
};

export default Parser;
