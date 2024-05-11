import Interpreter from "./src/interpreter";
import Debug from "./src/debug"
import process from "node:process";
import fs from "node:fs";

class GolosinaCommandLineInterface {
  private debug: Debug;
      
  constructor() {
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

        Interpreter.lexer.setSource = data;

        const tokens = Interpreter.lexer.execute();
        
        if (state.dumpTokens) {
          this.debug.logTokens(tokens);
        };

        Interpreter.parser.setSource = tokens;

        const tree = Interpreter.parser.generateAST();
        
        if (state.dumpAST) {
          this.debug.logAST(tree);
        };

        Interpreter.walker.setSource = tree;
        Interpreter.walker.execute();
      });
    }; 
  };
};

export default GolosinaCommandLineInterface;
