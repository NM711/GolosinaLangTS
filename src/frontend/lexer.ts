import { GolosinaSyntaxError } from "../exceptions";
import { LinePosition, Token, TokenIdentifiers } from "./token.types";

class Lexer {
  private table: Map<string, TokenIdentifiers>;
  private tokens: Token[];
  private input: string[];
  private position: LinePosition;
  private isErrorState: boolean;
  private errorLexeme: string;
      
  constructor() {
    this.tokens = [];
    this.position = { char: 1, line: 1 };
    this.isErrorState = false;
    this.table = new Map();
    this.table.set("if", TokenIdentifiers.IF);
    this.table.set("else", TokenIdentifiers.ELSE);
    this.table.set("switch", TokenIdentifiers.SWITCH);
    this.table.set("case", TokenIdentifiers.CASE);
    this.table.set("for", TokenIdentifiers.FOR);
    this.table.set("while", TokenIdentifiers.WHILE);
    this.table.set("const", TokenIdentifiers.CONST);
    this.table.set("let", TokenIdentifiers.LET);
    this.table.set("method", TokenIdentifiers.METHOD);
    this.table.set("return", TokenIdentifiers.RETURN);
    this.table.set("break", TokenIdentifiers.BREAK);
    this.table.set("bool", TokenIdentifiers.BOOLEAN);
    this.table.set("null", TokenIdentifiers.NULL);
    this.table.set("int", TokenIdentifiers.INTEGER);
    this.table.set("float", TokenIdentifiers.FLOAT);
    this.table.set("string", TokenIdentifiers.STRING);
    this.table.set("void", TokenIdentifiers.VOID);
    this.table.set("clone", TokenIdentifiers.CLONE);
    this.table.set("true", TokenIdentifiers.BOOLEAN_LITERAL);
    this.table.set("false", TokenIdentifiers.BOOLEAN_LITERAL);
  };

  private peek(i: number = 0): string {
    return this.input[i];
  };

  private eat(): void {
    this.updatePosition();
    this.input.shift();
  };

  private get isDigit(): boolean {
    return /[0-9\.]/.test(this.peek());
  };

  private get isAlpha(): boolean {
    return /[a-zA-z]/.test(this.peek());
  };

  private get isSpecial(): boolean {
    return /[\+\-\*\/\%\&\|\.\!\#\[\]\(\)\{\}\:\;\,\<\>\=\"]/.test(this.peek());
  };

  private pushToken(lexeme: string, id: TokenIdentifiers) {
    this.tokens.push({
      id,
      lexeme,
      info: {
        line: this.position.line,
        char: this.position.char
      }
    });
  };

  private updatePosition(): void {
    ++this.position.char;
    
    if (this.peek() == "\n") {
      this.position.char = 0;
      ++this.position.line;  
    };
  };

  // very primitive lookin lol

  private handleDoubleCharSpecial(lexeme1: string, lexeme2: string, id1: TokenIdentifiers, id2: TokenIdentifiers) {
    if (this.peek(1) === lexeme2) {
      this.pushToken(lexeme1 + lexeme2, id2);
      this.eat();
      this.eat();
    } else {
      this.pushToken(lexeme1, id1);
      this.eat();
    };
  };

  private handleSpecial(): void {

    switch (this.peek()) {
      case "#":
        this.handleComment();
      break;

      case "\"":
        this.handleString();
      break;

      case "<":
        this.handleDoubleCharSpecial("<", "=", TokenIdentifiers.BINARY_LT, TokenIdentifiers.BINARY_LT_EQ);
      break;

      case ">":
        this.handleDoubleCharSpecial(">", "=", TokenIdentifiers.BINARY_GT, TokenIdentifiers.BINARY_GT_EQ);
      break;

      case "=":
        this.handleDoubleCharSpecial("=", "=", TokenIdentifiers.BINARY_ASSIGNMENT, TokenIdentifiers.BINARY_EQUALITY);
      break;

      case "!":
        this.handleDoubleCharSpecial("!", "=", TokenIdentifiers.UNARY_NOT, TokenIdentifiers.BINARY_NOT_EQUALITY);
      break;

      case "+":
        this.handleDoubleCharSpecial("+", "+", TokenIdentifiers.BINARY_ADDITION, TokenIdentifiers.UNARY_INCREMENT);
      break;
        
      case "-":
        if (this.peek(1) === "-") {
          this.pushToken("--", TokenIdentifiers.UNARY_DECREMENT);
          this.eat();
          this.eat();
        } else if (this.peek(1) === ">") {
          this.pushToken("->", TokenIdentifiers.ARROW);
          this.eat();
          this.eat();
        } else {
          this.pushToken("-", TokenIdentifiers.BINARY_SUBTRACTION);
          this.eat();
        };
      break;
        
      case "*":
        this.pushToken("*", TokenIdentifiers.BINARY_MULTIPLICATION);
        this.eat();
      break;
        
      case "/":
        this.pushToken("/", TokenIdentifiers.BINARY_DIVISION);
        this.eat();
      break;
        
      case "%":
        this.pushToken("%", TokenIdentifiers.BINARY_MODULUS);
        this.eat();
      break;

      case ",":
        this.pushToken(",", TokenIdentifiers.SEPERATOR);
        this.eat();
      break;

      case ";":
        this.pushToken(";", TokenIdentifiers.SEMICOLON);
        this.eat();
      break;

      case "(":
        this.pushToken("(", TokenIdentifiers.LEFT_PARENTHESIS);
        this.eat();
      break;
        
      case ")":
        this.pushToken(")", TokenIdentifiers.RIGHT_PARENTHESIS);
        this.eat();
      break;
        
      case "{":
        this.pushToken("{", TokenIdentifiers.LEFT_CURLY);
        this.eat();
      break;

      case "}":
        this.pushToken("}", TokenIdentifiers.RIGHT_CURLY);
        this.eat();
      break;
        
      case "&":
        this.handleDoubleCharSpecial("&", "&", TokenIdentifiers.AMPERSAND, TokenIdentifiers.BINARY_AND);
      break;

      case "|":
        this.handleDoubleCharSpecial("|", "|", TokenIdentifiers.PIPE, TokenIdentifiers.BINARY_OR);
      break;

      case ":":
        this.pushToken(":", TokenIdentifiers.COLON);
        this.eat();
      break;
      
      default:
        this.errorLexeme = this.peek();
        this.isErrorState = true;
    };
  
  };

  private handleString(): void {
    let str: string = "";
    
    this.eat();
    while (this.input.length > 0) {
      str += this.peek()
      this.eat();
      if (this.peek() == "\"") {
        this.eat();
        break;
      };
    };

    this.pushToken(str, TokenIdentifiers.STRING_LITERAL);
  };

  private handleComment(): void {
    // \n breaks out of the comment
    while (this.input.length > 0) {
      this.eat();

      if (this.peek() == "\n") {
        this.eat();
        break;
      };
    };
  };

  private handleKW(): void {
    let key: string = "";

    while ((this.isAlpha || this.isDigit) && this.input.length > 0) {
      key += this.peek();
      this.eat();
    };   

    if (this.table.has(key)) {
      const id = this.table.get(key) as TokenIdentifiers;
      this.pushToken(key, id);
    } else if (/^[a-zA-Z]+[a-zA-Z0-9]*$/.test(key)) {
      this.pushToken(key, TokenIdentifiers.IDENT);
    } else if (/^[0-9]+$/.test(key)) {
      this.pushToken(key, TokenIdentifiers.INTEGER_LITERAL);
    } else if (/^[0-9]+\.[0-9]+$/.test(key)) {
      this.pushToken(key, TokenIdentifiers.FLOAT_LITERAL);
    } else {
      this.errorLexeme = key;
      this.isErrorState = true;
    };
  };

  public set setSource(source: string) {
    this.input = source.split("");
  };

  public execute(): Token[] {

    while (this.input.length > 0) {

      if (this.peek() === " " || this.peek() === "\t" || this.peek() === "\n") {
        this.eat();
        continue;
      };
      
      if (this.isDigit || this.isAlpha) {
        this.handleKW();        
      } else if (this.isSpecial) {
        this.handleSpecial();        
      } else {
        this.errorLexeme = this.peek();
        this.isErrorState = true;
      };


      if (this.isErrorState) {
        throw new GolosinaSyntaxError(`Invalid lexeme found in input at "${this.errorLexeme}"`, this.position);
      };
      
    };

    const tempTokens = this.tokens;
    this.tokens = [];
    return tempTokens;
  };
};

export default Lexer;
