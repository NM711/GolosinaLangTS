import GolosinaExceptions from "./exceptions";
import { styleText } from "util";

class ErrorReporter {
  /*
    Error "stack", we need it so we can report multiple errors at once.
  */

  /*
    syntax error collector.
  */

  public static syntaxErrors: GolosinaExceptions.Frontend.SyntaxError[] = [];

  public static runtime(error: Error) {
    // we only expect a single error

    if (error && (error instanceof GolosinaExceptions.Runtime.RuntimeError || error instanceof GolosinaExceptions.Runtime.EnvironmentError)) {
      console.error(error.name, error.message);
      process.exit(1);
    };
  };

  public static syntax() {
    if (ErrorReporter.syntaxErrors.length > 0) {
      for (const error of ErrorReporter.syntaxErrors) {
        const formattedLineStart = styleText("gray", `${String(error.at.position.start.line)} | `);

        process.stdout.write(`${formattedLineStart}`);
        // temporary solution, later im gonna keep track of the character offset as well as the line + char number. For now we can just do this.

        for (let i = error.startOffset; i < error.endOffset; ++i) {
          const char = error.input[i];

          if (char === "\n") {
            break;
          };

          process.stdout.write(char);
        };
        
        process.stdout.write("\n");
        process.stdout.write(" ".repeat(String(error.at.position.start.line).length + 3));

        let isInRange = false;
        
        for (let i = error.startOffset; i < error.endOffset; ++i) {

          if (i === error.at.offset.start) {
            isInRange = true;
          };
          
          if (i === error.at.offset.end) {
            isInRange= false;  
          };

          
          if (!isInRange) {
            process.stdout.write(" ");
          } else {
            process.stdout.write(styleText("redBright","^".repeat(error.input[i].length)))
          };
        };


        process.stdout.write(" ".repeat(String(error.at.position.start.line).length + 3));

        process.stdout.write("\n\n");
        process.stdout.write(" ".repeat(String(error.at.position.start.line).length + 3));

        process.stdout.write(`${styleText("bgRed", `${error.name}:`)} ${styleText("bold", `${error.message}\n\n`)}`);

        const formattedFileName = styleText("bold", `"${error.file}"`);
        process.stdout.write(" ".repeat(String(error.at.position.start.line).length + 3));

        process.stdout.write(`In File: ${formattedFileName} at (line: ${error.at.position.start.line}, char: ${error.at.position.start.char})`);

        process.stdout.write("\n\n");
      };

      process.exit(1);
    };
  };
};

export default ErrorReporter;
