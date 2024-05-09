import { RuntimeObjects, RuntimeValues } from "../runtime_values";

namespace GolosinaDataStructures {
  export class Vector {
    private object: RuntimeObjects.ContainerObject;

    constructor() {
      this.object = new RuntimeObjects.ContainerObject();
    };

    public addPush() {
      this.object.members.set("push", new RuntimeValues.MethodNative((element: any) => {
        this.object.value.push(element);
      }
      ));
    };

    public addPop() {
      this.object.members.set("pop", new RuntimeValues.MethodNative(() => {
        return this.object.value.pop();
      }
      ));
    };

    public addAt() {
      this.object.members.set("at", new RuntimeValues.MethodNative((index: RuntimeObjects.IntegerObject) => {
        return this.object.value.at(index.value);
      }
      ));
    };

    set setElements(elements: any[]) {
      this.object.value = elements;
    };

    public get retreive() {
      this.addAt();
      this.addPop();
      this.addPush();
      return this.object;
    };
  };
};

export default GolosinaDataStructures;
