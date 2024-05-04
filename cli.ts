import process from "node:process";
import fs from "node:fs";
import Lexer from "./src/frontend/lexer"
import Parser from "./src/frontend/parser"
import Debug from "./src/debug"
import Walker  from "./src/runtime/interpreter/walker"

class GolosinaCommandLineInterface {
  private lexer: Lexer;
  private parser: Parser;
  private walker: Walker;
  private debug: Debug;
      
  constructor() {
    this.lexer = new Lexer();
    this.parser = new Parser();
    this.walker = new Walker();
    this.debug = new Debug();
  };

  private parseFlags(): string[] {
    const flags = process.argv;
    return flags.splice(2, 2);
  };

  public execute(): void {
    const flags = this.parseFlags();

    const state = {
      dumpTokens: false,
      dumpAST: false
    };
    
    const paths: string[] = [];
    
    for (const flag of flags) {
      if (flag === "--dump-ast") {
        state.dumpAST = true;     
      } else if (flag === "--dump-tokens") {
        state.dumpTokens = true;
      } else if (!flag.startsWith("--")) {
        // suppose its a path
        paths.push(flag);
      } else {
        throw new Error(`Unexpected arg or flag at "${flag}"`);
      };
    };

    for (const path of paths) {
      fs.readFile(path, "utf-8", (err, data) => {
        if (err) {
          throw new Error(`Invalid path to file "${path}"!`);
        };

        this.lexer.setSource = data;

        const tokens = this.lexer.execute();

        if (state.dumpTokens) {
          this.debug.logTokens(tokens);
        };

        this.parser.setSource = tokens;

        const tree = this.parser.generateAST();
      
        if (state.dumpAST) {
          this.debug.logAST(tree);
        };

        this.walker.setSource = tree;
        this.walker.execute();
      });
    }; 
  };
};

export default GolosinaCommandLineInterface;
