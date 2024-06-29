import { DataType } from "../../common";
import GolosinaExceptions from "../../errors/exceptions";
import type { SyntaxTree } from "../../frontend/parser/ast"

export namespace RuntimeValues {
  export enum RuntimeValueID {
    RID_OBJ,
    RID_METHOD,
    RID_METHOD_NATIVE,
    RID_VAR,
    RID_MODULE
  };

  export enum ParamState {
    ARRAY,
    FIXED
  };

  export abstract class AbstractValue {
    public abstract id: RuntimeValueID;
  };

  export class Variable extends AbstractValue {
    public id: RuntimeValueID.RID_VAR;
    public isConst: boolean;
    public value: Object;

    constructor() {
      super();
      this.id = RuntimeValueID.RID_VAR;
    };
  };

  export class Method extends AbstractValue {
    public id: RuntimeValueID.RID_METHOD;
    public params: SyntaxTree.IdentfierNode[];
    public block: SyntaxTree.BlockStatementNode;

    constructor(block: SyntaxTree.BlockStatementNode, params: SyntaxTree.IdentfierNode[]) {
      super();
      this.id = RuntimeValueID.RID_METHOD;
      this.block = block;
      this.params = params;
    };
  };

  export class MethodNative extends AbstractValue {
    public id: RuntimeValueID.RID_METHOD_NATIVE;
    public paramState: ParamState;
    public exec: (...params: any[]) => any;

    constructor(exec: (...params: any[]) => any, state: ParamState = ParamState.FIXED) {
      super();
      this.id = RuntimeValueID.RID_METHOD_NATIVE;
      this.paramState = state;
      this.exec = exec;
    };
  };

  export class Module extends AbstractValue {
    public id: RuntimeValueID.RID_MODULE;
    private members: Map<string, AbstractValue>;

    constructor() {
      super();
      this.id = RuntimeValueID.RID_MODULE;
      this.members = new Map();
    };

    public getMember(key: string): AbstractValue {
      if (this.members.has(key)) {
        return this.members.get(key) as AbstractValue;
      };

      throw new GolosinaExceptions.Backend.RuntimeError(`Could not get member "${key}" because it is undefined!`);
    };

    public get getMembers(): Iterable<[string, AbstractValue]> {
      return this.members.entries();
    };

    public setMember(key: string, value: AbstractValue): void {
      this.setMember(key, value);
    };
  };

  export class Object extends AbstractValue {
    public id: RuntimeValueID.RID_OBJ;
    public prototype: Object | null;
    private members: Map<string, AbstractValue>;

    constructor(proto: null | Object = null) {
      super();
      this.id = RuntimeValueID.RID_OBJ;
      this.prototype = proto;
      this.members = new Map();
    };

    public getMember(key: string): AbstractValue {
      // Commenze prototype chain here

      let proto: Object | null = this;

      while (proto !== null) {
        if (proto.members.has(key)) {
          return proto.members.get(key) as AbstractValue;
        };

        proto = proto.prototype;
      };

      throw new GolosinaExceptions.Backend.RuntimeError(`Could not get member "${key}" because it is undefined!`);
    };

    public get getMembers(): Iterable<[string, AbstractValue]> {
      return this.members.entries();
    };

    public setMember(key: string, value: AbstractValue): void {
      this.members.set(key, value);
    };
  };

};

export namespace RuntimeObjects {
  export enum ObjectType {
    CLONE_OBJ,
    DEF_OBJ,
    VALUE_OBJ,
    NATIVE_OBJ
  };

  export type TypeValue = boolean | string | number | any[] | null;

  export class ValueObject extends RuntimeValues.Object {
    public typename: string;
    private dataType: DataType;
    public primitive: TypeValue;

    constructor(type: DataType, name: string) {
      super();
      this.dataType = type;
      this.typename = name;
    };

    public isString(): this is StringObject {
      return this.dataType === DataType.T_STRING;
    };

    public isBoolean(): this is BooleanObject {
      return this.dataType === DataType.T_BOOLEAN;
    };

    public isNumeric(): this is NumericObject {
      return this.dataType === DataType.T_INTEGER || this.dataType === DataType.T_FLOAT;
    };

    public isFloat(): this is FloatObject {
      return (this.dataType === DataType.T_FLOAT);
    };

    public isInt(): this is IntegerObject {
      return this.dataType === DataType.T_INTEGER;
    };

    public isNull(): this is NullObject {
      return this.dataType === DataType.T_NULL;
    };
  };

  /*
    Non primitive value, can construct different datastructures with this.
  */

  export class VectorObject extends ValueObject {
    public primitive: any[];

    constructor() {
      super(DataType.T_OBJECT, "Vector");
      this.primitive = [];
      this.init();
    };

    private init() {
      this.setMember("length", new RuntimeValues.MethodNative(() => {
        return this.primitive.length;
      }));

      this.setMember("push", new RuntimeValues.MethodNative((element: any) => {
        this.primitive.push(element);
      }
      ));

      this.setMember("pop", new RuntimeValues.MethodNative(() => {
        return this.primitive.pop();
      }
      ));
      
      this.setMember("at", new RuntimeValues.MethodNative((index: RuntimeObjects.IntegerObject) => {
        return this.primitive.at(index.primitive);
      }
      ));

      this.setMember("random", new RuntimeValues.MethodNative(() => {
        return this.primitive[Math.floor(Math.random() * this.primitive.length)];
      }));
    };

    public setElements(elements: any[]) {
      this.primitive = elements;
    };

  };

  export class NullObject extends ValueObject {
    public primitive: null;

    constructor() {
      super(DataType.T_NULL, "null");
      this.primitive = null;
    }
  };

  export class BooleanObject extends ValueObject {
    public primitive: boolean;

    constructor(value: boolean) {
      super(DataType.T_BOOLEAN, "boolean");
      this.primitive = value;
    };
  };

  export class StringObject extends ValueObject {
    public primitive: string;

    constructor(value: string) {
      super(DataType.T_STRING, "string");
      this.primitive = value;
      this.addUtils();
    };

    private addUtils() {
      this.setMember("includes", new RuntimeValues.MethodNative((inc: RuntimeObjects.StringObject) => {
        return this.primitive.includes(inc.primitive);
      }));

      this.setMember("length", new RuntimeValues.MethodNative(() => {
        return this.primitive.length;
      }));

      this.setMember("split", new RuntimeValues.MethodNative((at: RuntimeObjects.StringObject) => {
        return this.primitive.split(at.primitive);
      }));
    };
  };

  export class NumericObject extends ValueObject {
    public primitive: number;
    constructor(value: number, type: DataType, name: string) {
      super(type, name);
      this.primitive = value;
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
