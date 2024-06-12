import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';
import { v4 as uuid } from "uuid"
import keyby from "lodash.keyby"
import { applyPatch, type Operation, type PatchResult } from "fast-json-patch"


export type FormConfigType<T> = {
  [F in keyof T]?: Item<FormConfigItem>
}

export type ActionType<T> = {
  [key: string]: (val: T) => any
}

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

type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export interface URPC_Variable<
  G extends () => any = () => any,
  T extends UnwrapPromise<ReturnType<G>> = UnwrapPromise<ReturnType<G>>
> {
  uid: string
  type?: "var"
  name?: string
  path?: string
  get: G
  schema?: (val: T) => {
    [F in keyof Item<T> | string]?: {

      type?: string
      uiConfig?: FormConfigItem
      call?: (val: Item<T>) => any
    }
  }
  _schema?: ReturnType<Required<URPC_Variable<T>>["schema"]>
  actions?: ActionType<Item<T>>
  patch?: {
    allowCreate?: Boolean
    allowDelete?: Boolean
    allowUpdate?: Boolean,
    autoPatch?: Boolean
    onCreate?: (value: Item<T>) => any
    onUpdate?: (key, value) => any
    onDelete?: (key: any) => any
    onPatch?: (value: Operation[]) => Promise<PatchResult<any>>
  }
  set?: (val: T) => any
}

export type URPC_Entity = URPC_Function<any, any> | URPC_Variable<any>

export type URPC_Schema = {
  [key: string]: URPC_Entity | URPC_Schema
}

export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema
  // static Raw<T extends () => any>(t: T, func: (args: ReturnType<T>) => Partial<URPC_Variable<T>>) {
  //   const res = func(t())
  //   return URPC.Var({ get: t, ...res }) as URPC_Variable<T>
  // }


  static Var<G extends () => any>(args: Partial<URPC_Variable<G>>): URPC_Variable<G> {
    args.patch = Object.assign({}, {
      allowCreate: true,
      allowDelete: true,
      allowUpdate: true,
      autoPatch: true,
      onPatch: async (ops) => {
        ops.forEach(async op => {
          if (op.op == 'add' && op.path == '/-') {
            args.patch?.onCreate && await args.patch.onCreate(op.value)
          }
          if (op.op == 'replace') {
            args.patch?.onUpdate && await args.patch.onUpdate(op.path.replace("/", ""), op.value)
          }
          if (op.op == 'remove') {
            args.patch?.onDelete && await args.patch.onDelete(op.path.replace("/", ""))
          }
        })
        const value = await args.get!()

        if (args.patch?.autoPatch) {
          return applyPatch(value, ops).newDocument
        }

        //@ts-ignore
        return value
      }
    } as typeof args.patch, args.patch || {})
    return { ...args, type: "var", uid: uuid() } as URPC_Variable<G>
  }
  static Func<T extends Object = {}, R = any>(args: Partial<URPC_Function<T, R>>): URPC_Function<T, R> {
    return { ...args, type: "func", uid: uuid() } as URPC_Function<T, R>
  }


  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
    this.uidSchemas = keyby(Object.values(this.falttenSchema), "uid")
  }


  async loadFull() {
    return Promise.all(Object.entries(this.falttenSchema).map(async ([k, v]) => {
      if (v.type == "func") {
        const { uid, type, input, name, uiConfig } = v
        return { uid, type, name, input, uiConfig: uiConfig ? uiConfig() : null }
      }
      if (v.type == "var") {
        const { uid, type, get, set, name, patch } = v as URPC_Variable
        const value = await get()

        const _schema = v.schema ? v.schema(value) : null
        let actions: string[] = []
        let uiConfig: FormConfigType<Item<ReturnType<any>>> = {}
        if (_schema) {
          v._schema = _schema
          Object.entries(_schema).forEach(([k, s]) => {
            if (!s) return
            if (s.type == "action") {
              actions.push(k)
            }
            //@ts-ignore
            if (s.uiConfig) {
              //@ts-ignore
              uiConfig[k] = s.uiConfig
            }
          })
        }

        return { uid, type, name, value, actions, uiConfig, set: !!set, patch, }
      }
      return { type: "unknown", name: k }
    }))
  }

  async loadVars() {
    return Promise.all(Object.entries(this.falttenSchema).filter(([k, v]) => v.type == "var").map(async ([k, v]) => {
      const { get, name } = v as URPC_Variable
      const value = await get()
      return { name, value }
    }))
  }
}


