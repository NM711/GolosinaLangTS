import GolosinaExceptions from "./exceptions";
import fs from "node:fs"
import { TokenInformation } from "../../frontend/lexer/token";
import ReporterMetaData from "./reporter_meta_data";
import { styleText } from "node:util";

class ErrorReporter {
  /*
    syntax error collector.
  */

  private static SyntaxErrors: GolosinaExceptions.Frontend.SyntaxError[] = [];

  private static LinePadding(info: TokenInformation) {
    process.stdout.write(" ".repeat(info.position.start.line.toString().length + 1));
    process.stdout.write(styleText("gray", "| "));
  };

  private static UpdateReporter(path: string) {
    if (path !== ReporterMetaData.FilePath) {
      ReporterMetaData.FilePath = path;
      ReporterMetaData.Input = fs.readFileSync(path, "utf8");
    };
  };

  private static LogLineInfo(info: TokenInformation, path: string) {
    this.UpdateReporter(path);
    process.stdout.write(styleText("gray", `${info.position.start.line} | `));

    if (ReporterMetaData.Input[info.offset.start] === undefined || ReporterMetaData.Input[info.offset.end] === undefined) {
      process.stdout.write("EOF");
      process.stdout.write("\n");
      this.LinePadding(info);
      process.stdout.write(styleText("red", "^").repeat(3));
      process.stdout.write("\n\n");
      this.LinePadding(info);
    } else {
      for (let i = info.offset.start; i <= info.offset.end; ++i) {
        process.stdout.write(ReporterMetaData.Input[i]);
      };

      process.stdout.write("\n");

      this.LinePadding(info);

      for (let i = info.offset.start; i <= info.offset.end; ++i) {
        process.stdout.write(styleText("red", "^").repeat(1));
      };

      process.stdout.write("\n\n");

      this.LinePadding(info);
    };
  };

  private static LogMessage(error: GolosinaExceptions.Frontend.SyntaxError | GolosinaExceptions.Frontend.TokenizerError) {
    if (error instanceof GolosinaExceptions.Frontend.SyntaxError) {
      process.stdout.write(styleText("bold", `In file ${styleText("underline", `${error.path}:${error.at.position.start.line}:${error.at.position.start.char}`)}`));

    } else {
      process.stdout.write(styleText("bold", `In file ${styleText("underline", `${ReporterMetaData.FilePath}:${error.at.position.start.line}:${error.at.position.start.char}`)}`));
    };

    process.stdout.write("\n\n");
    this.LinePadding(error.at);
    process.stdout.write(styleText("bgRed", `${error.name}`));
    process.stdout.write(": ");
    process.stdout.write(styleText("bold", error.message));
    process.stdout.write("\n\n");
  };

  public static ReportRuntimeError(error: GolosinaExceptions.Backend.EnvironmentError | GolosinaExceptions.Backend.RuntimeError | GolosinaExceptions.Backend.TypeError) {
    process.stdout.write(styleText("bgRed", `${error.name}`));
    process.stdout.write(": ");
    process.stdout.write(styleText("bold", error.message));
    process.stdout.write("\n\n");
    process.exit(1);
  };

  public static ReportLexerError(error: GolosinaExceptions.Frontend.TokenizerError) {
    this.LogLineInfo(error.at, ReporterMetaData.FilePath);
    this.LogMessage(error);
    process.exit(1);
  };

  public static PushParserError(error: GolosinaExceptions.Frontend.SyntaxError) {
    this.SyntaxErrors.push(error);
  };

  public static UnwindParserErrors() {
    for (const error of this.SyntaxErrors) {
      this.LogLineInfo(error.at, error.path);
      this.LogMessage(error);
    };

    if (this.SyntaxErrors.length > 0) {
      process.exit(1);
    };
  };
};

export default ErrorReporter;
