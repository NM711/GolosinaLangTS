import { SyntaxTree, NodeIdentifiers } from "./ast";
import { Token, TokenIdentifiers } from "./token.types";
import { GolosinaSyntaxError } from "../exceptions"
import { DataType } from "../common";

class Parser {
  private tokens: Token[];
  private index: number;

  constructor() {
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

  private expected(id: TokenIdentifiers, lexeme: string) {
    if (this.look.id !== id) {
      throw new GolosinaSyntaxError(`Expected token "${lexeme}" instead received "${this.look.lexeme}"!`, this.look.info);
    };
  };

  private isTokenID(id: TokenIdentifiers): boolean {
    return id === this.look.id;
  };

  private parsePrimary(): SyntaxTree.BaseNodeAST {
    switch (this.look.id) {
      case TokenIdentifiers.BOOLEAN_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, new SyntaxTree.DataTypeNode(DataType.T_BOOLEAN, "boolean", this.look.info), this.look.info);
      case TokenIdentifiers.INTEGER_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme,new SyntaxTree.DataTypeNode(DataType.T_INTEGER, "int", this.look.info), this.look.info);
      case TokenIdentifiers.FLOAT_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, new SyntaxTree.DataTypeNode(DataType.T_FLOAT, "float", this.look.info), this.look.info);
      case TokenIdentifiers.NULL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, new SyntaxTree.DataTypeNode(DataType.T_NULL, "null", this.look.info), this.look.info);
      case TokenIdentifiers.STRING_LITERAL:
        return new SyntaxTree.LiteralNode(this.look.lexeme, new SyntaxTree.DataTypeNode(DataType.T_STRING, "string", this.look.info), this.look.info);
      case TokenIdentifiers.IDENT:
        return new SyntaxTree.IdentfierNode(this.look.lexeme, this.look.info)
      default:
        // temporary error
        throw new GolosinaSyntaxError(`Unexpected primary expression at "${this.look.lexeme}"!`, this.look.info);
    };
  };

  private parseReturn(): SyntaxTree.ReturnNode {
    this.eat();
    const returned = new SyntaxTree.ReturnNode(this.look.info, this.parsePrimary() as (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode));

    if (returned.value.id !== NodeIdentifiers.N_LITERAL && returned.value.id !== NodeIdentifiers.N_IDENT) {
      throw new GolosinaSyntaxError(`In a return you can only return idenfitiers or literals instead, returned "${this.look.lexeme}"`, this.look.info);
    };
    
    this.eat();

    return returned;
  };

  private parseBlock(): SyntaxTree.BlockNode {
    const block = new SyntaxTree.BlockNode(this.look.info);

    this.expected(TokenIdentifiers.LEFT_CURLY, "{");
    this.eat();

    while (this.look.id !== TokenIdentifiers.RIGHT_CURLY) {
      block.body.push(this.parse());
      this.expected(TokenIdentifiers.SEMICOLON, ";");
      this.eat();
    };

    this.expected(TokenIdentifiers.RIGHT_CURLY, "}");
    this.eat();

    return block;
  };

  private parseParams(): SyntaxTree.ParamNode[] {
    const params: SyntaxTree.IdentfierNode[] = [];
    
    while (true) {

      this.expected(TokenIdentifiers.IDENT, "Param Ident");
      const ident = this.parsePrimary() as SyntaxTree.IdentfierNode;
      this.eat();

      params.push(ident);

      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info);
      };

      if (this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        break;
      };

      this.expected(TokenIdentifiers.SEPERATOR, ",");
      this.eat();
    };

    return params;
  };

  private parseIfStmnt(): SyntaxTree.IfStmntNode {
    const ifStmnt = new SyntaxTree.IfStmntNode(this.look.info);
    this.eat();

    this.expected(TokenIdentifiers.LEFT_PARENTHESIS, "(");
    this.eat();

    ifStmnt.expression = this.parse();

    this.expected(TokenIdentifiers.RIGHT_PARENTHESIS, ")");
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

    this.expected(TokenIdentifiers.IDENT, "Function Identifier");
    fn.ident = this.parsePrimary() as SyntaxTree.IdentfierNode;
    this.eat();
    
    this.expected(TokenIdentifiers.LEFT_PARENTHESIS, "(");
    this.eat();

    if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
      fn.params = this.parseParams();
    };

    this.expected(TokenIdentifiers.RIGHT_PARENTHESIS, ")");
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
    this.expected(TokenIdentifiers.IDENT, "Variable Identifier");
    variable.ident = this.parsePrimary() as SyntaxTree.IdentfierNode;  
    this.eat();

    if (this.isTokenID(TokenIdentifiers.BINARY_ASSIGNMENT)) {
      this.eat();

      variable.init = this.parse();
    };

    if (variable.init === null && variable.isConst === true) {
      throw new GolosinaSyntaxError(`Uninitialized constant at "${variable.ident.name}"`, variable.info);
    };

    return variable;
  };

  private parseClone(): SyntaxTree.CloneExpressionNode {
    const cloningExpr = new SyntaxTree.CloneExpressionNode(this.look.info);
    this.eat();

    this.expected(TokenIdentifiers.IDENT, "Cloned Object Identifier");
    cloningExpr.cloning = this.parsePrimary() as SyntaxTree.IdentfierNode;
    this.eat();

    return cloningExpr;
  };

  private parseArguments(): (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode)[] {
    const args: (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode)[] = [];
 
    while (true) {
      const arg = this.parsePrimary();
      this.eat();
      if (arg.id !== NodeIdentifiers.N_IDENT && arg.id !== NodeIdentifiers.N_LITERAL) {
        throw new GolosinaSyntaxError(`Invalid argument has been set at "${this.look.lexeme}"!`, this.look.info);
      };

      args.push(arg as (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode));
      
      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected ")" but instead reached "EOF"!`, this.look.info);
      };

      if (this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        break;
      };

      this.expected(TokenIdentifiers.SEPERATOR, ",");
      this.eat();
    };

    return args;
  };
    
  private parseCallExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = new SyntaxTree.UnaryExpressionNode(this.look.info);
    
    if (!this.isTokenID(TokenIdentifiers.UNARY_DECREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_NOT)) {
      lhs = this.parsePrimary();
      this.eat();
    };
    
    if (lhs.id === NodeIdentifiers.N_IDENT && this.isTokenID(TokenIdentifiers.LEFT_PARENTHESIS)) {
      const call = new SyntaxTree.ExpressionCallNode(this.look.info);
      this.eat();
      call.callee = lhs;
      // parse arguments

      if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        call.arguments = this.parseArguments();
      };

      this.expected(TokenIdentifiers.RIGHT_PARENTHESIS, ")");
      this.eat();

      lhs = call;
    };

    return lhs;
  };

  private parseMemberExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseCallExpr();

    while (this.isTokenID(TokenIdentifiers.ARROW)) {
      const memberExpr = new SyntaxTree.MemberExpressionNode(this.look.info);
      // eat operator "->"
      this.eat();
      memberExpr.parent = lhs;
      console.log(lhs)
      memberExpr.accessing = this.parsePrimary()
      this.eat();

      lhs = memberExpr;
    };

    return lhs;
  };

  private parsePostfix(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseMemberExpr();

    if (lhs.id === NodeIdentifiers.N_IDENT && this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) || this.isTokenID(TokenIdentifiers.UNARY_DECREMENT)) {
      const unary = new SyntaxTree.UnaryExpressionNode(this.look.info);
      unary.lhs = lhs as SyntaxTree.IdentfierNode;
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

      this.expected(TokenIdentifiers.IDENT, "Identifier");
      unary.lhs = this.parsePrimary() as SyntaxTree.IdentfierNode;
      this.eat();

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
      binary.rhs = this.parsePrimary();
      this.eat();
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
      const binary = new SyntaxTree.BinaryExpressionNode("AssignmentBinaryExpression", this.look.info);
      binary.lhs = lhs;
      binary.op = this.look.lexeme;
      this.eat();
      binary.rhs = this.parse();
      lhs = binary;
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
        return this.parseClone();

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
        this.expected(TokenIdentifiers.SEMICOLON, ";");
        this.eat();
      } catch (e) {
        console.error(e.message);
        process.exit(1);
      }
    };
    
    this.reset();
    return program;
  };
};

export default Parser;
