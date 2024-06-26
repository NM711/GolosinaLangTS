import { RuntimeObjects, RuntimeValues } from "../runtime/core/runtime_values";

/**
  Useful typeguard helpers
*/

class RuntimeValueTypeGuard {
  public static isVariable(value: RuntimeValues.AbstractValue): value is RuntimeValues.Variable {
    return value.id === RuntimeValues.RuntimeValueID.RID_VAR;  
  };
  
  public static isObject(value: RuntimeValues.AbstractValue): value is RuntimeValues.Object {
    return value.id === RuntimeValues.RuntimeValueID.RID_OBJ;  
  };

  public static isObjectValue(value: RuntimeValues.AbstractValue): value is RuntimeObjects.ValueObject {
    return value instanceof RuntimeObjects.ValueObject;
  };
  
  public static isMethod(value: RuntimeValues.AbstractValue): value is RuntimeValues.Method {
    return value.id  === RuntimeValues.RuntimeValueID.RID_METHOD;
  };

  public static isNativeMethod(value: RuntimeValues.AbstractValue): value is RuntimeValues.MethodNative {
    return value.id === RuntimeValues.RuntimeValueID.RID_METHOD_NATIVE;
  };
};

export default RuntimeValueTypeGuard;
