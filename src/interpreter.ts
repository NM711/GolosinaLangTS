import Lexer from "./frontend/lexer/lexer";
import Parser from "./frontend/parser/parser";
import Walker from "./runtime/core/walker";

class Interpreter {
  public static lexer: Lexer = new Lexer();
  public static parser: Parser = new Parser();
  public static walker: Walker = new Walker();
};

export default Interpreter;