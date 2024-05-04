import { RuntimeValueID, RuntimeObjects } from "../runtime/runtime_values";
import type { RuntimeValues } from "../runtime/runtime_values";

/**
  Useful typeguard helpers
*/

class RuntimeValueTypeGuard {
  public static isVariable(value: RuntimeValues.Value): value is RuntimeValues.Variable {
    return value.id === RuntimeValueID.RID_VAR;  
  };
  
  public static isObject(value: RuntimeValues.Value): value is RuntimeValues.Object {
    return value.id === RuntimeValueID.RID_OBJ;  
  };

  public static isObjectValue(value: RuntimeValues.Value): value is RuntimeObjects.ValueObject {
    return value instanceof RuntimeObjects.ValueObject;
  };
  
  public static isMethod(value: RuntimeValues.Value): value is RuntimeValues.Method {
    return value.id  === RuntimeValueID.RID_METHOD;
  };

  public static isNativeMethod(value: RuntimeValues.Value): value is RuntimeValues.MethodNative {
    return value.id === RuntimeValueID.RID_METHOD_NATIVE;
  };
};

export default RuntimeValueTypeGuard;
