import GolosinaExceptions from "../../errors/exceptions";
import { RuntimeValues } from "./runtime_values";

export enum ScopeIdentifier {
  S_GLOBAL,
  S_OBJECT,
  S_BLOCK,
  S_METHOD,
  S_LOOP,
};

export enum EnvironmentErrorState {
  ENV_ERR_UNRESOLVED,
  ENV_ERR_DECL_EXISTS,
  ENV_ERR_CONST_RE_ASSIGNMENT
};

class Scope {
  public id: ScopeIdentifier;
  public symbols: Map<string, RuntimeValues.AbstractValue>;
  
  constructor(id: ScopeIdentifier) {
    this.id = id;
    this.symbols = new Map();
  };
};

class Environment {
  private scopes: Scope[];
  public lastResolvedSymbol: string;
  public lastResolvedModuleSymbol: string;
  public current: Scope;
  public strict: boolean;
     
  constructor() {
    this.scopes = [new Scope(ScopeIdentifier.S_GLOBAL)];
    this.current = this.scopes[0];
    this.strict = true;
  };
  
  private updateCurrent(): void {
    this.current = this.scopes[this.scopes.length - 1];
  };

  public pushScope(id: ScopeIdentifier) {
    this.scopes.push(new Scope(id));
    this.updateCurrent();
  };

  public popScope() {
    this.scopes.pop();
    this.updateCurrent();
  };

  public declare(symbol: string, value: RuntimeValues.AbstractValue) {
    if (this.current.symbols.has(symbol)) {
      throw new GolosinaExceptions.Backend.EnvironmentError(symbol, EnvironmentErrorState.ENV_ERR_DECL_EXISTS);
    };
    
    this.current.symbols.set(symbol, value);
  };

  public assign(symbol: string, value: RuntimeValues.AbstractValue) {
    for (let i = this.scopes.length - 1; i >= 0; --i) {
      const scope = this.scopes[i];
      if (scope.symbols.has(symbol)) {
        const resolved = scope.symbols.get(symbol) as RuntimeValues.AbstractValue;
      
        if (resolved.id === RuntimeValues.RuntimeValueID.RID_VAR) { 
          const variable = resolved as RuntimeValues.Variable;
      
          if (variable.isConst) {
            throw new GolosinaExceptions.Backend.EnvironmentError(symbol, EnvironmentErrorState.ENV_ERR_CONST_RE_ASSIGNMENT);
          };
        };

        scope.symbols.set(symbol, value);
        return;        
      };
    };

    throw new GolosinaExceptions.Backend.EnvironmentError(symbol, EnvironmentErrorState.ENV_ERR_UNRESOLVED);
  };

  public resolve(symbol: string): RuntimeValues.AbstractValue {

    for (let i = this.scopes.length - 1; i >= 0; --i) {
      const scope = this.scopes[i];
      
      if (scope.symbols.has(symbol)) {
        this.lastResolvedSymbol = symbol;
        return scope.symbols.get(symbol) as RuntimeValues.AbstractValue;
      };
    };

    throw new GolosinaExceptions.Backend.EnvironmentError(symbol, EnvironmentErrorState.ENV_ERR_UNRESOLVED);
  };
};

export default Environment;
