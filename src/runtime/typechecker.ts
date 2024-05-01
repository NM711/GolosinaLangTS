import { GolosinaRuntimeError, GolosinaTypeError } from "../exceptions";
import { NodeIdentifiers, SyntaxTree } from "../frontend/ast";
import { LinePosition } from "../types/token.types";
import { RuntimeObjects, RuntimeValueID, RuntimeValues } from "./runtime_values";


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
  Useful typeguard helpers
*/

class TypeGuarding {
  public isVariable(value: RuntimeValues.Value): value is RuntimeValues.Variable {
    return value.id === RuntimeValueID.RID_VAR;  
  };
  
  public isObject(value: RuntimeValues.Value): value is RuntimeValues.Object {
    return value.id === RuntimeValueID.RID_OBJ;  
  };

  public isObjectValue(value: RuntimeValues.Value): value is RuntimeObjects.ValueObject {
    return value instanceof RuntimeObjects.ValueObject;
  };
  
  public isMethod(value: RuntimeValues.Value): value is RuntimeValues.Method {
    return value.id  === RuntimeValueID.RID_METHOD;
  };

  public isNativeMethod(value: RuntimeValues.Value): value is RuntimeValues.MethodNative {
    return value.id === RuntimeValueID.RID_METHOD_NATIVE;
  };

  public isMemberExpr(node: SyntaxTree.BaseNodeAST): node is SyntaxTree.MemberExpressionNode {
    return node.id === NodeIdentifiers.N_MEMBER_EXPR;
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

  public checkBinaryArithmetic(op: string, left: CheckerDataBase, right: CheckerDataBase): void {

    if (!this.guards.isObjectValue(left.value) || !this.guards.isObjectValue(right.value)) {
      throw new GolosinaTypeError(`Unexpected values near operand "${op}" in arithmetic expression!`, left.info);
    };

    if ((left.value.isString() && right.value.isString()) && op !== "+") {
      throw new GolosinaTypeError(`Attempted to perform string concatenation with invalid operand "${op}"`, left.info);
    };

    if ((left.value.isString() && !right.value.isString()) ||(!left.value.isString() && right.value.isString())) {
      throw new GolosinaTypeError(`Unsopported object types on near operand "${op}": "${left.value.typename}" and "${right.value.typename}"`, left.info);
    } else if (!left.value.isString() && !right.value.isString()) {
      if (left.value.isNumeric() !== right.value.isNumeric()) {
        throw new GolosinaTypeError(`Unsopported object types near operand "${op}": "${left.value.typename}" and "${right.value.typename}"`, left.info);
      };
    };
  };

  public checkUnaryExpr(data: Omit<CheckerData, "message">, operandName: string): RuntimeObjects.NumericObject  {
  
    if (!this.guards.isObjectValue(data.value)) {
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
    if (!this.guards.isMethod(data.value) && !this.guards.isNativeMethod(data.value)) {
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
