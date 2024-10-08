import fs from "node:fs"
import { RuntimeObjects, RuntimeValues } from "../core/runtime_values";
import RuntimeValueTypeGuard from "../core/runtime_value_guards";

namespace NativeModules {

  export class FMT {

    private object: RuntimeValues.Object;

    constructor() {
      this.object = new RuntimeValues.Object(null);
    };

    private format(toLog: RuntimeValues.Object | null) {
      if (toLog) {
        const members: { [key: string]: string }[] = [];

        for (const [key, value] of toLog.getMembers) {
          members.push({
            [key]: value.constructor.name
          });
        };

        if (RuntimeValueTypeGuard.isObjectValue(toLog)) {

          return {
            prototype: this.format(toLog.prototype),
            members,
            value: toLog.primitive
          };

        } else {
          return {
            prototype: this.format(toLog.prototype),
            members
          };
        };
      };

      return null;
    };

    private writeObject(toLog: RuntimeValues.Object) {
      if (RuntimeValueTypeGuard.isObjectValue(toLog)) {

        if (toLog instanceof RuntimeObjects.VectorObject) {
          process.stdout.write(JSON.stringify(toLog.primitive, null, 2))
        } else {
          process.stdout.write(`${toLog.primitive} `);
        };
        
      } else {
        process.stdout.write(JSON.stringify(this.format(toLog), null, 2));
      }
    };
    
    private addLog(): void {
      this.object.setMember("log", new RuntimeValues.MethodNative((...log: RuntimeValues.Object[]) => {
        for (const toLog of log) {
          this.writeObject(toLog);
        };

        process.stdout.write("\n");

        const date = new Date();
        console.log(`Date: ${date.getFullYear()}-${date.getMonth()}-${date.getDay()},`, `Time: ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`);
      },
        RuntimeValues.ParamState.ARRAY
      ));
    };

    private addPrint(): void {
      this.object.setMember("print", new RuntimeValues.MethodNative((...log: RuntimeValues.Object[]) => {
        for (const toLog of log) {
          this.writeObject(toLog);
        };

        process.stdout.write("\n");
      },
        RuntimeValues.ParamState.ARRAY
      ));
    };

    public get retrieve() {
      this.addLog();
      this.addPrint();
      return this.object;
    };
  };

  export class OS {
    private object: RuntimeValues.Object;

    constructor() {
      this.object = new RuntimeValues.Object();
    };

    private addReadFile() {
      this.object.setMember("readFile", new RuntimeValues.MethodNative((path: RuntimeObjects.StringObject, encoding: RuntimeObjects.StringObject) => {
        return fs.readFileSync(path.primitive, encoding.primitive as BufferEncoding);
      }
      ));
    };

    private addUpdateFilePath() {
      this.object.setMember("updateFilePath", new RuntimeValues.MethodNative((oldPath: RuntimeObjects.StringObject, newPath: RuntimeObjects.StringObject) => {
        fs.renameSync(oldPath.primitive, newPath.primitive);
      }))
    };

    private addReadDirectory() {
      this.object.setMember("readDir", new RuntimeValues.MethodNative((path: RuntimeObjects.StringObject, encoding: RuntimeObjects.StringObject) => {
        return fs.readdirSync(path.primitive, encoding.primitive as BufferEncoding);
      }
      ));
    };

    public get retreive() {
      this.addReadFile();
      this.addReadDirectory();
      this.addUpdateFilePath();
      return this.object;
    };
  };

  /**
    Native data structure module
  */

  export class Containers {
    private object: RuntimeValues.Object;

    constructor() {
      this.object = new RuntimeValues.Object();
    };

    private addVector() {

      this.object.setMember("vector", new RuntimeValues.MethodNative((...elements: any[]) => {
        const vec = new RuntimeObjects.VectorObject();

        if (elements.length > 0) {
          vec.setElements(elements);
        };

        return vec;
      },
        RuntimeValues.ParamState.ARRAY
      ));
    };

    public get retrieve() {
      this.addVector();
      return this.object;
    };
  };
};

/**
  These are objects that the interpreter injects at the start of execution
*/

class NativeObjects {
  public static get getFmt() {
    return new NativeModules.FMT().retrieve;
  };

  public static get getOS() {
    return new NativeModules.OS().retreive;
  };

  public static get getContainers() {
    return new NativeModules.Containers().retrieve;
  };
};


export default NativeObjects;
