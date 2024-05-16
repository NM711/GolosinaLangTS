import Interpreter from "./src/interpreter";
import Debug from "./src/debug"
import process from "node:process";

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

      Interpreter.parser.setSource(path, true);
      
      if (state.dumpTokens) {
        this.debug.logTokens(Interpreter.parser.getTokens);  
      };

      const tree = Interpreter.parser.execute();

      if (state.dumpAST) {
        this.debug.logAST(tree);
      };

      Interpreter.walker.setSource = tree;
      // Interpreter.walker.execute();
    }; 
  };
};

export default GolosinaCommandLineInterface;
