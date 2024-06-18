import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';
import { v4 as uuid } from "uuid"
import keyby from "lodash.keyby"
import { applyPatch, type Operation, type PatchResult } from "fast-json-patch"
import { isBoolean, set } from "lodash";


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


type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type SchemaItem<T extends Object = {}, R extends any = any> = {
  type?: string
  uiConfig?: FormConfigItem
  // schema?: URPC_SchemaField<R>
} | URPC_Action<T, R> | URPC_Function<T, R, any>

export type URPC_Action<T extends Object = {}, R extends any = any> = {
  type?: "action"
  input?: T
  func?: (args: { val: Item<R>, input: T }) => any
  uiConfig?: FormConfigItem
  schema?: URPC_SchemaField<R>
}


export type URPC_Class<G extends () => {
  enums?: any[] | { label: any, value: any }[]
  default?: any
} = () => any> = {
  class: string
  get: G
}

export type URPC_Input<T> = {
  [K in keyof T]: T[K] extends URPC_Class<infer G>
  ? ReturnType<G>["default"]
  : T[K];
}


export interface URPC_Function<T extends Object = {}, R extends any = any, V = any> {
  uid: string
  type?: "func"
  name?: string
  path?: string
  input: T
  func: (args: { input: URPC_Input<T>, val?: R }) => V
  uiConfig?: (() => FormConfigType<T>) | FormConfigType<T>
  schema?: URPC_SchemaField<R>
}



export type URPC_SchemaField<R extends any = any> = (val?: R) => {
  [F in keyof Item<R>]?: SchemaItem<any, R>
} & {
  [key: string]: SchemaItem<any, R>
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
  schema?: URPC_SchemaField<R>
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

export type URPC_Entity = URPC_Function<any, any, any> | URPC_Variable<any> | URPC_Schema

export type URPC_Schema = {
  [key: string]: URPC_Entity
}


export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema

  static enum<G extends URPC_Class["get"]>(get: G): URPC_Class<G> {
    return {
      class: "enum",
      get: () => {
        const res = get()
        return res
      }
    } as URPC_Class<G>
  }

  static Namespace(args: URPC_Entity): URPC_Entity {
    return args
  }


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
      enable: true,
      allowCreate: true,
      allowDelete: true,
      allowUpdate: true,
      autoPatch: Object.assign({}, {
        target: args.get
      }, args.patch?.autoPatch || {}),
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
          return applyPatch(await args.patch.autoPatch.target(), ops).newDocument
        }

        //@ts-ignore
        return value
      }
    } as typeof args.patch, args.patch || {})
    return { ...args, type: "var", uid: uuid() } as URPC_Variable<G>
  }
  static Func<T extends Object = {}, R = any, V = any>(args: Partial<URPC_Function<T, R, V>>): URPC_Function<T, R, V> {
    const ctx = { ...args, type: "func", uid: uuid() } as URPC_Function<T, R, V>
    return ctx
  }
  static Action<T extends Object = {}, R = any>(args: Partial<URPC_Action<T, R>>): URPC_Action<T, R> {
    return { ...args, type: "action", uid: uuid() } as URPC_Action<T, R>
  }




  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
    this.uidSchemas = keyby(Object.values(this.falttenSchema), "uid")
  }


  async loadFull(params?: { namespace: string }) {
    return Promise.all(Object.entries(this.falttenSchema).filter(([k, v]) => {
      if (params?.namespace && !k.startsWith(params.namespace)) return

      return true
    }).map(async ([k, v]) => {

      if (v.type == "func") {
        const { uid, type, name, input } = v

        const uiConfig = typeof v.uiConfig == "function" ? await v.uiConfig() : v.uiConfig
        const _schema = v.schema ? v.schema() : {}
        //@ts-ignore
        const ctx = { uid, type, name, uiConfig, schema: _schema, input: {} } as Partial<URPC_Function>


        await Promise.all(Object.entries(input).map(async ([k, v]: [string, any]) => {
          let input = v
          if (v.get) {
            const cls = v as URPC_Class
            const val = await cls.get()
            input = val.default



            if (val.enums) {
              set(ctx, `uiConfig[${k}].selectOptions`, val.enums.map(e => ({ label: e.label ?? e, value: e.value ?? e })))
            }
          }
          //@ts-ignore
          ctx.input[k] = input


        }))
        console.log(ctx.input)
        return ctx
      }
      if (v.type == "var") {
        const { uid, type, get, set, name, patch } = v as URPC_Variable
        const value = await get()

        const _schema = v.schema ? v.schema(value) : {}
        // let actions: string[] = []
        // let uiConfig: FormConfigType<Item<ReturnType<any>>> = {}
        if (_schema) {
          v._schema = _schema
          Object.entries(_schema).forEach(([k, s]) => {
            if (!s) return
            //@ts-ignore
            if (s.schema) {
              //@ts-ignore
              s.schema = s.schema(value)
            }
            if (s.uiConfig && typeof s.uiConfig == "function") {
              //@ts-ignore
              s.uiConfig = s.uiConfig()
            }
          })
        }

        return { uid, type, name, value, set: !!set, patch, schema: _schema }
      }
      return { type: "unknown", name: k }
    }))
  }

  async loadVars(params?: { namespace: string }) {
    return Promise.all(Object.entries(this.falttenSchema).filter(([k, v]) => {
      if (params?.namespace && !k.startsWith(params.namespace)) return
      if (v.type == "var")
        return v.type == "var"
    }).map(async ([k, v]) => {
      const { get, name } = v as URPC_Variable
      const value = await get()
      return { name, value }
    }))
  }
}


