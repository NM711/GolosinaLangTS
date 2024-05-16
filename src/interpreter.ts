import Parser from "./frontend/parser/parser";
import Walker from "./runtime/core/walker";

class Interpreter {
  public static parser: Parser = new Parser();
  public static walker: Walker = new Walker();
};

export default Interpreter;
