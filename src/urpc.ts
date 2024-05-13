import { utils } from "./utils"


export interface URPC_Function<T extends Object = {}, R = any> {
  type?: "func"
  name?: string
  path?: string
  input: T
  func: (args: { input: T }) => R
}
export interface URPC_Variable<T extends () => any = () => any, R = any> {
  type?: "var"
  name?: string
  path?: string
  get: T
  set?: R extends () => infer U ? (value: ReturnType<T>) => U : never;
}

export type URPC_Entity = URPC_Function<any, any> | URPC_Variable<any, any>

export type URPC_Schema = {
  [key: string]: URPC_Entity | URPC_Schema
}

export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  static Var<T extends () => any, R = any>(args: URPC_Variable<T, R>): URPC_Variable<T, R> {
    return { ...args, type: "var" }
  }
  static Func<T extends Object = {}, R = any>(args: URPC_Function<T, R>): URPC_Function<T, R> {
    return { ...args, type: "func" }
  }

  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
  }


  loadFull() {
    return Object.entries(this.falttenSchema).map(([k, v]) => {
      if (v.type == "func") {
        const { type, input, name } = v
        return { type, name, input }
      }
      if (v.type == "var") {
        const { type, get, name } = v
        return { type, name, value: get() }
      }
      return { type: "unknown", name: k }
    })
  }

  loadVars() {
    return Object.entries(this.falttenSchema).filter(([k, v]) => v.type == "var").map(([k, v]) => {
      const { get, set, name } = v as URPC_Variable<any, any>
      return { name, value: get(), get, set }
    })
  }
}


