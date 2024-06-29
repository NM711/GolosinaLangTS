import GolosinaExceptions from "../../errors/exceptions";
import SemanticValidator from "./semantic_validator";
import ErrorReporter from "../../errors/reporter";
import Lexer from "../lexer/lexer";
import fs from "node:fs";
import { StatementOffsetTracker, SyntaxTree } from "./ast";
import { TokenIdentifiers } from "../../types/token.types";
import { Token } from "../lexer/token";
import { DataType } from "../../common";
import ReporterMetaData from "../../errors/reporter_meta_data";


class Helpers {
  public isArrow(token: Token) {
    return token.id === TokenIdentifiers.ARROW_SYMB;
  };

  public isLeftParen(token: Token) {
    return token.id === TokenIdentifiers.LEFT_PARENTHESIS_SYMB;
  };

  public isRightParen(token: Token) {
    return token.id === TokenIdentifiers.RIGHT_PARENTHESIS_SYMB;
  };

  public isRightCurly(token: Token) {
    return token.id === TokenIdentifiers.RIGHT_CURLY_SYMB;
  };

  public isSemicolon(token: Token) {
    return token.id === TokenIdentifiers.SEMICOLON_SYMB;
  };

  public isSeperator(token: Token) {
    return token.id === TokenIdentifiers.COMMA_SYMB;
  };

  public isUnIncrement(token: Token) {
    return token.id === TokenIdentifiers.UNARY_INCREMENT;
  };

  public isUnDecrement(token: Token) {
    return token.id === TokenIdentifiers.UNARY_DECREMENT;
  };

  public isUnNot(token: Token) {
    return token.id === TokenIdentifiers.EXCLMATION_SYMB;
  };

  public isPostfix(token: Token) {
    return this.isUnIncrement(token) || this.isUnDecrement(token);
  };

  public isPrefix(token: Token) {
    return this.isPostfix(token) || token.id === TokenIdentifiers.EXCLMATION_SYMB || token.id === TokenIdentifiers.PLUS_SYMB || token.id === TokenIdentifiers.MINUS_SYMB;
  };

  public isMultiplicative(token: Token) {
    return token.id === TokenIdentifiers.STAR_SYMB || token.id === TokenIdentifiers.SLASH_SYMB || token.id === TokenIdentifiers.PERCENTAGE_SYMB;
  };

  public isAdditive(token: Token) {
    return token.id === TokenIdentifiers.PLUS_SYMB || token.id === TokenIdentifiers.MINUS_SYMB;
  };

  public isRelational(token: Token) {
    return token.id === TokenIdentifiers.LEFT_ANGLE_BRACKET_SYMB || token.id === TokenIdentifiers.LEFT_ANGLE_BRACKET_EQ_SYMB || token.id === TokenIdentifiers.RIGHT_ANGLE_BRACKER_SYMB || token.id === TokenIdentifiers.RIGHT_ANGLE_BRACKET_EQ_SYMB;
  };

  public isEquality(token: Token) {
    return token.id === TokenIdentifiers.BINARY_EQUALITY || token.id === TokenIdentifiers.BINARY_INEQUALITY;
  };

  public isLogicalOr(token: Token) {
    return token.id === TokenIdentifiers.BINARY_OR;
  };

  public isLogicalAnd(token: Token) {
    return token.id === TokenIdentifiers.BINARY_AND;
  };

  public isIf(token: Token) {
    return token.id === TokenIdentifiers.IF;
  };

  public isElse(token: Token) {
    return token.id === TokenIdentifiers.ELSE;
  };
};

class Parser {
  private program: SyntaxTree.Program;
  private lexer: Lexer;
  private helpers: Helpers;
  private validator: SemanticValidator;
  private tokens: Token[];
  private index: number;
  private track: StatementOffsetTracker;

  constructor() {
    this.lexer = new Lexer();
    this.helpers = new Helpers();
    this.validator = new SemanticValidator();
    this.track = new StatementOffsetTracker();
    this.program = [];
    this.index = 0;
  };

  public setSource(inputOrPath: string, isPath: boolean) {
    if (isPath) {
      ReporterMetaData.FilePath = inputOrPath;
      ReporterMetaData.Input = fs.readFileSync(ReporterMetaData.FilePath, "utf8");
    } else {
      ReporterMetaData.Input = inputOrPath;
    };

    this.tokens = this.lexer.execute();
  };

  public get getTokens() {
    return this.tokens;
  };

  public reset(): void {
    this.tokens = [];
    this.program = [];
    this.lexer.reset();
    this.index = 0;
  };

  private get look(): Token {
    return this.tokens[this.index];
  };

  private eat(): void {
    if (this.look.id !== TokenIdentifiers.EOF_T) {
      ++this.index;
    };
  };

  private parseLiteralExpr(): (SyntaxTree.BaseNodeAST | null) {
    let node: SyntaxTree.BaseNodeAST | null = null;

    switch (this.look.id) {
      case TokenIdentifiers.STRING_LITERAL:
        node = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_STRING, this.look.info);
        break;

      case TokenIdentifiers.BOOLEAN_LITERAL:
        node = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_BOOLEAN, this.look.info);
        break;

      case TokenIdentifiers.NULL_LITERAL:
        node = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_NULL, this.look.info);
        break;

      case TokenIdentifiers.INTEGER_LITERAL:
        node = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_INTEGER, this.look.info);
        break;

      case TokenIdentifiers.FLOAT_LITERAL:
        node = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_FLOAT, this.look.info);
        break;

      case TokenIdentifiers.IDENT:
        node = new SyntaxTree.IdentfierNode(this.look.lexeme, this.look.info);
        break;

      default:
        return null;
    };

    this.eat();
    return node;
  };

  private parseMemberPrimary() {
    if (this.look.id === TokenIdentifiers.CASE) {
      return this.parseCaseExpr();
    } else if (this.look.id === TokenIdentifiers.CLONE) {
      return this.parseCloneExpr();
    } else if (this.look.id === TokenIdentifiers.METHOD) {
      return this.parseMethodExpr();
    } else {
      return this.parseExpr();
    };
  };

  private parsePrimary(): SyntaxTree.BaseNodeAST {
    const literal = this.parseLiteralExpr();

    if (literal) {
      return literal;
    } else if (this.look.id === TokenIdentifiers.CASE) {
      return this.parseCaseExpr();
    } else if (this.look.id === TokenIdentifiers.CLONE) {
      return this.parseCloneExpr();
    } else if (this.look.id === TokenIdentifiers.IDENT) {
      return new SyntaxTree.IdentfierNode(this.look.lexeme, this.look.info);
    } else {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected primary expression!`, this.look.info, ReporterMetaData.FilePath);
    };
  };

  private parseCloneExpr(): SyntaxTree.BaseNodeAST {
    const expr = new SyntaxTree.CloneExpressionNode(this.look.info);
    this.eat();

    expr.cloning = this.validator.validateCloningInCloneExpr(this.parsePrimary());

    this.validator.expect.leftCurly(this.look);
    this.eat();

    while (!this.helpers.isRightCurly(this.look)) {
      const member = new SyntaxTree.DirectMemberNode(this.look.info);
      member.key = this.validator.expect.ident(this.parsePrimary(), "member key identifier!");

      this.validator.expect.token(TokenIdentifiers.EQUAL_SYMB, "=", this.look);
      this.eat();

      member.value = this.parseMemberPrimary();
      expr.members.push(member);

      if (this.helpers.isRightCurly(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();

    return expr;
  };

  private parseMethodExpr(): SyntaxTree.BaseNodeAST {
    this.validator.state.inMethod = true;
    const expr = new SyntaxTree.MethodExpressionNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    while (!this.helpers.isRightParen(this.look)) {
      const param = this.validator.expect.ident(this.parsePrimary());
      expr.params.push(param);

      if (this.helpers.isRightParen(this.look)) {
        break;
      };
      this.validator.expect.seperator(this.look);
      this.eat();
    };

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    expr.block = this.parseBlockStmnt();

    this.validator.state.inMethod = false;
    return expr;
  };

  private parseTopExpr(): SyntaxTree.BaseNodeAST {
    if (!this.helpers.isLeftParen(this.look)) {
      return this.parsePrimary();
    };

    const expr = new SyntaxTree.BinaryExpressionNode("GroupingExpression", this.look.info);
    this.eat();
    expr.rhs = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    return expr;
  };

  private applyMemberExprRule(lhs: SyntaxTree.BaseNodeAST) {
    while (this.helpers.isArrow(this.look)) {
      const expr = new SyntaxTree.MemberExpressionNode(lhs.info);
      this.eat();
      expr.parent = lhs;
      expr.accessing = this.validator.expect.ident(this.parsePrimary(), "accessor identifier");
      lhs = expr;
    };

    return lhs;
  };

  private applyCallExprRule(lhs: SyntaxTree.BaseNodeAST) {
    const expr = new SyntaxTree.ExpressionCallNode(lhs.info);
    expr.callee = this.validator.expect.memberOrIdent(lhs);
    this.eat();

    while (!this.helpers.isRightParen(this.look)) {
      const arg = this.parseExpr();
      expr.arguments.push(arg);

      if (this.helpers.isRightParen(this.look)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    lhs = expr;

    return lhs;
  };

  private applyPostfixExprRule(lhs: SyntaxTree.BaseNodeAST) {
    const expr = new SyntaxTree.UnaryExpressionNode(lhs.info);
    expr.op = this.look.lexeme;
    this.eat();
    expr.argument = lhs;
    lhs = expr;
    this.validator.validateUnaryExpr(expr);
    return lhs;
  };


  private parseCallAndAccessExpr() {
    let lhs = this.parseTopExpr();

    if (this.helpers.isArrow(this.look)) {
      lhs = this.applyMemberExprRule(lhs);
    };

    if (this.helpers.isLeftParen(this.look)) {
      lhs = this.applyCallExprRule(lhs);
    };

    if (this.helpers.isPostfix(this.look)) {
      lhs = this.applyPostfixExprRule(lhs);
    };

    return lhs;
  };

  private parsePrefixExpr(): SyntaxTree.BaseNodeAST {

    if (this.helpers.isPrefix(this.look)) {
      const expr = new SyntaxTree.UnaryExpressionNode(this.look.info);
      expr.isPrefix = true;
      expr.op = this.look.lexeme;
      this.eat();
      expr.argument = this.parseCallAndAccessExpr();

      this.validator.validateUnaryExpr(expr);
      return expr;
    };


    return this.parseCallAndAccessExpr();
  };

  private parseMultiplicativeExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parsePrefixExpr();

    while (this.helpers.isMultiplicative(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("MultiplicativeExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parsePrefixExpr();

      lhs = expr;
    };

    return lhs;
  };

  private parseAdditiveExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseMultiplicativeExpr();

    while (this.helpers.isAdditive(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("AdditiveExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parseMultiplicativeExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseRelationalExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseAdditiveExpr();

    while (this.helpers.isRelational(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("RelationalExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parseAdditiveExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseContinueStmnt(): SyntaxTree.ContinueStatementNode {
    this.validator.validateContinue(this.look.info);
    const continueStmnt = new SyntaxTree.ContinueStatementNode(this.look.info);
    this.eat();

    return continueStmnt;
  };

  private parseBreakStmnt(): SyntaxTree.BreakStatementNode {
    this.validator.validateBreak(this.look.info);
    const breakStmnt = new SyntaxTree.BreakStatementNode(this.look.info);
    this.eat();

    return breakStmnt;
  };

  private parseEqualityExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseRelationalExpr();

    while (this.helpers.isEquality(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("EqualityExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseRelationalExpr();
      lhs = expr;
    };

    return lhs;
  }

  private parseLogicalExpr() {
    let lhs = this.parseEqualityExpr();

    while (this.helpers.isLogicalOr(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("LogicalExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseEqualityExpr();
      lhs = expr;

    };

    while (this.helpers.isLogicalAnd(this.look)) {
      const expr = new SyntaxTree.BinaryExpressionNode("LogicalExpression", lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseEqualityExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseAssignmentExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseLogicalExpr();

    if (this.look.id === TokenIdentifiers.EQUAL_SYMB) {
      const expr = new SyntaxTree.AssignmentExpressionNode(lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = this.validator.validateAssignmentLHS(lhs);
      expr.rhs = this.parseExpr();
      lhs = expr;
    };

    return lhs;
  };


  private parseExpr(): SyntaxTree.BaseNodeAST {
    return this.parseAssignmentExpr();
  };

  private parseReturnStmnt(): SyntaxTree.BaseNodeAST {
    this.validator.validateReturn(this.look.info);
    const stmnt = new SyntaxTree.ReturnStatementNode(this.look.info);
    this.eat();

    stmnt.expr = this.parseExpr();

    return stmnt;
  };

  private parseBlockStmnt(): SyntaxTree.BaseNodeAST {
    this.validator.expect.leftCurly(this.look);
    const stmnt = new SyntaxTree.BlockStatementNode(this.look.info);
    this.eat();

    while (!this.helpers.isRightCurly(this.look)) {
      stmnt.body.push(this.parseStmntLow());
      this.validator.expect.semicolon(this.look);
      this.eat();
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();
    return stmnt;
  };

  private parseWhileStmnt(): SyntaxTree.BaseNodeAST {
    this.validator.state.inLoop = true;
    const stmnt = new SyntaxTree.WhileStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    stmnt.condition = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    stmnt.block = this.parseBlockStmnt();
    this.validator.state.inLoop = false;
    return stmnt;
  };

  private parseForStmnt(): SyntaxTree.BaseNodeAST {
    this.validator.state.inLoop = true;

    const stmnt = new SyntaxTree.ForStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    stmnt.init = this.parseStmntLow();

    this.validator.expect.semicolon(this.look);
    this.eat();

    stmnt.condition = this.parseExpr();

    this.validator.expect.semicolon(this.look);
    this.eat();

    stmnt.update = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();


    stmnt.block = this.parseBlockStmnt();
    this.validator.state.inLoop = false;

    return stmnt;
  };

  private parseCaseExpr(): SyntaxTree.BaseNodeAST {
    this.validator.state.inCase = true;
    const stmnt = new SyntaxTree.CaseExpressionNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    stmnt.discriminant = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    this.validator.expect.leftCurly(this.look);
    this.eat();

    let defaultsCounted: number = 0;

    while (!this.helpers.isRightCurly(this.look)) {
      const test = new SyntaxTree.CaseExpressionTestNode(this.look.info);

      this.validator.expect.test(this.look);

      if (this.look.id === TokenIdentifiers.DEFAULT) {
        ++defaultsCounted;
        test.isDefault = true;
        this.eat();

        test.block = this.parseBlockStmnt();

      } else {
        this.eat();
        test.condition = this.parseExpr();
        test.block = this.parseBlockStmnt();
      };

      if (defaultsCounted > 1) {
        throw new GolosinaExceptions.Frontend.SyntaxError(`Encountered more than one "default" in case expression!`, test.info, ReporterMetaData.FilePath);
      };

      stmnt.tests.push(test);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();

    this.validator.state.inCase = false;

    return stmnt;
  };

  private parseIfStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.IfStatementNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    stmnt.condition = this.parseExpr();

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    stmnt.block = this.parseBlockStmnt();

    if (this.helpers.isElse(this.look)) {
      this.eat();
      stmnt.alternate = (this.helpers.isIf(this.look)) ? this.parseIfStmnt() : this.parseBlockStmnt();
    };

    return stmnt;

  };

  private parseVarDecStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.VariableDeclarationStatementNode(this.look.info);

    if (this.look.id === TokenIdentifiers.CONST) {
      stmnt.isConst = true;
    };

    this.eat();

    stmnt.ident = this.validator.expect.ident(this.parsePrimary(), "variable/constant identifier");

    if (!this.helpers.isSemicolon(this.look)) {
      this.validator.expect.token(TokenIdentifiers.EQUAL_SYMB, "=", this.look);
      this.eat();
      stmnt.init = this.parseExpr();
    };

    this.validator.validateConstant(stmnt);

    return stmnt;
  };

  private parseExportStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.ExportStatementNode(this.look.info);
    this.eat();
    this.validator.expect.declaration(this.look);
    stmnt.declaration = this.parseVarDecStmnt()

    return stmnt;
  };

  private parseImportStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.ImportStatementNode(this.look.info);
    this.eat();

    this.validator.expect.token(TokenIdentifiers.STRING_LITERAL, "module string literal path", this.look);
    stmnt.path = this.look.lexeme;
    this.eat();

    return stmnt;
  };


  private parseStmntTop(): SyntaxTree.BaseNodeAST {
    if (this.index === 0 && ReporterMetaData.FilePath !== "<repl>") {
      this.validator.expect.module(this.look);
      const stmnt = new SyntaxTree.ModuleStatemenetNode(this.look.info);
      this.eat();
      stmnt.ident = this.validator.expect.ident(this.parsePrimary(), "module identifier");
      return stmnt;
    } else {
      return this.parseStmntMid();
    }
  };

  private parseStmntMid(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.EXPORT:
        return this.parseExportStmnt();
      case TokenIdentifiers.IMPORT:
        return this.parseImportStmnt();
      default:
        return this.parseStmntLow();
    };
  };

  private parseStmntLow(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.LET:
      case TokenIdentifiers.CONST:
        return this.parseVarDecStmnt();
      case TokenIdentifiers.IF:
        return this.parseIfStmnt();
      case TokenIdentifiers.FOR:
        return this.parseForStmnt();
      case TokenIdentifiers.WHILE:
        return this.parseWhileStmnt();
      case TokenIdentifiers.BREAK:
        return this.parseBreakStmnt();
      case TokenIdentifiers.CONTINUE:
        return this.parseContinueStmnt();
      case TokenIdentifiers.RETURN:
        return this.parseReturnStmnt();
      case TokenIdentifiers.LEFT_CURLY_SYMB:
        return this.parseBlockStmnt();
      default:
        return this.parseExpr();
    };
  };

  private parse(): SyntaxTree.BaseNodeAST {
    return this.parseStmntTop();
  };

  /*
    Syncronizing the parser after error state.
  */

  private synchronize() {
    while (true) {
      switch (this.look.id) {
        case TokenIdentifiers.LET:
        case TokenIdentifiers.CONST:
        case TokenIdentifiers.IF:
        case TokenIdentifiers.CASE:
        case TokenIdentifiers.CLONE:
        case TokenIdentifiers.METHOD:
        case TokenIdentifiers.FOR:
        case TokenIdentifiers.WHILE:
        case TokenIdentifiers.BREAK:
        case TokenIdentifiers.CONTINUE:
        case TokenIdentifiers.RETURN:
        case TokenIdentifiers.LEFT_CURLY_SYMB:
        case TokenIdentifiers.IMPORT:
        case TokenIdentifiers.EXPORT:
        case TokenIdentifiers.MODULE:
        case TokenIdentifiers.EOF_T:
          return;

        default:
          this.eat();
      };
    };
  };

  public execute(): SyntaxTree.Program {
    while (this.look.id !== TokenIdentifiers.EOF_T) {
      try {
        this.track.setOffset(this.look.info.offset.start, "START");
        this.program.push(this.parse());
        this.validator.expect.semicolon(this.look);
        this.eat();

      } catch (e) {
        // eat up then synchronize
        this.eat();
        this.synchronize();
        this.track.setOffset(this.look.info.offset.end, "END");
        if (e instanceof GolosinaExceptions.Frontend.SyntaxError) {
          // console.log(e.message)
          // // !console.error(e)
          // // e.offsets = this.track.getOffset;
          // // console.log(e.offsets)
        };

        // push errors to unwind later.
        ErrorReporter.PushParserError(e);
      };
    };

    ErrorReporter.UnwindParserErrors();

    return this.program;
  };
};

export default Parser;
