import GolosinaExceptions from "../../errors/exceptions";
import { TokenInformation } from "../../frontend/lexer/token";
import { RuntimeObjects, RuntimeValues } from "./runtime_values";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";

/**
  The runtime typecheker.
*/

class GolosinaTypeChecker {
  public checkBinaryArithmetic(op: string, left: RuntimeValues.AbstractValue, right: RuntimeValues.AbstractValue): { lhs: RuntimeObjects.ValueObject, rhs: RuntimeObjects.ValueObject } {
    if (left instanceof RuntimeObjects.ValueObject === false || right instanceof RuntimeObjects.ValueObject === false) {
      throw new GolosinaExceptions.Backend.TypeError(`Unexpected values near operand "${op}" in arithmetic expression!`);
    };

    if (!RuntimeValueTypeGuard.isObjectValue(left) || !RuntimeValueTypeGuard.isObjectValue(right)) {
      throw new GolosinaExceptions.Backend.TypeError(`Unexpected values near operand "${op}" in arithmetic expression!`);
    };

    const stringSafeOperators = new Set(["+", "==", "!=", ">", "<", ">=", "<="])

    if (((left.isString() && right.isString())) && !stringSafeOperators.has(op)) {
      throw new GolosinaExceptions.Backend.TypeError(`Attempted to perform string concatenation with invalid operand "${op}"`);
    };

    if ((left.isString() && !right.isString()) || (!left.isString() && right.isString())) {
      throw new GolosinaExceptions.Backend.TypeError(`Unsupported object types on near operand "${op}": "${left.typename}" and "${right.typename}"`);
    } else if (!left.isString() && !right.isString()) {
      if (left.isNumeric() !== right.isNumeric()) {
        throw new GolosinaExceptions.Backend.TypeError(`Unsupported object types near operand "${op}": "${left.typename}" and "${right.typename}"`);
      };
    };

    return {
      lhs: left,
      rhs: right
    };
  };

  public checkUnaryExpr(arg: RuntimeValues.AbstractValue, op: string): RuntimeObjects.ValueObject {

    if (!RuntimeValueTypeGuard.isObjectValue(arg)) {
      throw new GolosinaExceptions.Backend.TypeError(`Attempted to perform unary expression on non valid object type!`);
    };

    if (!arg.isNumeric() && op !== "!") {
      throw new GolosinaExceptions.Backend.TypeError(`Unsupported object type near unary operand "${op}"`);
    };

    return arg;
  };

  /**
    Checks if runtime value is a valid method.
  */

  public checkMethod(data: Omit<CheckerData, "message">): RuntimeValues.Method | RuntimeValues.MethodNative {
    if (!RuntimeValueTypeGuard.isMethod(data.value) && !RuntimeValueTypeGuard.isNativeMethod(data.value)) {
      throw new GolosinaExceptions.Backend.TypeError(`Attempted to perform call expression on a resolved non-method at "${data.ident}"!`, data.info);
    };

    return data.value;
  };

  /**
    Matches the length of the provided method arguments with the expected params
  */

  public checkArgLengthMatch(data: { info: TokenInformation, ident: string, argsLength: number, paramsLength: number }) {
    if (data.argsLength !== data.paramsLength) {
      throw new GolosinaExceptions.Runtime.TypeError(`Given argument length does not match with expected param length. Received ${data.argsLength} expected ${data.paramsLength} at "${data.ident}"!`, data.info);
    };
  };

  /**
    Checks if runtime value is a valid object or reference to object
  */

  public checkObject(data: RuntimeValues.AbstractValue): RuntimeValues.Object {
    if (!RuntimeValueTypeGuard.isObject(data) && !RuntimeValueTypeGuard.isVariable(data)) {
      let message: string = "Attempted to reference a non-object";

      throw new GolosinaExceptions.Backend.TypeError(message);
    };

    if (RuntimeValueTypeGuard.isVariable(data)) {
      return data.value;
    } else {
      return data;
    };
  };
};


export default GolosinaTypeChecker;
