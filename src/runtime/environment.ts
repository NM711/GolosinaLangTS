import { RuntimeValueID, RuntimeValues } from "./runtime_values";
import { GolosinaEnvironmentError } from "../exceptions";

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
  ENV_ERR_CONST_RE_ASSIGNMENT,
  ENV_INVALID_RESOLVER_STATE,
};

class Scope {
  public id: ScopeIdentifier;
  public symbols: Map<string, RuntimeValues.Value>;
  
  constructor(id: ScopeIdentifier) {
    this.id = id;
    this.symbols = new Map();
  };
};

class Environment {
  private scopes: Scope[];
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

  public declare(symbol: string, value: RuntimeValues.Value) {
    if (this.current.symbols.has(symbol)) {
      throw new GolosinaEnvironmentError(`Symbol "${symbol}" has already been declared within the current scope!`, EnvironmentErrorState.ENV_ERR_DECL_EXISTS);
    };
    
    this.current.symbols.set(symbol, value);
  };

  public assign(symbol: string, value: RuntimeValues.Value) {
    for (let i = this.scopes.length - 1; i >= 0; --i) {
      const scope = this.scopes[i];
      
      if (scope.symbols.has(symbol)) {
        const resolved = scope.symbols.get(symbol) as RuntimeValues.Value;
      
        if (resolved.id === RuntimeValueID.RID_VAR) { 
          const variable = resolved as RuntimeValues.Variable;
      
          if (variable.isConst) {
            throw new GolosinaEnvironmentError(`Attempted to re-assign constant at "${symbol}"`, EnvironmentErrorState.ENV_ERR_CONST_RE_ASSIGNMENT);
          };
        };

        scope.symbols.set(symbol, value);
        return;        
      };
    };

    throw new GolosinaEnvironmentError(` Unable to resolve symbol at "${symbol}"`, EnvironmentErrorState.ENV_ERR_UNRESOLVED);
  };

  public resolve(symbol: string): RuntimeValues.Value {

    for (let i = this.scopes.length - 1; i >= 0; --i) {
      const scope = this.scopes[i];
      
      if (scope.symbols.has(symbol)) {
        return scope.symbols.get(symbol) as RuntimeValues.Value;
      };
    };

    throw new GolosinaEnvironmentError(`Unable to resolve symbol at "${symbol}"`, EnvironmentErrorState.ENV_ERR_UNRESOLVED);
  };
};

export default Environment;
