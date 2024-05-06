import fs from "node:fs"
import { ParamState, RuntimeValues } from "../runtime_values";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";

class NativeFMT {

  private fmt: RuntimeValues.Object;

  constructor() {
    this.fmt = new RuntimeValues.Object(null);
  };

  private format(toLog: RuntimeValues.Object | null) {
    if (toLog) {
      const members = [];

      for (const [key, value] of toLog.members) {
        members.push({
          [key]: value.constructor.name
        });
      };
      
      return {
        prototype: this.format(toLog.prototype),
        members
      };
    };

    return null;
  };

  private addLog(): void {
    this.fmt.members.set("log", new RuntimeValues.MethodNative((log: RuntimeValues.Object[]) => {

      for (const toLog of log) {
        if (RuntimeValueTypeGuard.isObjectValue(toLog)) {
          process.stdout.write(`${toLog.value}\s`);
        } else if (RuntimeValueTypeGuard.isObject(toLog)) {
          process.stdout.write(JSON.stringify(this.format(toLog), null, 2));
        };
      };

      process.stdout.write("\n");

      const date = new Date();
      console.log(`Date: ${date.getFullYear()}-${date.getMonth()}-${date.getDay()},`, `Time: ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`);
    },
      ParamState.ARRAY
    ));
  };

  private addPrint(): void {
    this.fmt.members.set("print", new RuntimeValues.MethodNative((log: RuntimeValues.Object[]) => {
      for (const toLog of log) {
        if (RuntimeValueTypeGuard.isObjectValue(toLog)) {
          process.stdout.write(`${toLog.value}\s`);
        } else if (RuntimeValueTypeGuard.isObject(toLog)) {

          process.stdout.write(JSON.stringify(this.format(toLog), null, 2));
        };
      };

      process.stdout.write("\n");
    },
      ParamState.ARRAY
    ));
  };

  public get retrieve() {
    this.addLog();
    this.addPrint();
    return this.fmt;
  };
};

class NativeOS {
  private os: RuntimeValues.Object;

  constructor() {
    this.os = new RuntimeValues.Object();
  };

  private addReadFile() {
    this.os.members.set("readFile", new RuntimeValues.MethodNative((path: string, encoding: BufferEncoding) => {
      return fs.readFileSync(path, encoding);
    }
    ));
  };

  private addReadDirectory() {
    this.os.members.set("readDir", new RuntimeValues.MethodNative((path: string, encoding: BufferEncoding) => {
      return fs.readdirSync(path, encoding);
    }
    ));
  };

  public get retreive() {
    this.addReadFile();
    this.addReadDirectory();
    return this.os;
  };
};


class NativeVector {
  private vector: RuntimeValues.Object;
  private value: any[];

  constructor() {
    this.vector = new RuntimeValues.Object();
    this.value = [];
  };

  public addPush() {
    this.vector.members.set("push", new RuntimeValues.MethodNative((element: any) => {
      this.value.push(element);
    }
    ));
  };

  public addPop() {
    this.vector.members.set("pop", new RuntimeValues.MethodNative(() => {
      return this.value.pop();
    }
    ));
  };

  public addAt() {
    this.vector.members.set("at", new RuntimeValues.MethodNative((index: number) => {
      return this.value.at(index);
    }
    ));

  };

  public addGet() {
    this.vector.members.set("get", new RuntimeValues.MethodNative(() => {
      return this.value;
    }
    ));

  };

  public addElements() {
    this.vector.members.set("elements", new RuntimeValues.MethodNative((elements: any[]) => {
      this.value = elements;
    },
      ParamState.ARRAY
    ));
  };

  public get retreive() {
    this.addElements();
    this.addAt();
    this.addGet();
    this.addPop();
    this.addPush();

    return this.vector;
  };
};

/**
  These are objects that the interpreter injects at the start of execution
*/

class NativeObjects {
  public get getFmt() {
    return new NativeFMT().retrieve;
  };

  public get getOS() {
    return new NativeOS().retreive;
  };

  public get getVector() {
    return new NativeVector().retreive;
  };
};


export default NativeObjects;
