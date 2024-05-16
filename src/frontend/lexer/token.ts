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
  public position: {
    start: LinePosition;
    end: LinePosition;
  };

  public offset: {
    start: number;
    end: number;
  };

  constructor() {
    this.position = {
      start: new LinePosition(),
      end: new LinePosition()
    };

    this.offset = {
      start: 0,
      end: 0
    };
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
      start: new LinePosition(info.position.start.line, info.position.start.char),
      end: new LinePosition(info.position.end.line, info.position.end.char)
    };

    this.info.offset = {
      start: info.offset.start,
      end: info.offset.end
    };
  };
};
