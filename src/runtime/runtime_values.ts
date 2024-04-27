import { DataType } from "../common";
import type { SyntaxTree } from "../frontend/ast"

export enum RuntimeValueID {
  RID_OBJ,
  RID_METHOD,
  RID_VAR,
  RID_MODULE
};

export enum ObjectType {
  CLONE_OBJ,
  DEF_OBJ,
  VALUE_OBJ,
  NATIVE_OBJ
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
    public members: Map<string, SyntaxTree.BaseNodeAST>;
    
    constructor(proto: null | Object = null, members: SyntaxTree.DirectMemberNode[] = []) {
      super();
      this.id = RuntimeValueID.RID_OBJ;
      this.prototype = proto;
      this.members = new Map();
      // just have the parser do this later on.

      for (const member of members) {
        this.members.set(member.key.name, member.value);
      };
    };   
  };
      
};

export namespace RuntimeObjects {
  type TypeValue = boolean | string | number | null;

  export class ValueObject extends RuntimeValues.Object {
    public value: TypeValue;
    public dataType: DataType;
   
    constructor(value: TypeValue, type: DataType) {
      super();  
      this.value = value;
      this.dataType = type;
    };
  };

  export class NullObject extends ValueObject {
    constructor() {
      super(null, DataType.T_NULL);
    }
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
    constructor(value: number, type: DataType) {
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
