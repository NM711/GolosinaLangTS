import GolosinaExceptions from "./exceptions";
import { styleText } from "util";
import { Token } from "../frontend/lexer/token";

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

  public static syntax(tokens: Token[]) {
    if (ErrorReporter.syntaxErrors.length > 0) {
      for (const error of ErrorReporter.syntaxErrors) {
        const formattedLineStart = styleText("gray", String(error.start?.line));

        // console.log(tokens.slice(error.startIndex, error.endIndex))
        
        process.stdout.write(`${formattedLineStart} ${styleText("gray", "|")} `);

        let atIndex: number = 0;

        for (let i = error.startIndex; i < error.endIndex; ++i) {
          const token = tokens[i];
          const isAtErrorLocation = (token.info.start.line === error.at.line) && (token.info.start.char === error.at.char);

          if (isAtErrorLocation) {
            atIndex = i;
          };

          // only write the line.

          if (token.info.start.line === error.at.line) {
            process.stdout.write(`${token.lexeme} `);
          };
        };

        process.stdout.write("\n");
        process.stdout.write(" ".repeat(String(error.start?.line).length));
        process.stdout.write(" ".repeat(3));

        for (let i = error.startIndex; i < error.endIndex; ++i) {
          const token = tokens[i];

          if (i === atIndex) {
            process.stdout.write(`${"^".repeat(token.lexeme.length)} `)
          } else {
            process.stdout.write(" ".repeat(token.lexeme.length));
          };
        };
        
        process.stdout.write("\n");

        process.stdout.write(" ".repeat(String(error.at.line).length));
        process.stdout.write(" ".repeat(3));
        
        process.stdout.write(styleText("bold", `${error.name}: ${error.message}`));

        process.stdout.write("\n\n");
      };

      process.exit(1);
    };
  };
};

export default ErrorReporter;
