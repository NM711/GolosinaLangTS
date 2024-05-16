import GolosinaExceptions from "./src/errors/exceptions";
import Interpreter from "./src/interpreter";
import Readline from "node:readline";

class Repl {
  private readline: Readline.Interface;

  constructor() {
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

      try {
        Interpreter.parser.setSource(input, false);
        Interpreter.walker.setSource = Interpreter.parser.execute();
        // Interpreter.walker.execute();
        this.recall();

      } catch (e) {
        console.log(e)
      }
    });
  };

  public execute(): void {
    console.log("Golosina v1.0.0")
    this.recall();
  };
};

const repl = new Repl();

repl.execute();
