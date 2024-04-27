import { SyntaxTree, NodeIdentifiers } from "./ast";
import { Token, TokenIdentifiers } from "../types/token.types";
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

  private checkAssignment(node: SyntaxTree.BaseNodeAST) {
    const expectedIds = new Set([
      NodeIdentifiers.N_IDENT, NodeIdentifiers.N_LITERAL, NodeIdentifiers.N_METHOD,
      NodeIdentifiers.N_EXPR_CLONE, NodeIdentifiers.N_BINARY_EXPR
    ]);

    if (!expectedIds.has(node.id)) {
      throw new GolosinaSyntaxError(`Invalid right hand side assignment!`, node.info);
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

  private parseParams(params: SyntaxTree.IdentfierNode[]) {
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

    this.expected(TokenIdentifiers.LEFT_PARENTHESIS, "(");
    this.eat();

    if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
      this.parseParams(fn.params);
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

  private parseObjectMembers(members: SyntaxTree.DirectMemberNode[]) {
    while (true) {
      const directMember = new SyntaxTree.DirectMemberNode(this.look.info);
      
      this.expected(TokenIdentifiers.IDENT, "Object key identifier");
      directMember.key = this.parsePrimary() as SyntaxTree.IdentfierNode;
      this.eat();

      this.expected(TokenIdentifiers.BINARY_ASSIGNMENT, "=");
      this.eat();
      
      const rhsValue = this.parse();

      this.checkAssignment(rhsValue);
      
      directMember.value = rhsValue;

      members.push(directMember);
      
      if (this.index === this.tokens.length) {
        throw new GolosinaSyntaxError(`Expected object end "}" but instead reached "EOF"!`, this.look.info);
      };

      if (this.isTokenID(TokenIdentifiers.RIGHT_CURLY)) {
        break;
      };

      this.expected(TokenIdentifiers.SEPERATOR, ",");
      this.eat();
    };
  };

  private parseObjectExpr(): SyntaxTree.ObjectExpressionNode {
    this.expected(TokenIdentifiers.LEFT_CURLY, `Object opening "{"`);
    const object = new SyntaxTree.ObjectExpressionNode(this.look.info);
    this.eat();

    if (!this.isTokenID(TokenIdentifiers.RIGHT_CURLY)) {
      this.parseObjectMembers(object.members);
    };
    this.eat();

    return object;    
  };

  private parseCloneExpr(): SyntaxTree.CloneExpressionNode {
    const cloningExpr = new SyntaxTree.CloneExpressionNode(this.look.info);
    this.eat();

    this.expected(TokenIdentifiers.IDENT, "Cloned Object Identifier");
    cloningExpr.cloning = this.parsePrimary() as SyntaxTree.IdentfierNode;
    this.eat();

    cloningExpr.object = this.parseObjectExpr();
   
    return cloningExpr;
  };

  private parseArguments(args: (SyntaxTree.IdentfierNode | SyntaxTree.LiteralNode)[]) {
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
    
  private parseMemberExpr(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = new SyntaxTree.UnaryExpressionNode(this.look.info);
    
    if (!this.isTokenID(TokenIdentifiers.UNARY_DECREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_INCREMENT) && !this.isTokenID(TokenIdentifiers.UNARY_NOT)) {
      lhs = this.parsePrimary();
      this.eat();
    };

    while ((lhs.id === NodeIdentifiers.N_IDENT || lhs.id === NodeIdentifiers.N_MEMBER_EXPR) && this.isTokenID(TokenIdentifiers.ARROW)) {
      const memberExpr = new SyntaxTree.MemberExpressionNode(this.look.info);
      // eat operator "->"
      this.eat();
      memberExpr.parent = lhs as (SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode);
      this.expected(TokenIdentifiers.IDENT, "Member accessor identifier");
      memberExpr.accessing = this.parsePrimary() as SyntaxTree.IdentfierNode;
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
      call.callee = lhs as SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode;
      // parse arguments

      if (!this.isTokenID(TokenIdentifiers.RIGHT_PARENTHESIS)) {
        this.parseArguments(call.arguments);
      };

      this.expected(TokenIdentifiers.RIGHT_PARENTHESIS, ")");
      this.eat();

      lhs = call;
    };
    return lhs;
  };

  private parsePostfix(): SyntaxTree.BaseNodeAST {
    let lhs: SyntaxTree.BaseNodeAST = this.parseCallExpr();

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
      const assignment = new SyntaxTree.AssignmentExpressionNode(this.look.info);

      if (lhs.id !== NodeIdentifiers.N_IDENT && lhs.id !== NodeIdentifiers.N_MEMBER_EXPR) {
        throw new GolosinaSyntaxError(`Invalid assignment due to left hand side!`, this.look.info);
      };
      
      assignment.lhs = lhs as (SyntaxTree.IdentfierNode | SyntaxTree.MemberExpressionNode);
      assignment.op = this.look.lexeme;
      this.eat();

      const rhsValue = this.parse();
      this.checkAssignment(rhsValue)
      assignment.rhs = rhsValue;
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
        return this.parseCloneExpr();

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
