import { ParamState, RuntimeValues } from "../runtime_values";

class NativeFMT {

  private fmt: RuntimeValues.Object;

  constructor() {
    this.fmt = new RuntimeValues.Object(null);
  };

  public log(): void {
    this.fmt.members.set("log", new RuntimeValues.MethodNative((log: any[]) => {
      console.log(...log);
      const date = new Date();
      console.log(`Date: ${date.getFullYear()}-${date.getMonth()}-${date.getDay()},`, `Time: ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`);
    },
      ParamState.ARRAY
    ));
  };

  public get retrive() {
    this.log();
    return this.fmt;
  };
};

/**
  These are objects that the interpreter injects at the start of execution
*/

class NativeObjects {
  public get getFmt() {
    return new NativeFMT().retrive;
  };
};


export default NativeObjects;
