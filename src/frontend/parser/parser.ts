import GolosinaExceptions from "../../util/errors/exceptions";
import ErrorReporter from "../../util/errors/reporter";
import Lexer from "../lexer/lexer";
import { StatementOffsetTracker, SyntaxTree } from "./ast";
import { TokenIdentifiers } from "../../types/token.types";
import { Token } from "../lexer/token";
import { DataType } from "../../util/common";
import ReporterMetaData from "../../util/errors/reporter_meta_data";
import fs from "node:fs"


enum State {
  IN_LOOP,
  IN_CASE
};

type ActiveStates = Set<State>;

class Parser {
  private program: SyntaxTree.Program;
  private lexer: Lexer;
  private tokens: Token[];
  private index: number;
  private track: StatementOffsetTracker;
  private states: ActiveStates;

  constructor() {
    this.lexer = new Lexer();
    this.track = new StatementOffsetTracker();
    this.states = new Set([]);
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

  private expect(id: TokenIdentifiers, expected: string) {
    if (this.look.id !== id) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Expected "${expected}" instead received "${this.look.lexeme}"!`, this.look.info, ReporterMetaData.FilePath);
    };
  };

  /*
    Checks
  */

  private checkParenParseMidExpr(): SyntaxTree.BaseNodeAST {
    if (this.look.id !== TokenIdentifiers.LEFT_PARENTHESIS_SYMB) {
      return this.parseMidExpr();
    } else {
      this.expect(TokenIdentifiers.LEFT_PARENTHESIS_SYMB, "(");
      this.eat();

      const expr = this.parseMidExpr();

      this.expect(TokenIdentifiers.RIGHT_PARENTHESIS_SYMB, ")");
      this.eat();
      return expr;
    };
  };


  /*
    Expressions
  */

  private parseIdentifierExpr(): SyntaxTree.BaseNodeAST {
    const expr = new SyntaxTree.IdentfierNode(this.look.lexeme, this.look.info);
    this.eat();
    return expr;
  };

  private parsePrimaryExpr(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.INTEGER_LITERAL: {
        const literal = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_INTEGER, this.look.info);
        this.eat();
        return literal;
      };

      case TokenIdentifiers.FLOAT_LITERAL: {
        const literal = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_FLOAT, this.look.info);
        this.eat();
        return literal;
      };

      case TokenIdentifiers.STRING_LITERAL: {
        const literal = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_STRING, this.look.info);
        this.eat();
        return literal;
      };

      case TokenIdentifiers.BOOLEAN_LITERAL: {
        const literal = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_BOOLEAN, this.look.info);
        this.eat();
        return literal;
      };

      case TokenIdentifiers.NULL_LITERAL: {
        const literal = new SyntaxTree.LiteralNode(this.look.lexeme, DataType.T_NULL, this.look.info);
        this.eat();
        return literal;
      };

      case TokenIdentifiers.IDENT:
        return this.parseIdentifierExpr();

      default:
        throw new GolosinaExceptions.Frontend.SyntaxError(`Unexpected primary expression!`, this.look.info, ReporterMetaData.FilePath);
    };
  };

  private parseMemberExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseIdentifierExpr();

    while (this.look.id === TokenIdentifiers.ARROW_SYMB) {
      const expr = new SyntaxTree.MemberExpressionNode(this.look.info);
      this.eat();
      expr.parent = lhs;
      expr.accessing = this.parseIdentifierExpr() as SyntaxTree.IdentfierNode;
      lhs = expr;
    };

    return lhs;
  };

  private handleCallExprArgs(expr: SyntaxTree.ExpressionCallNode) {
    while (this.look.id !== TokenIdentifiers.EOF_T) {
      const arg = this.parseMidExpr();

      expr.arguments.push(arg);

      if (this.look.id === TokenIdentifiers.RIGHT_PARENTHESIS_SYMB) {
        break;
      };

      this.expect(TokenIdentifiers.COMMA_SYMB, ",");
      this.eat();
    };
  };

  private parseCallExpr(lhs: SyntaxTree.BaseNodeAST): SyntaxTree.BaseNodeAST {
    const expr = new SyntaxTree.ExpressionCallNode(this.look.info);
    expr.callee = lhs as SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode;
    this.expect(TokenIdentifiers.LEFT_PARENTHESIS_SYMB, "(");
    this.eat();

    if (this.look.id !== TokenIdentifiers.RIGHT_PARENTHESIS_SYMB) {
      this.handleCallExprArgs(expr);
    };

    this.expect(TokenIdentifiers.RIGHT_PARENTHESIS_SYMB, ")");
    this.eat();

    return expr;
  };

  private parsePostfixExpr(): SyntaxTree.BaseNodeAST {
    if (this.look.id === TokenIdentifiers.IDENT) {
      const expr = new SyntaxTree.UnaryExpressionNode(false, this.look.info);
      expr.argument = this.parseMemberExpr();
      expr.op = this.look.lexeme;

      if (this.look.id === TokenIdentifiers.DOUBLE_PLUS_SYMB || this.look.id === TokenIdentifiers.DOUBLE_MINUS_SYMB) {
        this.eat();
        return expr;
      } else if (this.look.id === TokenIdentifiers.LEFT_PARENTHESIS_SYMB) {
        return this.parseCallExpr(expr.argument);
      };

      // Return the parsed argument if there is no valid operator to make this implement the actual postfix rule.
      return expr.argument;
    };

    return this.parsePrefixExpr();
  };

  private parsePrefixExpr(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.DOUBLE_PLUS_SYMB:
      case TokenIdentifiers.DOUBLE_MINUS_SYMB: {
        const expr = new SyntaxTree.UnaryExpressionNode(true, this.look.info);
        expr.op = this.look.lexeme;
        this.eat();
        expr.argument = this.parseIdentifierExpr();
        return expr;
      };

      case TokenIdentifiers.EXCLAMATION_SYMB:
      case TokenIdentifiers.PLUS_SYMB:
      case TokenIdentifiers.MINUS_SYMB: {
        const expr = new SyntaxTree.UnaryExpressionNode(true, this.look.info);
        expr.op = this.look.lexeme;
        this.eat();
        expr.argument = this.parsePrimaryExpr();
        return expr;
      };

      default:
        return this.parsePrimaryExpr();
    };
  };

  private parseMultiplicativeExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parsePostfixExpr();

    while (this.look.id === TokenIdentifiers.STAR_SYMB || this.look.id === TokenIdentifiers.SLASH_SYMB || this.look.id === TokenIdentifiers.PERCENTAGE_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.MULTIPLICATIVE, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parsePostfixExpr();

      lhs = expr;
    };

    return lhs;
  };

  private parseAdditiveExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseMultiplicativeExpr();

    while (this.look.id === TokenIdentifiers.PLUS_SYMB || this.look.id === TokenIdentifiers.MINUS_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.ADDITIVE, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parseMultiplicativeExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseBitwiseShiftExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseAdditiveExpr();

    while (this.look.id === TokenIdentifiers.DOLLAR_LEFT_ANGLE_BRACKET_SYMB || this.look.id === TokenIdentifiers.DOUBLE_RIGHT_ANGLE_BRACKET_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.BITWISE_SHIFT, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parseAdditiveExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseRelationalExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseBitwiseShiftExpr();

    while (this.look.id === TokenIdentifiers.LEFT_ANGLE_BRACKET_SYMB
      || this.look.id === TokenIdentifiers.LEFT_ANGLE_BRACKET_EQ_SYMB
      || this.look.id === TokenIdentifiers.RIGHT_ANGLE_BRACKET_SYMB
      || this.look.id === TokenIdentifiers.RIGHT_ANGLE_BRACKET_EQ_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.RELATIONAL, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();

      expr.lhs = lhs;
      expr.rhs = this.parseBitwiseShiftExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseEqualityExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseRelationalExpr();

    while (this.look.id === TokenIdentifiers.DOUBLE_EQ_SYMB || this.look.id === TokenIdentifiers.EXCLAMATION_EQ_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.EQUALITY, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseRelationalExpr();
      lhs = expr;
    };

    return lhs;
  }

  private parseBitwiseANDExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseEqualityExpr();

    while (this.look.id === TokenIdentifiers.AMPERSAND_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.BITWISE_AND, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseEqualityExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseBitwiseORExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseBitwiseANDExpr();

    while (this.look.id === TokenIdentifiers.PIPE_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.BITWISE_OR, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseBitwiseANDExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseLogicalANDExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseBitwiseORExpr();

    while (this.look.id === TokenIdentifiers.DOUBLE_AMPERSAND_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.LOGICAL_AND, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseBitwiseORExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseLogicalORExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseLogicalANDExpr();

    while (this.look.id === TokenIdentifiers.DOUBLE_PIPE_SYMB) {
      const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.LOGICAL_OR, lhs.info);
      expr.op = this.look.lexeme;
      this.eat();
      expr.lhs = lhs;
      expr.rhs = this.parseLogicalANDExpr();
      lhs = expr;
    };

    return lhs;
  };

  private parseAssignmentExpr(): SyntaxTree.BaseNodeAST {
    let lhs = this.parseLogicalORExpr();

    if (lhs.kind == "Identifier") {
      return lhs;
    };


    const expr = new SyntaxTree.BinaryExpressionNode(SyntaxTree.BinaryExpressionType.ASSIGNMENT, this.look.info);
    expr.lhs = lhs;

    /*
      If no matching operator to implement the assignment rule exists, simply return the lhs and have a top level method later,
      Handle the unexpected syntax that comes after it.
    */

    switch (this.look.id) {
      case TokenIdentifiers.EQ_SYMB:
      case TokenIdentifiers.PLUS_EQ_SYMB:
      case TokenIdentifiers.MINUS_EQ_SYMB:
      case TokenIdentifiers.STAR_EQ_SYMB:
      case TokenIdentifiers.SLASH_EQ_SYMB:
      case TokenIdentifiers.PERCENTAGE_EQ_SYMB: {
        expr.op = this.look.lexeme;
        this.eat();
        expr.rhs = this.parseMidExpr();
        return expr;
      };

      default:
        return lhs;
    };
  };

  private parseCloneExprDirectMembers(expr: SyntaxTree.CloneExpressionNode) {
    while (this.look.id !== TokenIdentifiers.EOF_T) {
      const member = new SyntaxTree.DirectMemberExpressionNode(this.look.info);
      member.key = this.parseIdentifierExpr() as SyntaxTree.IdentfierNode;
      this.expect(TokenIdentifiers.EQ_SYMB, "=");
      this.eat();
      member.value = this.parseTopExpr();
      expr.members.push(member);

      if (this.look.id === TokenIdentifiers.RIGHT_CURLY_SYMB) {
        break;
      };

      this.expect(TokenIdentifiers.COMMA_SYMB, ",");
      this.eat();
    };
  };

  private parseCloneExpr(): SyntaxTree.BaseNodeAST {
    const expr = new SyntaxTree.CloneExpressionNode(this.look.info);
    this.eat();

    expr.cloning = this.parseMemberExpr() as SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode;

    this.expect(TokenIdentifiers.LEFT_CURLY_SYMB, "{");
    this.eat();

    if (this.look.id !== TokenIdentifiers.RIGHT_CURLY_SYMB) {
      this.parseCloneExprDirectMembers(expr);
    };

    this.expect(TokenIdentifiers.RIGHT_CURLY_SYMB, "}");
    this.eat();

    return expr;
  };

  private parseMethodExprParams(expr: SyntaxTree.MethodExpressionNode) {
    while (this.look.id !== TokenIdentifiers.EOF_T) {
      expr.params.push(this.parseIdentifierExpr() as SyntaxTree.IdentfierNode);

      if (this.look.id === TokenIdentifiers.RIGHT_PARENTHESIS_SYMB) {
        break;
      };

      this.expect(TokenIdentifiers.COMMA_SYMB, ",");
      this.eat();
    };
  };

  private parseMethodExpr(): SyntaxTree.BaseNodeAST {
    const expr = new SyntaxTree.MethodExpressionNode(this.look.info);
    this.eat();

    this.expect(TokenIdentifiers.LEFT_PARENTHESIS_SYMB, "(");
    this.eat();


    if (this.look.id !== TokenIdentifiers.RIGHT_PARENTHESIS_SYMB) {
      this.parseMethodExprParams(expr);
    };

    this.expect(TokenIdentifiers.RIGHT_PARENTHESIS_SYMB, ")");
    this.eat();

    expr.block = this.parseBlockStmnt();

    return expr;
  };

  private parseCaseExprTest(expr: SyntaxTree.CaseExpressionNode) {

    let defaultCounter: number = 0;

    while (this.look.id !== TokenIdentifiers.EOF_T) {
      const test = new SyntaxTree.CaseExpressionTestNode(this.look.info);
      
      if (this.look.id !== TokenIdentifiers.OF && this.look.id !== TokenIdentifiers.DEFAULT) {
        throw new GolosinaExceptions.Frontend.SyntaxError("Unexpected case option!", this.look.info, ReporterMetaData.FilePath);
      };

      if (this.look.id === TokenIdentifiers.DEFAULT) {
        this.eat();
        ++defaultCounter;
        test.isDefault = true;
      } else {
        this.eat();
        test.condition = this.parseMidExpr();
      };

      this.expect(TokenIdentifiers.ARROW_SYMB, "->");
      this.eat();

      test.consequent = this.parseStmnt();

      expr.tests.push(test);
    
      if (this.look.id === TokenIdentifiers.RIGHT_CURLY_SYMB) {
        break;
      };
    };

    if (defaultCounter > 1) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`More than a single default test encountered in case expression!`, this.look.info, ReporterMetaData.FilePath);
    };
  };

  private parseCaseExpr(): SyntaxTree.BaseNodeAST {
    this.states.add(State.IN_CASE);
    const expr = new SyntaxTree.CaseExpressionNode(this.look.info);
    this.eat();

    expr.discriminant = this.checkParenParseMidExpr();
    this.expect(TokenIdentifiers.LEFT_CURLY_SYMB, "{");
    this.eat();

    if (this.look.id !== TokenIdentifiers.RIGHT_CURLY_SYMB) {
      this.parseCaseExprTest(expr);
    };

    this.expect(TokenIdentifiers.RIGHT_CURLY_SYMB, "}");
    this.eat();

    this.states.delete(State.IN_CASE);
    return expr;
  };

  private parseMidExpr(): SyntaxTree.BaseNodeAST {
    return this.parseAssignmentExpr();
  };

  private parseTopExpr(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.CLONE:
        return this.parseCloneExpr();
      case TokenIdentifiers.CASE:
        return this.parseCaseExpr();
      case TokenIdentifiers.METHOD:
        return this.parseMethodExpr();
      default:
        return this.parseMidExpr();
    };
  };

  /*
    Statements  
  */

  private parseContinueStmnt(): SyntaxTree.ContinueStatementNode {
    if (!this.states.has(State.IN_LOOP)) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to use continue statement outside of a loop!`, this.look.info, ReporterMetaData.FilePath);
    };

    const continueStmnt = new SyntaxTree.ContinueStatementNode(this.look.info);
    this.eat();

    return continueStmnt;
  };

  private parseBreakStmnt(): SyntaxTree.BreakStatementNode {

    if (this.states.size === 0) {
      throw new GolosinaExceptions.Frontend.SyntaxError(`Attempted to use break statement outside of a switch or loop!`, this.look.info, ReporterMetaData.FilePath);
    };

    const breakStmnt = new SyntaxTree.BreakStatementNode(this.look.info);
    this.eat();

    return breakStmnt;
  };

  private parseReturnStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.ReturnStatementNode(this.look.info);
    this.eat();
    stmnt.expr = this.parseTopExpr();
    return stmnt;
  };

  private parseStmnt(): SyntaxTree.BaseNodeAST {
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
      case TokenIdentifiers.RETURN:
        return this.parseReturnStmnt();
      case TokenIdentifiers.CONTINUE:
        return this.parseContinueStmnt();
      case TokenIdentifiers.BREAK:
        return this.parseBreakStmnt();
      case TokenIdentifiers.LEFT_CURLY_SYMB:
        return this.parseBlockStmnt();
      default:
        return this.parseTopExpr();
    };
  };


  private parseBlockStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.BlockStatementNode(this.look.info);

    this.expect(TokenIdentifiers.LEFT_CURLY_SYMB, "{");
    this.eat();

    while (this.look.id !== TokenIdentifiers.EOF_T) {
      stmnt.body.push(this.parseStmnt());
      this.expect(TokenIdentifiers.SEMICOLON_SYMB, ";");
      this.eat();

      if (this.look.id === TokenIdentifiers.RIGHT_CURLY_SYMB) {
        break;
      };
    };

    this.expect(TokenIdentifiers.RIGHT_CURLY_SYMB, "}");
    this.eat();

    return stmnt;
  };

  private parseWhileStmnt(): SyntaxTree.BaseNodeAST {
    this.states.add(State.IN_LOOP);
    const stmnt = new SyntaxTree.WhileStatementNode(this.look.info);
    this.eat();

    stmnt.condition = this.checkParenParseMidExpr();

    stmnt.block = this.parseBlockStmnt();
    this.states.delete(State.IN_LOOP);
    return stmnt;
  };

  private parseForStmnt(): SyntaxTree.BaseNodeAST {
    this.states.add(State.IN_LOOP);
    const stmnt = new SyntaxTree.ForStatementNode(this.look.info);
    this.eat();

    let hasParenthesis = false;

    if (this.look.id === TokenIdentifiers.LEFT_PARENTHESIS_SYMB) {
      this.eat();
      hasParenthesis = true;
    };

    if (this.look.id !== TokenIdentifiers.SEMICOLON_SYMB) {
      if (this.look.id === TokenIdentifiers.LET || this.look.id === TokenIdentifiers.CONST) {
        stmnt.init = this.parseVarDecStmnt();
      } else {
        stmnt.init = this.parseMidExpr();
      };
    };

    this.expect(TokenIdentifiers.SEMICOLON_SYMB, ";");
    this.eat();

    if (this.look.id !== TokenIdentifiers.SEMICOLON_SYMB) {
      stmnt.condition = this.parseMidExpr();
    };

    this.expect(TokenIdentifiers.SEMICOLON_SYMB, ";");
    this.eat();

    if (hasParenthesis && this.look.id !== TokenIdentifiers.RIGHT_PARENTHESIS_SYMB) {
      stmnt.update = this.parseMidExpr();
      this.expect(TokenIdentifiers.RIGHT_PARENTHESIS_SYMB, ")");
      this.eat();
    } else if (!hasParenthesis && this.look.id !== TokenIdentifiers.LEFT_CURLY_SYMB) {
      stmnt.update = this.parseMidExpr();
    };


    stmnt.block = this.parseBlockStmnt();
    this.states.delete(State.IN_LOOP);
    return stmnt;
  };

  private parseIfStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.IfStatementNode(this.look.info);
    this.eat();

    stmnt.condition = this.checkParenParseMidExpr();
    stmnt.block = this.parseBlockStmnt();

    if (this.look.id === TokenIdentifiers.ELSE) {
      this.eat();

      if (this.look.id === TokenIdentifiers.IF) {
        stmnt.alternate = this.parseIfStmnt();
      } else {
        stmnt.alternate = this.parseBlockStmnt();
      };
    };

    return stmnt;
  };

  private parseVarDecStmnt(): SyntaxTree.BaseNodeAST {
    const stmnt = new SyntaxTree.VariableDeclarationStatementNode(this.look.info);

    if (this.look.id === TokenIdentifiers.CONST) {
      stmnt.isConst = true;
    };

    this.eat();

    stmnt.ident = this.parseIdentifierExpr() as SyntaxTree.IdentfierNode;

    if (this.look.id == TokenIdentifiers.EQ_SYMB) {
      this.eat();
      stmnt.init = this.parseTopExpr();
    };

    return stmnt;
  };

  private parse(): SyntaxTree.BaseNodeAST {
    return this.parseStmnt();
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
        this.expect(TokenIdentifiers.SEMICOLON_SYMB, ";");
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
