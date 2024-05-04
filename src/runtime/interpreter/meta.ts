class MetaData {
  public assign: boolean;
  private symbol: string;
  private collection: boolean;

  constructor() {
    this.assign = false;
    this.collection = true;
  };

  public set setSymbolCollection(active: boolean) {
    this.collection = active;
  };

  public set setSymbol(newSymbol: string) {
    if (this.collection) {
      this.symbol = newSymbol;
    };
  };

  public get getSymbol() {
    return this.symbol;
  };
};

export default MetaData;
