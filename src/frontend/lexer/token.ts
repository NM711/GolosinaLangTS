import { TokenIdentifiers } from "../../types/token.types";

export class LinePosition {
  public line: number;
  public char: number;

  constructor(line: number = 1, char: number = 1) {
    this.line = line;
    this.char = char;
  };
};

export class TokenInformation {
  public start: LinePosition;
  public end: LinePosition;

  constructor() {
    this.start = new LinePosition();
    this.end = new LinePosition();
  };
};

export class Token {
  public id: TokenIdentifiers;
  public lexeme: string;
  public info: TokenInformation;

  constructor(id: TokenIdentifiers, lexeme: string, info: TokenInformation) {
    this.id = id;
    this.lexeme = lexeme;
    this.info = {
      start: new LinePosition(info.start.line, info.start.char),
      end: new LinePosition(info.end.line, info.end.char)
    };
  };
};