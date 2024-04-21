import Lexer from "./src/frontend/lexer";
import Parser from "./src/frontend/parser";
import Readline from "node:readline";

class Repl {
  private readline: Readline.Interface;
  private lexer: Lexer;
  private parser: Parser;
  
  constructor() {
    this.lexer = new Lexer();
    this.parser = new Parser();
    
    this.readline = Readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  };

  private recall(): void {
    this.readline.question(">>> ", (answer) => {
      let input = answer;

      if (input === "exit") {
        this.readline.close();
        return
      };
      
      this.lexer.setSource = input;

      const tokens = this.lexer.execute();
      this.parser.setSource = tokens;
      
      const program = this.parser.generateAST();
      console.log(program)      
      this.recall();
    }); 
  };
  
  public execute(): void {
    console.log("GarbageLang v2.0.0")
    this.recall();    
  };
};

const repl = new Repl();

repl.execute();
