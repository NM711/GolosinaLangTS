import { DataType } from "../common";
import { GolosinaRuntimeError } from "../exceptions";
import type { SyntaxTree } from "../frontend/ast"

export enum RuntimeValueID {
  RID_OBJ,
  RID_METHOD,
  RID_METHOD_NATIVE,
  RID_VAR,
  RID_MODULE
};

export enum ObjectType {
  CLONE_OBJ,
  DEF_OBJ,
  VALUE_OBJ,
  NATIVE_OBJ
};


export enum ParamState {
  ARRAY,
  FIXED
};


export namespace RuntimeValues {

  export abstract class Value {
    public abstract id: RuntimeValueID; 
  };

  export class Variable extends Value {
    public id: RuntimeValueID.RID_VAR;
    public isConst: boolean;
    public value: Object;

    constructor() {
      super();
      this.id = RuntimeValueID.RID_VAR;
    };
  };

  export class Method extends Value {
    public id: RuntimeValueID.RID_METHOD;
    public params: SyntaxTree.IdentfierNode[];
    public block: SyntaxTree.BlockNode;

    constructor(block: SyntaxTree.BlockNode, params: SyntaxTree.IdentfierNode[]) {
      super();
      this.id = RuntimeValueID.RID_METHOD;
      this.block = block;
      this.params = params;
    };   
  };

  export class MethodNative extends Value {
    public id: RuntimeValueID.RID_METHOD_NATIVE;
    public paramState: ParamState;
    public exec: (params: any[]) => any;

    constructor(exec: (...params: any[]) => any, state: ParamState = ParamState.FIXED) {
      super();
      this.id = RuntimeValueID.RID_METHOD_NATIVE;
      this.paramState = state;
      this.exec = exec;
    };
  };
  
  export class Module extends Value {
    public id: RuntimeValueID.RID_MODULE;
    public block: SyntaxTree.BlockNode;
  
    constructor() {
      super();
      this.id = RuntimeValueID.RID_MODULE;
    };   
  };

  export class Object extends Value {
    public id: RuntimeValueID.RID_OBJ;
    public prototype: Object | null;
    public members: Map<string, Value>;
    
    constructor(proto: null | Object = null) {
      super();
      this.id = RuntimeValueID.RID_OBJ;
      this.prototype = proto;
      this.members = new Map();
    };

    public getMember(key: string): Value {
      // Commenze prototype chain here

      let proto: Object | null = this;

      while (proto !== null) {
        if (proto.members.has(key)) {
         return proto.members.get(key) as Value;
        };

        proto = proto.prototype;
      };

      throw new GolosinaRuntimeError(`Could not get member "${key}" because it is undefined!`, null);
    };

    public setMember(key: string, value: Value): void {
      let proto: Object | null = this;

      while (proto !== null) {
        if (proto.members.has(key)) {
         proto.members.set(key, value);
         return;
        };

        proto = proto.prototype;
      };

      throw new GolosinaRuntimeError(`Could not set member "${key}" because it is undefined!`, null);
    };
  };
      
};

export namespace RuntimeObjects {
  export type TypeValue = boolean | string | number | null;

  export class ValueObject extends RuntimeValues.Object {
    public typename: string;
    private dataType: DataType;
    public value: TypeValue;
       
    constructor(type: DataType, name: string) {
      super();  
      this.dataType = type;
      this.typename = name;
    };

    public isString(): this is StringObject {
      return this.dataType === DataType.T_STRING;
    };

    public isBoolean(): this is BooleanObject  {
      return this.dataType === DataType.T_BOOLEAN;
    };

    public isNumeric(): this is NumericObject {
      return this.dataType === DataType.T_INTEGER || this.dataType === DataType.T_FLOAT;
    };

    public isFloat(): this is FloatObject  {
      return this.dataType === DataType.T_FLOAT;
    };

    public isInt(): this is IntegerObject {
      return this.dataType === DataType.T_INTEGER;
    };

    public isNull(): this is NullObject {
      return this.dataType === DataType.T_NULL;
    };
  };

  export class NullObject extends ValueObject {
    public value: null;
    constructor() {
      super(DataType.T_NULL, "null");
      this.value = null;
    }
  };

  export class BooleanObject extends ValueObject {
    public value: boolean;
    constructor(value: boolean) {
      super(DataType.T_BOOLEAN, "boolean");
      this.value = value;
    };
  };

  export class StringObject extends ValueObject {
    public value: string;
    constructor(value: string) {
      super(DataType.T_STRING, "string");
      this.value = value;
    };
  };

  export class NumericObject extends ValueObject {
    public value: number;
    constructor(value: number, type: DataType, name: string) {
      super(type, name);
      this.value = value;
    };
  };

  export class IntegerObject extends NumericObject {
    constructor(value: number) {
      super(value, DataType.T_INTEGER, "int");
    };
  };

  export class FloatObject extends NumericObject {
    constructor(value: number) {
      super(value, DataType.T_FLOAT, "float");
    };
  };
};
