import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';
import { v4 as uuid } from "uuid"
import keyby from "lodash.keyby"
import { applyPatch, type Operation, type PatchResult } from "fast-json-patch"
import { isBoolean } from "lodash";


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


export interface URPC_Function<T extends Object = {}, R extends any = any, V = any> {
  uid: string
  type?: "func"
  name?: string
  path?: string
  input: T
  func: (args: { input: T, val?: R }) => V
  uiConfig?: () => FormConfigType<T>
}


type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type SchemaItem<T extends Object = {}, R extends any = any> = {
  type?: string
  uiConfig?: FormConfigItem
} | URPC_Action<T, R> | URPC_Function<T, R, any>

export type URPC_Action<T extends Object = {}, R extends any = any> = {
  type?: "action"
  input?: T
  func?: (args: { val: Item<R>, input: T }) => any
  uiConfig?: FormConfigItem
}

export interface URPC_Variable<
  G extends () => any = () => any,
  R extends UnwrapPromise<ReturnType<G>> = UnwrapPromise<ReturnType<G>>
> {
  uid: string
  type?: "var"
  name?: string
  path?: string
  get: G
  value: R
  schema?: (val: R) => {
    [F in keyof Item<R>]?: SchemaItem<any, R>
  } & {
    [key: string]: SchemaItem<any, R>
  }
  _schema?: ReturnType<Required<URPC_Variable<R>>["schema"]>
  // actions?: ActionType<Item<T>>
  patch?: {
    enable?: boolean
    allowCreate?: boolean
    allowDelete?: boolean
    allowUpdate?: boolean,
    autoPatch?: boolean | {
      target: () => any
    }
    onCreate?: (value: Item<R>) => any
    onUpdate?: (key, value) => any
    onDelete?: (key: any) => any
    onPatch?: (value: Operation[]) => Promise<PatchResult<any>>
  }
  set?: (val: R) => any
}

export type URPC_Entity = URPC_Function<any, any, any> | URPC_Variable<any>

export type URPC_Schema = {
  [key: string]: URPC_Entity | URPC_Schema
}

export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema



  static Var<G extends () => any>(args: Partial<URPC_Variable<G>>): URPC_Variable<G> {
    if (!args.get) throw new Error("invalid Var params")
    const get = args.get
    //@ts-ignore
    args.get = async () => {
      const value = await get!()
      args.value = value
      return value
    }
    args.patch = Object.assign({}, {
      allowCreate: true,
      allowDelete: true,
      allowUpdate: true,
      autoPatch: {
        target: args.get
      },
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

        if (!isBoolean(args.patch?.autoPatch) && !!args.patch?.autoPatch?.target) {
          return applyPatch(args.patch.autoPatch.target(), ops).newDocument
        }

        //@ts-ignore
        return value
      }
    } as typeof args.patch, args.patch || {})
    return { ...args, type: "var", uid: uuid() } as URPC_Variable<G>
  }
  static Func<T extends Object = {}, R = any, V = any>(args: Partial<URPC_Function<T, R, V>>): URPC_Function<T, R, V> {
    return { ...args, type: "func", uid: uuid() } as URPC_Function<T, R, V>
  }
  static Action<T extends Object = {}, R = any>(args: Partial<URPC_Action<T, R>>): URPC_Action<T, R> {
    return { ...args, type: "action", uid: uuid() } as URPC_Action<T, R>
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

        return { uid, type, name, value, actions, uiConfig, set: !!set, patch, schema: _schema }
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


