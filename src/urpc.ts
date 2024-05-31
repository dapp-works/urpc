import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';


export type FormConfigType<T> = {
  [F in keyof T]?: {
    title?: string;
    description?: string;
    required?: boolean;
    selectOptions?: { label: string; value: string }[];
  } & UiSchema;
};


export interface URPC_Function<T extends Object = {}, R = any> {
  type?: "func"
  name?: string
  path?: string
  input: T
  func: (args: { input: T }) => R
  uiConfig?: () => FormConfigType<T>
}
export interface URPC_Variable<T extends () => any = () => any, R = any> {
  type?: "var"
  name?: string
  path?: string
  get: T
  set?: R extends () => infer U ? (value: ReturnType<T>) => U : never;
  uiConfig?: () => FormConfigType<ReturnType<T>>
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
        const { type, input, name, uiConfig } = v
        return { type, name, input, uiConfig: uiConfig ? uiConfig() : null }
      }
      if (v.type == "var") {
        const { type, get, name, uiConfig } = v as URPC_Variable
        return { type, name, value: get(), uiConfig: uiConfig ? uiConfig() : null }
      }
      return { type: "unknown", name: k }
    })
  }

  loadVars() {
    return Object.entries(this.falttenSchema).filter(([k, v]) => v.type == "var").map(([k, v]) => {
      const { get, name } = v as URPC_Variable<any, any>
      return { name, value: get() }
    })
  }
}


