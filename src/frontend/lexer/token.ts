import { TokenIdentifiers } from "../../types/token.types";

export class LinePosition {
  public line: number;
  public char: number;

  constructor(line: number = 1, char: number = 1) {
    this.line = line;
    this.char = char;
  };
};

export class LineOffset {
  public start: number;
  public end: number;

  constructor() {
    this.start = 0;
    this.end = 0;
  };
};

export class TokenPosition {
  start: LinePosition;
  end: LinePosition;

  constructor() {
    this.start = new LinePosition();
    this.end = new LinePosition();
  };
};

export class TokenInformation {
  public position: TokenPosition;
  public offset: LineOffset;

  constructor() {
    this.position = new TokenPosition();
    this.offset = new LineOffset();
  };
};

export class Token {
  public id: TokenIdentifiers;
  public lexeme: string;
  public info: TokenInformation;

  constructor(id: TokenIdentifiers, lexeme: string, info: TokenInformation) {
    this.id = id;
    this.lexeme = lexeme;
    this.info = new TokenInformation();
    this.info.position = {
      start: {
        char: info.position.start.char,
        line: info.position.start.line
      },
      end: {
        char: info.position.end.char,
        line: info.position.end.line
      } 
    };
    
    this.info.offset = {
      start: info.offset.start,
      end: info.offset.end
    };
  };
};
