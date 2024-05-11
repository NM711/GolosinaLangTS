import GolosinaExceptions from "../../errors/exceptions";
import TreeNodeTypeGuard from "../../guards/node_gurads";
import SemanticValidator from "./semantic_validator";
import ErrorReporter from "../../errors/reporter";
import { SyntaxTree } from "./ast";
import { TokenIdentifiers } from "../../types/token.types";
import { LinePosition, Token } from "../lexer/token";
import { DataType } from "../../common";

class Parser {
  private program: SyntaxTree.Program;
  private validator: SemanticValidator;
  private tokens: Token[];
  private index: number;

  constructor() {
    this.program = [];
    this.validator = new SemanticValidator();
    this.index = 0;
  };

  public set setSource(tokens: Token[]) {
    this.tokens = tokens;
  };

  private reset(): void {
    this.tokens = [];
    this.program = [];
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
    let token = this.look;

    switch (this.look.id) {
      case TokenIdentifiers.BOOLEAN_LITERAL:
        this.eat();
        return new SyntaxTree.LiteralNode(token.lexeme, DataType.T_BOOLEAN, token.info);
      case TokenIdentifiers.INTEGER_LITERAL:
        this.eat();
        return new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_INTEGER, token.info);
      case TokenIdentifiers.FLOAT_LITERAL:
        this.eat();
        return new SyntaxTree.LiteralNode(token.lexeme, DataType.T_FLOAT, token.info);
      case TokenIdentifiers.NULL:
        this.eat();
        return new SyntaxTree.LiteralNode(token.lexeme, DataType.T_NULL, token.info);
      case TokenIdentifiers.STRING_LITERAL:
        this.eat();
        return new SyntaxTree.LiteralNode(token.lexeme, DataType.T_STRING, token.info);
      case TokenIdentifiers.IDENT:
        this.eat();
        return new SyntaxTree.IdentfierNode(token.lexeme, token.info)
      case TokenIdentifiers.CLONE:
        return this.parseCloneExpr();
      case TokenIdentifiers.METHOD:
        return this.parseMethodExpr();

      default:
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected primary expression start at "${this.look.lexeme}"!`, this.look.info.start);
    };
  };

  private parseReturn(): SyntaxTree.ReturnStatementNode {
    this.eat();
    const returned = new SyntaxTree.ReturnStatementNode(this.look.info, this.validator.validateReturn(this.parseExpr()));

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

      params.push(ident);

      if (this.index === this.tokens.length) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info.start);
      };

      if (this.validator.tokenConditions.isRightParenthesis(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseBreakStmnt(): SyntaxTree.BreakStatementNode {
    this.validator.validateBreak(this.look.info);
    const breakStmnt = new SyntaxTree.BreakStatementNode(this.look.info);
    this.eat();

    return breakStmnt;
  };

  private parseContinueStmnt(): SyntaxTree.ContinueStatementNode {
    this.validator.validateContinue(this.look.info);
    const continueStmnt = new SyntaxTree.ContinueStatementNode(this.look.info);
    this.eat();

    return continueStmnt;
  };

  private parseIfStmnt(): SyntaxTree.IfStatementNode {
    const ifStmnt = new SyntaxTree.IfStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    ifStmnt.condition = this.parseExpr();
    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    ifStmnt.block = this.parseBlock();

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.ELSE, this.look)) {
      this.eat();
      ifStmnt.alternate = (this.validator.tokenConditions.isTokenID(TokenIdentifiers.IF, this.look)) ? this.parseIfStmnt() : this.parseBlock();
    };

    return ifStmnt;
  };

  private parseCaseStmnt(): SyntaxTree.CaseStatementNode {
    this.validator.state.inCase = true;
    const caseStmnt = new SyntaxTree.CaseStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    caseStmnt.discriminant = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    this.validator.expect.leftCurly(this.look);
    this.eat();

    let defaultCounter: number = 0;

    while (true) {
      const caseTest = new SyntaxTree.CaseStatementTestNode(this.look.info);

      if (!this.validator.tokenConditions.isCaseTest(this.look)) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Expected a valid test within "case" statement!`, this.look.info.start);
      };

      if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.DEFAULT, this.look)) {
        ++defaultCounter;
        this.eat();
        caseTest.isDefault = true;
        caseTest.block = this.parseBlock();
      } else {
        this.eat();
        caseTest.condition = this.parseExpr();
        caseTest.block = this.parseBlock();
      };

      caseStmnt.tests.push(caseTest);

      if (!this.validator.tokenConditions.isCaseTest(this.look)) {
        break;
      };
    };

    if (defaultCounter > 1) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered more than one case "default"!`, caseStmnt.info.start);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();
    this.validator.state.inCase = false;
    return caseStmnt;
  };

  private parseForStmnt(): SyntaxTree.ForStatementNode {
    this.validator.state.inLoop = true;
    const forStmnt = new SyntaxTree.ForStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    forStmnt.init = this.parse();
    this.validator.expect.semicolon(this.look);
    this.eat();
    forStmnt.condition = this.parseExpr();
    this.validator.expect.semicolon(this.look);
    this.eat();
    forStmnt.update = this.parseExpr();
    this.validator.expect.rightParenthesis(this.look);
    this.eat();
    forStmnt.block = this.parseBlock();

    this.validator.state.inLoop = false;
    return forStmnt;
  };

  private parseWhileStmnt(): SyntaxTree.WhileStatementNode {
    const whileStmnt = new SyntaxTree.WhileStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    whileStmnt.condition = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    whileStmnt.block = this.parseBlock();

    return whileStmnt;
  };

  private parseMethodExpr(): SyntaxTree.BaseNodeAST {
    this.validator.state.inMethod = true;
    const method = new SyntaxTree.MethodExpressionNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    if (!this.validator.tokenConditions.isRightParenthesis(this.look)) {
      this.parseParams(method.params);
    };

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    method.block = this.parseBlock();
    this.validator.state.inMethod = false;
    return method;
  };

  private parseVar(): SyntaxTree.BaseNodeAST {
    const variable = new SyntaxTree.VariableNode(this.look.info);

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.CONST, this.look)) {
      variable.isConst = true;
    };

    this.eat();

    variable.ident = this.validator.expect.ident(this.parsePrimary(), "Variable Identifier");

    if (this.validator.tokenConditions.isTokenID(TokenIdentifiers.BINARY_ASSIGNMENT, this.look)) {
      this.eat();
      variable.init = this.parseExpr();
    };

    this.validator.validateConstant(variable);
    return variable;
  };

  private parseObjectMembers(members: SyntaxTree.DirectMemberNode[]) {
    while (true) {
      const direct = new SyntaxTree.DirectMemberNode(this.look.info);

      direct.key = this.validator.expect.ident(this.parsePrimary(), "Object Key Identfier");

      this.validator.expect.token(TokenIdentifiers.BINARY_ASSIGNMENT, "=", this.look);
      this.eat();

      direct.value = this.validator.validateAssignmentRHS(this.parseExpr(), true);
      members.push(direct);

      if (this.index === this.tokens.length) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Expected object end "}" but instead reached "EOF"!`, this.look.info.start);
      };

      if (this.validator.tokenConditions.isRightCurly(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseObjectExpr(): SyntaxTree.ObjectExpressionNode {
    this.validator.state.inObj = true;
    this.validator.expect.leftCurly(this.look);
    const object = new SyntaxTree.ObjectExpressionNode(this.look.info);
    this.eat();

    if (!this.validator.tokenConditions.isTokenID(TokenIdentifiers.RIGHT_CURLY, this.look)) {
      this.parseObjectMembers(object.members);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();
    this.validator.state.inObj = false;
    return object;
  };

  private parseCloneExpr(): SyntaxTree.CloneExpressionNode {
    const cloningExpr = new SyntaxTree.CloneExpressionNode(this.look.info);
    this.eat();

    cloningExpr.cloning = this.validator.expect.memberOrIdent(this.parseExpr(), "Clone Object Identifier");
    cloningExpr.object = this.parseObjectExpr();

    return cloningExpr;
  };

  private parseArguments(args: SyntaxTree.BaseNodeAST[]) {
    while (true) {
      const arg = this.validator.validateArgument(this.parseExpr());

      args.push(arg);

      if (this.index === this.tokens.length) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info.start);
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
    };

    while ((TreeNodeTypeGuard.isIdent(lhs) || TreeNodeTypeGuard.isMemberExpr(lhs)) && this.validator.tokenConditions.isArrow(this.look)) {
      const memberExpr = new SyntaxTree.MemberExpressionNode(this.look.info);
      // eat operator "->"
      this.eat();
      memberExpr.parent = lhs;

      memberExpr.accessing = this.validator.expect.ident(this.parsePrimary(), `Member Accessor Identifier`);

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
      unary.argument = this.validator.expect.memberOrIdent(this.parseExpr());
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
      assignment.rhs = this.validator.validateAssignmentRHS(this.parseExpr());
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

      case TokenIdentifiers.BREAK:
        return this.parseBreakStmnt();

      case TokenIdentifiers.CONTINUE:
        return this.parseContinueStmnt();

      case TokenIdentifiers.IF:
        return this.parseIfStmnt();

      case TokenIdentifiers.FOR:
        return this.parseForStmnt();

      case TokenIdentifiers.WHILE:
        return this.parseWhileStmnt();

      case TokenIdentifiers.RETURN:
        return this.parseReturn();

      case TokenIdentifiers.CASE:
        return this.parseCaseStmnt();

      default:
        return this.parseExpr()
    };
  };

  /*
    Syncronizing the parser after error state.
  */

  private synchronize() {
    while (this.index < this.tokens.length) {
      // eat till we reach the next statement.
      this.eat();
      switch (this.look.id) {
        case TokenIdentifiers.LET:
        case TokenIdentifiers.CONST:
        case TokenIdentifiers.FOR:
        case TokenIdentifiers.WHILE:
        case TokenIdentifiers.IF:
        case TokenIdentifiers.RETURN:
        case TokenIdentifiers.CASE:
        case TokenIdentifiers.BREAK:
        case TokenIdentifiers.CONTINUE:
        return;
      };
    };
  };

  public generateAST(): SyntaxTree.Program {
    let start: LinePosition | undefined;
    let end: LinePosition | undefined;
    let startIndex: number = 0;
    let endIndex: number = 0;
        
    while (this.index < this.tokens.length) {
      try {
        startIndex = this.index;
        start = this.tokens[this.index].info.start as LinePosition;
        this.program.push(this.parse());
        this.validator.expect.semicolon(this.look);
        this.eat();
      
      } catch (e) {
        this.synchronize();
        if (this.tokens[this.index]) {
          endIndex = this.index;
        } else {
          endIndex = this.index - 1;
        };
        
        end = this.tokens[endIndex].info.start as LinePosition;
        
        if (e instanceof GolosinaExceptions.Frontend.SyntaxError) {
          e.start = start;
          e.end = end;
          e.startIndex = startIndex;
          e.endIndex = endIndex;
        };

        // push errors to unwind later.
        ErrorReporter.syntaxErrors.push(e);
      };
    };

    // at the very end if, run the reporter. If there is any errors within the error stack. The reporter will gracefully exit after
    // logging all of the errors and lines.
    ErrorReporter.syntax(this.tokens);
  
    const program = this.program;
    this.reset();
    return program;
  };
};

export default Parser;
