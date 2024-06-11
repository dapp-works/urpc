import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';
import { v4 as uuid } from "uuid"
import keyby from "lodash.keyby"
import { applyPatch, type Operation, type PatchResult } from "fast-json-patch"


export type FormConfigType<T> = {
  [F in keyof T]?: Item<FormConfigItem>
};

export type FormConfigItem = {
  title?: string;
  description?: string;
  required?: boolean;
  selectOptions?: { label: string; value: string }[];
} & UiSchema
export type Item<T> = T extends (infer U)[] ? U : T;


export interface URPC_Function<T extends Object = {}, R = any> {
  uid: string
  type?: "func"
  name?: string
  path?: string
  input: T
  func: (args: { input: T }) => R
  uiConfig?: () => FormConfigType<T>
}
export interface URPC_Variable<T extends () => any = () => any, R = any, V = any> {
  uid: string
  type?: "var"
  name?: string
  path?: string
  get: T
  patch?: ((value: Operation[]) => PatchResult<any>)
  allow?: {
    patch?: Boolean
  }
  set?: R extends () => infer U ? (value: ReturnType<T>) => U : never;
  uiConfig?: () => FormConfigType<Item<ReturnType<T>>>
}

export type URPC_Entity = URPC_Function<any, any> | URPC_Variable<any, any>

export type URPC_Schema = {
  [key: string]: URPC_Entity | URPC_Schema
}

export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema
  static Var<T extends () => any, R = any>(args: Partial<URPC_Variable<T, R>>): URPC_Variable<T, R> {
    if (!args.patch) {
      args.patch = (ops) => {
        //@ts-ignore
        return applyPatch(args.get(), ops)
      }
    }
    return { ...args, type: "var", uid: uuid() } as URPC_Variable<T, R>
  }
  static Func<T extends Object = {}, R = any>(args: Partial<URPC_Function<T, R>>): URPC_Function<T, R> {
    return { ...args, type: "func", uid: uuid() } as URPC_Function<T, R>
  }


  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
    this.uidSchemas = keyby(this.schemas, "uid")

  }


  loadFull() {
    return Object.entries(this.falttenSchema).map(([k, v]) => {
      if (v.type == "func") {
        const { uid, type, input, name, uiConfig } = v
        return { uid, type, name, input, uiConfig: uiConfig ? uiConfig() : null }
      }
      if (v.type == "var") {
        const { uid, type, get, set, name, uiConfig } = v as URPC_Variable
        return { uid, type, name, value: get(), uiConfig: uiConfig ? uiConfig() : null, set: !!set }
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


