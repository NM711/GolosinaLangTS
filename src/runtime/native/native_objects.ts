import fs from "node:fs"
import { ParamState, RuntimeObjects, RuntimeValues } from "../core/runtime_values";
import RuntimeValueTypeGuard from "../../guards/runtime_value_guards";
import GolosinaDataStructures from "./data_structures";

namespace NativeModules {

  export class FMT {

    private object: RuntimeValues.Object;

    constructor() {
      this.object = new RuntimeValues.Object(null);
    };

    private format(toLog: RuntimeValues.Object | null) {
      if (toLog) {
        const members: { [key: string]: string }[] = [];

        for (const [key, value] of toLog.members) {
          members.push({
            [key]: value.constructor.name
          });
        };

        if (RuntimeValueTypeGuard.isObjectValue(toLog)) {

          return {
            prototype: this.format(toLog.prototype),
            members,
            value: toLog.value
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

        if (toLog.isContainer()) {
          process.stdout.write(JSON.stringify(toLog.value, null, 2))
        } else {
          process.stdout.write(`${toLog.value} `);
        };
        
      } else {
        process.stdout.write(JSON.stringify(this.format(toLog), null, 2));
      }
    };
    
    private addLog(): void {
      this.object.members.set("log", new RuntimeValues.MethodNative((...log: RuntimeValues.Object[]) => {
        for (const toLog of log) {
          this.writeObject(toLog);
        };

        process.stdout.write("\n");

        const date = new Date();
        console.log(`Date: ${date.getFullYear()}-${date.getMonth()}-${date.getDay()},`, `Time: ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`);
      },
        ParamState.ARRAY
      ));
    };

    private addPrint(): void {
      this.object.members.set("print", new RuntimeValues.MethodNative((...log: RuntimeValues.Object[]) => {
        for (const toLog of log) {
          this.writeObject(toLog);
        };

        process.stdout.write("\n");
      },
        ParamState.ARRAY
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
      this.object.members.set("readFile", new RuntimeValues.MethodNative((path: RuntimeObjects.StringObject, encoding: RuntimeObjects.StringObject) => {
        return fs.readFileSync(path.value, encoding.value as BufferEncoding);
      }
      ));
    };

    private addUpdateFilePath() {
      this.object.members.set("updateFilePath", new RuntimeValues.MethodNative((oldPath: RuntimeObjects.StringObject, newPath: RuntimeObjects.StringObject) => {
        fs.renameSync(oldPath.value, newPath.value);
      }))
    };

    private addReadDirectory() {
      this.object.members.set("readDir", new RuntimeValues.MethodNative((path: RuntimeObjects.StringObject, encoding: RuntimeObjects.StringObject) => {
        return fs.readdirSync(path.value, encoding.value as BufferEncoding);
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
      this.object.members.set("vector", new RuntimeValues.MethodNative((elements: any[]) => {
        const vec = new GolosinaDataStructures.Vector();

        if (elements.length > 0) {
          vec.setElements = elements;
        };

        return vec.retreive;
      },
        ParamState.ARRAY
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
  public get getFmt() {
    return new NativeModules.FMT().retrieve;
  };

  public get getOS() {
    return new NativeModules.OS().retreive;
  };

  public get getContainers() {
    return new NativeModules.Containers().retrieve;
  };
};


export default NativeObjects;
