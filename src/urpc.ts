import { utils } from "./utils"
import type { UiSchema } from '@rjsf/utils';
import { v4 as uuid } from "uuid"
import keyby from "lodash.keyby"
import set from "lodash.set"


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




// export type URPC_ClassGet = () => {
//   enums?: any[] | { label: any, value: any }[]
//   default?: any
// }

export type URPC_Class<T extends any = any> = {
  type?: string | URPC_Class
  enums: T[] | { label: T, value: T }[]
  default: T
  uiConfig?: FormConfigItem
}

export type URPC_Input<T> = {
  [K in keyof T]: T[K] extends URPC_Class<infer G>
  ? G
  : T[K];
}


export type URPC_Action<T extends Object = {}, R extends any = any, V extends URPC_Variable = any> = {
  type?: "action"
  input: T | ((args: V) => T)
  confirm?: boolean
  func?: (args: { input: URPC_Input<T>, val: Item<R> }) => any
  uiConfig?: FormConfigItem
  // schema?: URPC_SchemaField<R>
}


export interface URPC_Function<T extends Object = {}, R extends any = any, I extends any = any, V extends URPC_Variable = any> {
  uid: string
  type?: "func"
  name?: string
  path?: string
  confirm?: boolean
  input: T | ((args: V) => T)
  func: (args: { input: URPC_Input<T>, val?: R extends {} ? R : undefined }) => I
  uiConfig?: (() => FormConfigType<T>) | FormConfigType<T>
  // schema?: URPC_SchemaField<R>
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
  schema?: URPC_SchemaField<R, URPC_Variable<G, R>>
  _schema: InferSchema<R, URPC_Variable<G, R>['schema']>
  set?: (val: R) => any
}

type SchemaItem<T extends Object = {}, R extends any = any, V extends URPC_Variable = any> = (() => URPC_Class) | URPC_Class | URPC_Action<T, R, V> | URPC_Function<T, R, any, V>


type InferSchema<R, S> = S extends URPC_SchemaField<R>
  ? {
    [K in keyof ReturnType<S>]: ReturnType<S>[K];
  }
  : never;


export type URPC_SchemaField<R extends any = any, V extends URPC_Variable = any> = (val?: R) => {
  [F in keyof Item<R>]?: SchemaItem<any, R, V>
} & {
  [key: string]: SchemaItem<any, R, V>
}



export type URPC_Entity = URPC_Function<any, any, any, any> | URPC_Variable<any, any> | URPC_Schema

export type URPC_Schema = {
  [key: string]: URPC_Entity
}


export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema


  static type<T extends any = any>(get: () => URPC_Class<T>): () => URPC_Class<T> {
    return get
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
    return { ...args, type: "var", uid: uuid(), } as URPC_Variable<G>
  }
  static Func<T extends Object = {}, R extends any = any, I extends any = any, V extends URPC_Variable = any>(args: Partial<URPC_Function<T, R, I, V>>): URPC_Function<T, R, I, V> {
    const ctx = { ...args, type: "func", uid: uuid() } as URPC_Function<T, R, I, V>
    return ctx
  }
  static Action<T extends Object = {}, R extends any = any, V extends URPC_Variable = any>(args: Partial<URPC_Action<T, R, V>>): URPC_Action<T, R, V> {
    return { ...args, type: "action", uid: uuid() } as URPC_Action<T, R, V>
  }




  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
    this.uidSchemas = keyby(Object.values(this.falttenSchema), "uid")
  }

  static utils = {
    async formatVar(v: URPC_Variable) {
      const { uid, type, get, name } = v as URPC_Variable
      const value = await get()
      const _schema = v.schema ? v.schema(value) : {}

      const ctx = { uid, type, name, value, set: !!v.set, _schema }

      //@ts-ignore
      await URPC.utils.formatSchema(ctx)
      v._schema = ctx._schema
      //@ts-ignore
      ctx.schema = ctx._schema
      //@ts-ignore
      ctx._schema = undefined



      return ctx
    },

    async formatFunc(f: URPC_Function, v?: URPC_Variable) {
      const { uid, type, name, func } = f

      const uiConfig = typeof f.uiConfig == "function" ? await f.uiConfig() : f.uiConfig || {}
      // const _schema = typeof f.schema == "function" ? f.schema() : f.schema || {}
      //@ts-ignore
      const ctx = { uid, type, name, uiConfig, input: {} } as Partial<URPC_Function>
      const input = (typeof f.input == 'function' ? await f.input(v) : f.input) || {}

      await Promise.all(Object.entries(input).map(async ([k, v]: [string, any]) => {
        const input = typeof v == "function" ? await v() : v
        //@ts-ignore
        if (!ctx.uiConfig[k]) {
          //@ts-ignore
          ctx.uiConfig[k] = {}
        }
        if (input.uiConfig) {
          //@ts-ignore
          Object.assign(ctx.uiConfig[k], input.uiConfig)
        }

        if (input.enums) {
          set(ctx, `uiConfig[${k}].selectOptions`, input.enums.map(e => ({ label: e.label ?? e, value: e.value ?? e })))
        }

        //@ts-ignore
        ctx.input[k] = input.default || input
      }))
      return ctx
    },
    async formatSchema(ctx: URPC_Variable) {
      if (ctx._schema) {
        let value = Array.isArray(ctx.value) && typeof ctx.value[0] == "object" ? ctx.value[0] : ctx.value
        if (ctx.value) {
          Object.entries(value).map(([k, v]) => {
            //@ts-ignore
            if (ctx._schema[k]) return
            //@ts-ignore
            ctx._schema[k] = { type: typeof v, default: v }
          })
        }
        await Promise.all(Object.entries(ctx._schema).map(async ([k, v]) => {
          if (!v) return
          const s = typeof v == "function" ? v() : v
          //@ts-ignore
          ctx._schema[k] = s
          const sc = s as URPC_Class

          if (sc.enums) {
            //@ts-ignore
            set(ctx._schema[k], `uiConfig.selectOptions`, sc.enums.map(e => ({ label: e.label ?? e, value: e.value ?? e })))
          }


          if (s.uiConfig && typeof s.uiConfig == "function") {
            //@ts-ignore
            s.uiConfig = s.uiConfig()
          }
          //@ts-ignore
          if (s.input) {
            //@ts-ignore
            ctx._schema[k] = await URPC.utils.formatFunc(s, ctx)
          }
        }))
      }

    }
  }


  async loadFull(params?: { namespace: string }) {
    return Promise.all(Object.entries(this.falttenSchema).filter(([k, v]) => {
      if (params?.namespace && !k.startsWith(params.namespace)) return

      return true
    }).map(async ([k, v]) => {

      if (v.type == "func") {
        return URPC.utils.formatFunc(v as URPC_Function)
      }
      if (v.type == "var") {
        return URPC.utils.formatVar(v as URPC_Variable)
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


