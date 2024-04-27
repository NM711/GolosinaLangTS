import { GolosinaRuntimeError, GolosinaTypeError } from "../exceptions";
import { SyntaxTree } from "../frontend/ast";
import { LinePosition } from "../types/token.types";
import { RuntimeValueID, RuntimeValues } from "./runtime_values";


interface CheckerData {

  /*
    Identifier For Error
    @type string
    @type null
  */
  
  ident: string | null;
  info: LinePosition;
  value: RuntimeValues.Value;

  /**
    Custom Message
    @type string
    @type null
  */
      
  message: string | null;
};

/**
  Useful typeguard helpers
*/

class TypeGuarding {
  public isVariable(value: RuntimeValues.Value): value is RuntimeValues.Variable {
    return value.id === RuntimeValueID.RID_VAR;  
  };
  
  public isObject(value: RuntimeValues.Value): value is RuntimeValues.Object {
    return value.id === RuntimeValueID.RID_OBJ;  
  };
  
  public isMethod(value: RuntimeValues.Value): value is RuntimeValues.Method {
    return value.id  === RuntimeValueID.RID_METHOD;
  };
};


/**
  The runtime typecheker.
*/

class GolosinaTypeChecker {
  public guards: TypeGuarding;

  constructor() {
    this.guards = new TypeGuarding();
  };

  /**
    Checks if runtime value is a valid method.
  */

  public checkMethod(data: Omit<CheckerData, "message">): RuntimeValues.Method {
    if (!this.guards.isMethod(data.value)) {
      throw new GolosinaRuntimeError(`Attempted to perform call expression on a resolved non-method at "${data.ident}"!`, data.info);
    };

    return data.value;
  };

  /**
    Matches the length of the provided method arguments with the expected params
  */

  public checkArgLengthMatch(node: SyntaxTree.ExpressionCallNode, paramsLength: number) {
    if (node.arguments.length !== paramsLength) {
      throw new GolosinaTypeError(`Given argument length does not match with expected param length. Received ${node.arguments.length} expected ${paramsLength} at "${node.callee.name}"!`, node.info);
    };
  };

  /**
    Checks if runtime value is a valid object or reference to object
  */

  public checkObject(data: CheckerData): (RuntimeValues.Object | RuntimeValues.Variable) {
    if (!this.guards.isObject(data.value) && !this.guards.isVariable(data.value)) {
      let message: string = `${data.message || "Attempted to reference a non-object"}`;

      if (data.ident) {
        message += ` at "${data.ident}"`;
      };
      
      throw new GolosinaTypeError(message, data.info);
    };
    
    return data.value;
  };

  /**
    Checks if assignment is valid.
  */

  public checkAssignment() {
    
  };

  
};


export default GolosinaTypeChecker;
