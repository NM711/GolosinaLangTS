import { SyntaxTree, NodeIdentifiers } from "./ast";
import { Token, TokenIdentifiers } from "../types/token.types";
import { GolosinaSyntaxError } from "../exceptions"
import { DataType } from "../common";
import TreeNodeTypeGuard from "../guards/node_gurads";
import SemanticValidator from "./semantic_validator";

class Parser {
  private validator: SemanticValidator;
  private tokens: Token[];
  private index: number;
  
  constructor() {
    this.validator = new SemanticValidator();
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

  private isTokenID(id: TokenIdentifiers): boolean {
    return id === this.look.id;
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

  private parseReturn(): SyntaxTree.ReturnNode {
    this.eat();
    const returned = new SyntaxTree.ReturnNode(this.look.info, this.parse());

    if (!TreeNodeTypeGuard.isLiteral(returned.value) && !TreeNodeTypeGuard.isIdent(returned.value) && !TreeNodeTypeGuard.isCloneStmnt(returned.value)) {
      throw new GolosinaSyntaxError(`Unexpected value in return statement at "${this.look.lexeme}"!`, this.look.info);
    };

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

      if (this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };
  };

  private parseIfStmnt(): SyntaxTree.IfStmntNode {
    const ifStmnt = new SyntaxTree.IfStmntNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);
    this.eat();

    ifStmnt.expression = this.validator.validateIfExpression(this.parse());
    this.validator.expect.rightParenthesis(this.look);
    this.eat();
    
    ifStmnt.block = this.parseBlock();

    if (this.isTokenID(TokenIdentifiers.ELSE)) {
      this.eat();
      ifStmnt.alternate = (this.isTokenID(TokenIdentifiers.IF)) ? this.parseIfStmnt() : this.parseBlock();
    };

    return ifStmnt;
  };

  private parseMethod(): SyntaxTree.BaseNodeAST {
    const fn = new SyntaxTree.MethodNode(this.look.info);
    this.eat();

    this.validator.expect.leftParenthesis(this.look);

    if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
      this.parseParams(fn.params);
    };

    this.validator.expect.rightParenthesis(this.look);
    this.eat();

    fn.block = this.parseBlock();
    
    return fn;
  };
  
  private parseVar(): SyntaxTree.BaseNodeAST {
    const variable = new SyntaxTree.VariableNode(this.look.info);

    if (this.isTokenID(TokenIdentifiers.CONST)) {
      variable.isConst = true;
    };
  
    this.eat();

    variable.ident = this.validator.expect.ident(this.parsePrimary(), "Variable Identifier");
    this.eat();

    if (this.isTokenID(TokenIdentifiers.BINARY_ASSIGNMENT)) {
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

      direct.value = this.validator.validateAssignmentRHS(this.parse());      

      members.push(direct);
      
      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected object end "}" but instead reached "EOF"!`, this.look.info);
      };

      if (this.isTokenID(TokenIdentifiers.RIGHT_CURLY)) {
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

    if (!this.isTokenID(TokenIdentifiers.RIGHT_CURLY)) {
      this.parseObjectMembers(object.members);
    };

    this.validator.expect.rightCurly(this.look);
    this.eat();

    return object;    
  };

  private parseCloneStmnt(): SyntaxTree.CloneStatementNode {
    const cloningExpr = new SyntaxTree.CloneStatementNode(this.look.info);
    this.eat();

    cloningExpr.cloning = this.validator.expect.ident(this.parsePrimary(), "Clone Object Identifier");
    this.eat();

    cloningExpr.object = this.parseObjectExpr();
   
    return cloningExpr;
  };

  private parseArguments(args: (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode | SyntaxTree.MemberExpressionNode)[]) {
    while (true) {
      

      const arg = this.validator.validateArguments(this.parse());
      
      args.push(arg);

      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info);
      };

      if (this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        break;
      };

      this.validator.expect.seperator(this.look);
      this.eat();
    };

    return args;
  };
    
  private parseMemberExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = new SyntaxTree.UnaryExpressionNode(this.look.info);
    
    if (!this.isTokenID(TokenIdentifiers.UNARY_DECREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_NOT)) {
      lhs = this.parsePrimary();
      this.eat();
    };

    while ((TreeNodeTypeGuard.isIdent(lhs) || TreeNodeTypeGuard.isMemberExpr(lhs)) && this.isTokenID(TokenIdentifiers.ARROW)) {
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
    
    if (this.isTokenID(TokenIdentifiers.LEFT_PARENTHESIS)) {
      const call = new SyntaxTree.ExpressionCallNode(this.look.info);
      this.eat();

      call.callee = this.validator.validateCallLHS(lhs);
      
      // parse arguments

      if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        this.parseArguments(call.arguments);
      };

      this.validator.expect.leftParenthesis(this.look);
      this.eat();

      lhs = call;
    };
    return lhs;
  };

  private parsePostfix(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseCallExpr();

    if (lhs.id === NodeIdentifiers.N_IDENT && (this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) || this.isTokenID(TokenIdentifiers.UNARY_DECREMENT))) {
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
    
    if (this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) || this.isTokenID(TokenIdentifiers.UNARY_DECREMENT) || this.isTokenID(TokenIdentifiers.UNARY_NOT)) {
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

    while (this.isTokenID(TokenIdentifiers.BINARY_MULTIPLICATION) || this.isTokenID(TokenIdentifiers.BINARY_DIVISION) || this.isTokenID(TokenIdentifiers.BINARY_MODULUS)) {
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

    while (this.isTokenID(TokenIdentifiers.BINARY_ADDITION) || this.isTokenID(TokenIdentifiers.BINARY_SUBTRACTION)) {
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

    while (this.look.id === TokenIdentifiers.BINARY_LT || this.look.id === TokenIdentifiers.BINARY_LT_EQ || this.look.id === TokenIdentifiers.BINARY_GT || this.look.id === TokenIdentifiers.BINARY_GT_EQ) {
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

    while (this.look.id === TokenIdentifiers.BINARY_EQUALITY || this.look.id === TokenIdentifiers.BINARY_NOT_EQUALITY) {
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

    while (this.look.id === TokenIdentifiers.BINARY_AND) {
      const binary = new SyntaxTree.BinaryExpressionNode("LogicalBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parseEquality();
      lhs = binary;
    };

    while (this.look.id === TokenIdentifiers.BINARY_OR) {
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

    if (this.look.id === TokenIdentifiers.BINARY_ASSIGNMENT) {
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

      case TokenIdentifiers.METHOD:
        return this.parseMethod();

      case TokenIdentifiers.IF:
        return this.parseIfStmnt();
           
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
        console.error(e.name, e.message);
        process.exit(1);
      }
    };
    
    this.reset();
    return program;
  };
};

export default Parser;
