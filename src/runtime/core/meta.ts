export enum DispatchID {
  NONE,
  BREAK,
  CONTINUE,
  RETURN
};

class MetaData {
  public assign: boolean;
  private symbol: string;
  private collection: boolean;
  private dispatchID: DispatchID;

  constructor() {
    this.assign = false;
    this.collection = true;
    this.dispatchID = DispatchID.NONE;
  };

  public set setSymbolCollection(active: boolean) {
    this.collection = active;
  };

  public set setSymbol(newSymbol: string) {
    if (this.collection) {
      this.symbol = newSymbol;
    };
  };

  public set setDispatchID(id: DispatchID) {
    this.dispatchID = id;
  };

  public resetDispatchID() {
    this.dispatchID = DispatchID.NONE;
  };

  public get getDispatchID() {
    return this.dispatchID;
  }

  public get getSymbol() {
    return this.symbol;
  };
};

export default MetaData;
