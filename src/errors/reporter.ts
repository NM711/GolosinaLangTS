import GolosinaExceptions from "./exceptions";
import fs from "node:fs"
import { TokenInformation } from "../frontend/lexer/token";
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
    for (let i = info.offset.start; i < info.offset.end; ++i) {
      process.stdout.write(ReporterMetaData.Input[i]);
    };

    process.stdout.write("\n");

    this.LinePadding(info);

    for (let i = info.offset.start; i < info.offset.end; ++i) {
      process.stdout.write(styleText("red", "^").repeat(1));
    };

    process.stdout.write("\n\n");

    this.LinePadding(info);
  };

  public static ReportRuntimeError() {

  };

  public static ReportLexerError(error: GolosinaExceptions.Frontend.TokenizerError) {
    this.LogLineInfo(error.at, ReporterMetaData.Input);
    process.exit(1);
  };

  public static PushParserError(error: GolosinaExceptions.Frontend.SyntaxError) {
    this.SyntaxErrors.push(error);
  };

  public static UnwindParserErrors() {
    for (const error of this.SyntaxErrors) {
      this.LogLineInfo(error.at, error.path);
      process.stdout.write(styleText("bold", `In file ${styleText("underline", `${error.path}:${error.at.position.start.line}:${error.at.position.start.char}`)}`));
      process.stdout.write("\n\n");
      this.LinePadding(error.at);
      process.stdout.write(styleText("bgRedBright", `${error.name}`));
      process.stdout.write(": ");
      process.stdout.write(styleText("bold", error.message));
      process.stdout.write("\n\n");
    };

    if (this.SyntaxErrors.length > 0) {
      process.exit(1);
    };
  };
};

export default ErrorReporter;
