import { GolosinaRuntimeError, GolosinaTypeError } from "../../exceptions";
import { LinePosition } from "../../types/token.types";
import { RuntimeObjects, RuntimeValues } from "../runtime_values";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";

interface CheckerDataBase {
  info: LinePosition;
  value: RuntimeValues.Value;
}

interface CheckerData extends CheckerDataBase {

  /*
    Identifier For Error
    @type string
    @type null
  */
  
  ident: string | null;

  /**
    Custom Message
    @type string
    @type null
  */
      
  message: string | null;
};

/**
  The runtime typecheker.
*/

class GolosinaTypeChecker {
  public checkBinaryArithmetic(op: string, left: CheckerDataBase, right: CheckerDataBase): { lhs: RuntimeObjects.ValueObject, rhs: RuntimeObjects.ValueObject }{
    if (!RuntimeValueTypeGuard.isObjectValue(left.value) || !RuntimeValueTypeGuard.isObjectValue(right.value)) {
      throw new GolosinaTypeError(`Unexpected values near operand "${op}" in arithmetic expression!`, left.info);
    };

    const stringSafeOperators = new Set(["+", "==", "!=", ">", "<", ">=", "<="])

    if (((left.value.isString() && right.value.isString())) && !stringSafeOperators.has(op)) {
      throw new GolosinaTypeError(`Attempted to perform string concatenation with invalid operand "${op}"`, left.info);
    };

    if ((left.value.isString() && !right.value.isString()) ||(!left.value.isString() && right.value.isString())) {
      throw new GolosinaTypeError(`Unsupported object types on near operand "${op}": "${left.value.typename}" and "${right.value.typename}"`, left.info);
    } else if (!left.value.isString() && !right.value.isString()) {
      if (left.value.isNumeric() !== right.value.isNumeric()) {
        throw new GolosinaTypeError(`Unsupported object types near operand "${op}": "${left.value.typename}" and "${right.value.typename}"`, left.info);
      };
    };

    return {
      lhs: left.value,
      rhs: right.value
    };
  };

  public checkUnaryExpr(data: Omit<CheckerData, "message">, operandName: string): RuntimeObjects.NumericObject  {
  
    if (!RuntimeValueTypeGuard.isObjectValue(data.value)) {
      throw new GolosinaTypeError(`Attempted to perform unary expression on non valid object type!`, data.info);
    };

    if (!data.value.isNumeric()){
      throw new GolosinaTypeError(`Unsupported object type near unary operand "${operandName}"`, data.info);  
    };

    return data.value;
  };

  /**
    Checks if runtime value is a valid method.
  */

  public checkMethod(data: Omit<CheckerData, "message">): RuntimeValues.Method | RuntimeValues.MethodNative {
    if (!RuntimeValueTypeGuard.isMethod(data.value) && !RuntimeValueTypeGuard.isNativeMethod(data.value)) {
      throw new GolosinaRuntimeError(`Attempted to perform call expression on a resolved non-method at "${data.ident}"!`, data.info);
    };

    return data.value;
  };

  /**
    Matches the length of the provided method arguments with the expected params
  */

  public checkArgLengthMatch(data: { info: LinePosition, ident: string, argsLength: number, paramsLength: number }) {
    if (data.argsLength !== data.paramsLength) {
      throw new GolosinaTypeError(`Given argument length does not match with expected param length. Received ${data.argsLength} expected ${data.paramsLength} at "${data.ident}"!`, data.info);
    };
  };

  /**
    Checks if runtime value is a valid object or reference to object
  */

  public checkObject(data: CheckerData): (RuntimeValues.Object | RuntimeValues.Variable) {
    if (!RuntimeValueTypeGuard.isObject(data.value) && !RuntimeValueTypeGuard.isVariable(data.value)) {
      let message: string = `${data.message || "Attempted to reference a non-object"}`;

      if (data.ident) {
        message += ` at "${data.ident}"`;
      };
      
      throw new GolosinaTypeError(message, data.info);
    };
    
    return data.value;
  };
};


export default GolosinaTypeChecker;
