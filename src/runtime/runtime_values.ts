import { DataType } from "../common";
import type { SyntaxTree } from "../frontend/ast"

export enum RuntimeValueType {
  RVT_OBJ,
  RVT_METHOD,
  RVT_VAR
};

export namespace RuntimeEnvironmentValues {
  export class RuntimeValue {
    public id: RuntimeValueType;

    constructor(id: RuntimeValueType) {
      this.id = id;
    };
  };

  export class RuntimeVariable extends RuntimeValue {
    public isConst: boolean;
    public holding: RuntimeObject;

    constructor() {
      super(RuntimeValueType.RVT_VAR);
    };
  };

  export class RuntimeMethod extends RuntimeValue {
    public block: SyntaxTree.BlockNode;
    public params: SyntaxTree.IdentfierNode[];

    constructor(block: SyntaxTree.BlockNode, params: SyntaxTree.IdentfierNode[]) {
      super(RuntimeValueType.RVT_METHOD);
      this.block = block;
      this.params = params;
    };
  };
    
  export class RuntimeObject {
    public methods: Map<string, RuntimeValue>
    public prototype: RuntimeObject | null;

    constructor(prototype: RuntimeObject | null = null) { 
      this.methods = new Map();
      this.prototype = prototype;
    };
  };
};

export namespace RuntimeObjects {
  type Value = boolean | string | number | null;

  export class ValueObject extends RuntimeEnvironmentValues.RuntimeObject {
    public value: Value;
    public dataType: DataType;
   
    constructor(value: Value, type: DataType) {
      super();  
      this.value = value;
      this.dataType = type;
    };
  };

  export class BooleanObject extends ValueObject {
    constructor(value: boolean) {
      super(value, DataType.T_BOOLEAN);
    };
  };

  export class StringObject extends ValueObject {
    constructor(value: string) {
      super(value, DataType.T_STRING);
    };
  };

  export class NumericObject extends ValueObject {
    constructor(value: Value, type: DataType) {
      super(value, type);
    };
  };

  export class IntegerObject extends NumericObject {
    constructor(value: number) {
      super(value, DataType.T_INTEGER);
    };
  };

  export class FloatObject extends NumericObject {
    constructor(value: number) {
      super(value, DataType.T_FLOAT);
    };
  };
};
