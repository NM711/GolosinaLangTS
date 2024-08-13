import ReporterMetaData from "../../errors/reporter_meta_data";
import GolosinaExceptions from "../../errors/exceptions";
import { InfoUpdateType, LexerState, TokenIdentifiers } from "../../types/token.types";
import { LinePosition, TokenInformation, Token } from "./token";
import ErrorReporter from "../../errors/reporter";

class Lexer {
  private table: Map<string, TokenIdentifiers>;
  private tokens: Token[];
  private index: number;
  private matching: string;
  private info: TokenInformation;
  private position: LinePosition;
  private state: LexerState;

  constructor() {
    this.reset();
    this.table = new Map();
    this.table.set("if", TokenIdentifiers.IF);
    this.table.set("else", TokenIdentifiers.ELSE);
    this.table.set("case", TokenIdentifiers.CASE);
    this.table.set("of", TokenIdentifiers.OF);
    this.table.set("default", TokenIdentifiers.DEFAULT);
    this.table.set("for", TokenIdentifiers.FOR);
    this.table.set("while", TokenIdentifiers.WHILE);
    this.table.set("const", TokenIdentifiers.CONST);
    this.table.set("let", TokenIdentifiers.LET);
    this.table.set("method", TokenIdentifiers.METHOD);
    this.table.set("return", TokenIdentifiers.RETURN);
    this.table.set("break", TokenIdentifiers.BREAK);
    this.table.set("continue", TokenIdentifiers.CONTINUE);
    this.table.set("null", TokenIdentifiers.NULL_LITERAL);
    this.table.set("clone", TokenIdentifiers.CLONE);
    this.table.set("module", TokenIdentifiers.MODULE);
    this.table.set("export", TokenIdentifiers.EXPORT);
    this.table.set("import", TokenIdentifiers.IMPORT);
    this.table.set("true", TokenIdentifiers.BOOLEAN_LITERAL);
    this.table.set("false", TokenIdentifiers.BOOLEAN_LITERAL);
  };

  private updatePosition() {
    ++this.position.char;
    if (this.look === "\n") {
      this.position.char = 1;
      ++this.position.line;
    };
  };

  private get look() {
    return ReporterMetaData.Input[this.index];
  };

  private eat() {
    this.updatePosition();
    ++this.index;
  };

  /**
    Appends look() to matching, and eats.
  */

  private consume() {
    this.matching += this.look;
    this.eat();
  };

  private updateTokenInfoData(type: InfoUpdateType) {
    if (type === InfoUpdateType.START) {
      this.info.position.start.char = this.position.char;
      this.info.position.start.line = this.position.line;
      this.info.offset.start = this.index;
    } else {
      this.info.position.end.char = this.position.char;
      this.info.position.end.line = this.position.line;
      this.info.offset.end = this.index;
    };
  };

  private pushToken(id: TokenIdentifiers) {
    this.updateTokenInfoData(InfoUpdateType.END);
    this.tokens.push(new Token(id, this.matching, this.info));
    this.matching = "";
    this.state = LexerState.S_INITIAL;
  };

  private checkInput() {
    if (ReporterMetaData.Input.length === 0) {
      console.error("No source provided!");
      process.exit(1);
    };
  };

  /**
    Updates top level state.
  */

  private updateState(): LexerState {
    let charState: LexerState = LexerState.S_INITIAL;

    switch (this.look) {
      case '\n':
      case ' ':
      case '\t':
      // nodejs handles out of bound not with "\0" NULL character but with "undefined"
      case undefined:
        this.eat();
        charState = LexerState.S_INITIAL;
        break;

      case '#':
        this.eat();
        charState = LexerState.S_COMMENT;
        break;

      case '"':
        this.eat();
        charState = LexerState.S_STRING;
        break;

      case '!':
        this.consume();
        charState = LexerState.S_EXCLAMATION;
        break;

      case '=':
        this.consume();
        charState = LexerState.S_EQUAL;
        break;

      case '+':
        this.consume();
        charState = LexerState.S_PLUS;
        break;

      case '-':
        this.consume();
        charState = LexerState.S_MINUS;
        break;

      case '*':
        this.consume();
        charState = LexerState.S_STAR;
        break;

      case '/':
        this.consume();
        charState = LexerState.S_SLASH;
        break;

      case '%':
        this.consume();
        charState = LexerState.S_PERCENT;
        break;

      case '<':
        this.consume();
        charState = LexerState.S_LEFT_ANGLE;
        break;

      case '>':
        this.consume();
        charState = LexerState.S_RIGHT_ANGLE;
        break;

      case '&':
        this.consume();
        charState = LexerState.S_AMPERSAND;
        break;

      case '|':
        this.consume();
        charState = LexerState.S_PIPE;
        break;

      case '$':
        this.consume();
        charState = LexerState.S_DOLLAR;
        break;

      case '{':
        this.consume();
        this.pushToken(TokenIdentifiers.LEFT_CURLY_SYMB);
        break;

      case '}':
        this.consume();
        this.pushToken(TokenIdentifiers.RIGHT_CURLY_SYMB);
        break;

      case '(':
        this.consume();
        this.pushToken(TokenIdentifiers.LEFT_PARENTHESIS_SYMB);
        break;

      case ')':
        this.consume();
        this.pushToken(TokenIdentifiers.RIGHT_PARENTHESIS_SYMB);
        break;

      case ';':
        this.consume();
        this.pushToken(TokenIdentifiers.SEMICOLON_SYMB);
        break;
      case ":":
        this.consume();
        this.pushToken(TokenIdentifiers.COLON_SYMB);
        break;
      case ',':
        this.consume();
        this.pushToken(TokenIdentifiers.COMMA_SYMB);
        break;

      default:
        if (/[a-zA-Z_]/.test(this.look) && this.look !== undefined) {
          this.consume();
          charState = LexerState.S_IDENTIFIER;
        } else if (/[0-9]/.test(this.look) && this.look !== undefined) {
          this.consume();
          charState = LexerState.S_INT;
        } else {
          this.reject();
        };
    };

    return charState;
  };

  private reject(custom: string | null = null) {
    this.updateTokenInfoData(InfoUpdateType.END);
    if (!custom) {
      throw new GolosinaExceptions.Frontend.TokenizerError("Unexpected character!", this.info);
    } else {
      throw new GolosinaExceptions.Frontend.TokenizerError(custom, this.info);
    };
  };

  public reset() {
    this.tokens = [];
    this.matching = "";
    this.index = 0;
    this.state = LexerState.S_INITIAL;
    this.position = new LinePosition();
    this.info = new TokenInformation();
  };


  public execute() {
    this.checkInput();
    try {
      while (true) {
        switch (this.state) {
          case LexerState.S_INITIAL: {
            switch (this.look) {
              case undefined:
                this.state = LexerState.S_TERMINATE;
                break;

              default:
                this.updateTokenInfoData(InfoUpdateType.START);
                this.updateTokenInfoData(InfoUpdateType.END);
                this.state = this.updateState();
            };
            break;
          };

          case LexerState.S_TERMINATE: {
            break;
          };

          case LexerState.S_COMMENT: {
            switch (this.look) {
              case "\n":
              case undefined:
                this.state = LexerState.S_INITIAL;
                break;

              default:
                this.eat();
            };
            break;
          };

          case LexerState.S_STRING: {
            switch (this.look) {
              case `"`:
                this.eat();
                this.pushToken(TokenIdentifiers.STRING_LITERAL);
                break;

              case "\0":
                this.reject(`Unexpected "EOF" before string termination!`);
                break;

              default:
                this.consume();
            };
            break;
          };

          case LexerState.S_IDENTIFIER: {
            if ((/[a-zA-Z_]/.test(this.look) || /[0-9]/.test(this.look)) && this.look !== undefined) {
              this.consume();
            } else if (this.table.has(this.matching)) {
              this.pushToken(this.table.get(this.matching) as TokenIdentifiers);
            } else {
              this.pushToken(TokenIdentifiers.IDENT);
            };
            break;
          };

          case LexerState.S_INT: {
            if (/[0-9]/.test(this.look)) {
              this.consume();
            } else if (/[\\.]/.test(this.look)) {
              this.consume();
              this.state = LexerState.S_INT_PERIOD;
            } else {
              this.pushToken(TokenIdentifiers.INTEGER_LITERAL);
            };
            break;
          };

          case LexerState.S_INT_PERIOD: {
            if (/[0-9]/.test(this.look)) {
              this.consume();
              this.state = LexerState.S_FLOAT;
            } else {
              this.reject();
            };
            break;
          };

          case LexerState.S_FLOAT: {
            if (/[0-9]/.test(this.look)) {
              this.consume();
            } else {
              this.pushToken(TokenIdentifiers.FLOAT_LITERAL);
            };
            break;
          };

          case LexerState.S_EQUAL: {
            switch (this.look) {
              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.BINARY_EQUALITY);
                break;

              default:
                this.pushToken(TokenIdentifiers.EQUAL_SYMB);
            };
            break;
          };

          case LexerState.S_PLUS: {
            switch (this.look) {
              case "+":
                this.consume();
                this.pushToken(TokenIdentifiers.UNARY_INCREMENT);
                break;

              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.PLUS_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.PLUS_SYMB);
            };
            break;
          };

          case LexerState.S_MINUS: {
            switch (this.look) {
              case "-":
                this.consume();
                this.pushToken(TokenIdentifiers.UNARY_DECREMENT);
                break;

              case ">":
                this.consume();
                this.pushToken(TokenIdentifiers.ARROW_SYMB);
                break;

              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.MINUS_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.MINUS_SYMB);
            };
            break;
          };

          case LexerState.S_STAR: {
            switch (this.look) {
              case "*":
                this.consume();
                this.pushToken(TokenIdentifiers.EXPONENTIAL_SYMB);
                break;

              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.STAR_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.STAR_SYMB);
            };
            break;
          };

          case LexerState.S_SLASH: {
            switch (this.look) {
              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.SLASH_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.SLASH_SYMB);
            };
            break;
          };

          case LexerState.S_PERCENT: {
            switch (this.look) {
              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.PERCENTAGE_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.PERCENTAGE_SYMB);
            };
            break;
          };

          case LexerState.S_LEFT_ANGLE: {
            switch (this.look) {
              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.LEFT_ANGLE_BRACKET_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.LEFT_ANGLE_BRACKET_SYMB);
            };
            break;
          };

          case LexerState.S_RIGHT_ANGLE: {
            switch (this.look) {
              case "=":
                this.consume();
                this.pushToken(TokenIdentifiers.RIGHT_ANGLE_BRACKET_EQ_SYMB);
                break;

              default:
                this.pushToken(TokenIdentifiers.RIGHT_ANGLE_BRACKER_SYMB);
            };
            break;
          };

          case LexerState.S_AMPERSAND: {
            switch (this.look) {
              case "&":
                this.consume();
                this.pushToken(TokenIdentifiers.BINARY_AND);
                break;

              default:
                this.pushToken(TokenIdentifiers.AMPERSAND_SYMB);
            };
            break;
          };

          case LexerState.S_PIPE: {
            switch (this.look) {
              case "|":
                this.consume();
                this.pushToken(TokenIdentifiers.BINARY_OR);
                break;

              default:
                this.pushToken(TokenIdentifiers.PIPE_SYMB);
            };
            break;
          };

          case LexerState.S_DOLLAR: {
            switch (this.look) {
              case ":":
                this.consume();
                this.pushToken(TokenIdentifiers.COLON_SYMB);
                ;
                this.state = LexerState.S_SHELL;
                break

              default:
                this.reject();
            };
            break;
          };

          case LexerState.S_SHELL: {
            switch (this.look) {
              case ";":
                this.consume();
                this.pushToken(TokenIdentifiers.SHELL_LITERAL);
              break;

              default:
                this.consume();
            };
            break;
          };

          case LexerState.S_EXCLAMATION: {
            switch (this.look) {
              case "=":
                this.pushToken(TokenIdentifiers.BINARY_INEQUALITY);
                break;

              default:
                this.pushToken(TokenIdentifiers.EXCLMATION_SYMB);
            };
          };
        };

        if (this.state === LexerState.S_TERMINATE) {
          break;
        };
      };
      this.matching = "EOF";
      this.pushToken(TokenIdentifiers.EOF_T);
    } catch (e) {
      ErrorReporter.ReportLexerError(e);
    };

    return this.tokens;
  };
};


export default Lexer;
