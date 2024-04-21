import { RuntimeEnvironmentValues, RuntimeValueType } from "./runtime_values";
import { GolosinaEnvironmentError } from "../exceptions";


enum ScopeIdentifier {
  S_GLOBAL,
  S_OBJECT,
  S_BLOCK,
  S_METHOD,
};

class Scope {
  public id: ScopeIdentifier;
  public symbols: Map<string, RuntimeEnvironmentValues.RuntimeValue>;
  
  constructor(id: ScopeIdentifier) {
    this.id = id;
  };
};

/*
  Runtime Environment
  TODO:
  1. Check for symbol shadowing
*/


class Environment {
  private scopes: Scope[];
  private current: Scope;
 
  constructor() {
    this.scopes = [new Scope(ScopeIdentifier.S_GLOBAL)];
    this.current = this.scopes[0];
  };

  /*
    Method that checks wheter or not a symbol is being shadowed in an outer scope.
  */

  private checkShadow(symbol: string) {
    for (const scope of this.scopes) {
      if (scope.symbols.has(symbol)) {
        throw new GolosinaEnvironmentError(`Symbol "${symbol}" has already been declared within an accessible scope!`);
      };
    };
  };

  public get getCurrentScopeID() {
    return this.current.id;
  };

  public pushScope(id: ScopeIdentifier) {
    this.scopes.push(new Scope(id));
    this.current = this.scopes[this.scopes.length - 1];
  };

  public popScope() {
    this.current = this.scopes.pop() as Scope;
  };

  public declare(symbol: string, value: RuntimeEnvironmentValues.RuntimeValue) {
    this.checkShadow(symbol);
    this.current.symbols.set(symbol, value);
  };

  public assign(symbol: string, value: RuntimeEnvironmentValues.RuntimeValue) {
    let resolved: RuntimeEnvironmentValues.RuntimeValue = this.resolve(symbol);
    // under the hood a pointer to the resolved object is returned, so essentially we can modify what we need.

    if (resolved.id === RuntimeValueType.RVT_VAR) {
      const variable = resolved as RuntimeEnvironmentValues.RuntimeVariable;

      if (variable.isConst) {
        throw new GolosinaEnvironmentError(`Attempted to re-assign constant at "${symbol}"`);
      };
    };

    resolved = value;

    // verification stage

    for (const x of this.scopes) {
      if (x.symbols.has(symbol)) {
        console.log(x.symbols.get(symbol))
        console.log(resolved)
      }
    }
  };

  public resolve(symbol: string): RuntimeEnvironmentValues.RuntimeValue {
    for (const scope of this.scopes) {
      if (scope.symbols.has(symbol)) {
        return scope.symbols.get(symbol) as RuntimeEnvironmentValues.RuntimeValue;
      };
    };

    throw new GolosinaEnvironmentError(`Unable to resolve symbol "${symbol}"!`);
  };
   
};

export default Environment;
