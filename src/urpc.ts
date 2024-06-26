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


export type LayoutInput<R extends any = any> = {
  [key in keyof R]: string
}

export type URPC_Class<T extends any = any> = {
  type?: string
  class?: string
  enums?: T[] | { label: T, value: T }[]
  default?: T
  uiConfig?: FormConfigItem
  schema?: URPC_SchemaField<T>
}


export type URPC_Action<T extends any = any, R extends any = any, V extends URPC_Variable = any> = {
  type?: "action"
  input: T | (() => T)
  confirm?: boolean
  use?: URPC_Middleware<any>[]
  func?: (args: { input: URPC_Input<T>, val: Item<R> }) => any
  uiConfig?: FormConfigItem
  // schema?: URPC_SchemaField<R>
}


type NestedArray<T> = Array<T | NestedArray<T>>;
export interface URPC_Meta<R extends any = any> {
  layoutConfig?: {
    $type?: string,
    title?: string,
    filedLayout: NestedArray<keyof Item<R>>
  }
}


export interface URPC_Function<T extends any = any, VarValue extends any = any, I extends any = any, Var extends URPC_Variable = any> {
  uid: string
  type?: "func"
  name?: string
  path?: string
  confirm?: boolean
  meta?: URPC_Meta<URPC_Input<T>>
  use?: URPC_Middleware<any>[]
  input: T | ((args: Var) => T)
  func: (args: { input: URPC_Input<T>, val?: VarValue extends {} ? VarValue : undefined }) => I
  uiConfig?: (() => FormConfigType<T>) | FormConfigType<T>
  // schema?: URPC_SchemaField<R>
}

export interface URPC_Variable<
  Get extends () => any = () => any,
  VarValue extends UnwrapPromise<ReturnType<Get>> = UnwrapPromise<ReturnType<Get>>,
  M extends any = any

> {
  uid: string
  type?: "var"
  name?: string
  path?: string
  meta?: URPC_Meta<VarValue>
  get: Get
  use?: URPC_Middleware<any>[]
  value: VarValue
  schema?: URPC_SchemaField<Item<VarValue>, URPC_Variable<Get, VarValue>>
  _schema: InferSchema<Get, VarValue>
  set?: (val: VarValue) => any
}

// Improved URPC_Input type
export type URPC_Input<T> = {
  [K in keyof T]: T[K] extends (() => URPC_Class<infer G>)
  ? G
  : T[K];
};



type InferSchema<Get extends () => any, VarValue extends UnwrapPromise<ReturnType<Get>>, S = ReturnType<URPC_SchemaField<Item<VarValue>, URPC_Variable<Get, VarValue>>>>
  = Required<{
    [K in keyof S]: S[K]
  }>


export type URPC_SchemaField<R extends any = any, V extends URPC_Variable = any> = (args: { v: V, val: R, ctx: any }) => {
  [F in keyof R]?: () => URPC_Class<R[F]>
} & {
  [key: string]: (() => URPC_Class<any>) | URPC_Action<any, R, V> | URPC_Function<any, R, any, V>
}

export type URPC_Middleware<C extends any = any> = {
  filter?: (args: C) => boolean
}



export type URPC_Entity = URPC_Function<any, any, any, any> | URPC_Variable<any, any> | URPC_Schema

export type URPC_Schema = {
  [key: string]: URPC_Entity
}



export class URPC<T extends URPC_Schema = any> {
  schemas: T
  falttenSchema: URPC_Schema
  uidSchemas: URPC_Schema


  static type<T extends any = any>(get: (() => URPC_Class<T>)): () => URPC_Class<T> {
    return get
  }

  static middleware<C extends any = any>(get: URPC_Middleware<C>): URPC_Middleware<C> {
    return get
  }


  static Namespace(args: URPC_Entity): URPC_Entity {
    return args
  }


  static Var<G extends () => any, R extends UnwrapPromise<ReturnType<G>> = UnwrapPromise<ReturnType<G>>>(args: Partial<URPC_Variable<G, R>>): URPC_Variable<G, R> {
    if (!args.get) throw new Error("invalid Var params")
    const get = args.get
    //@ts-ignore
    args.get = async () => {
      const value = await get!()
      args.value = value
      return value
    }
    return { ...args, type: "var", uid: uuid(), } as URPC_Variable<G, R>
  }
  static Func<T extends any = any, R extends any = any, I extends any = any, V extends URPC_Variable = any>(args: Partial<URPC_Function<T, R, I, V>>): URPC_Function<T, R, I, V> {
    const ctx = { ...args, type: "func", uid: uuid() } as URPC_Function<T, R, I, V>
    return ctx
  }
  static Action<T extends any = any, R extends any = any, V extends URPC_Variable = any>(args: Partial<URPC_Action<T, R, V>>): URPC_Action<T, R, V> {
    return { ...args, type: "action", uid: uuid() } as URPC_Action<T, R, V>
  }




  constructor(args: Partial<URPC<T>> = {}) {
    Object.assign(this, args)
    this.falttenSchema = utils.flattenSchema(this.schemas)
    this.uidSchemas = keyby(Object.values(this.falttenSchema), "uid")
  }

  static utils = {
    async formatVar(v: URPC_Variable, ctx: any) {
      const { uid, type, get, name, meta } = v as URPC_Variable
      const value = await get()
      const _schema = v.schema ? v.schema({ val: value, v, ctx }) : {}

      const data = { uid, type, name, value, set: !!v.set, _schema, meta }
      v._schema = data._schema

      //@ts-ignore
      await URPC.utils.formatSchema(data, ctx)



      //@ts-ignore
      data.schema = data._schema
      //@ts-ignore
      data._schema = undefined


      return data
    },

    async formatFunc(f: URPC_Function, v?: URPC_Variable) {
      const { uid, type, name, func, meta } = f

      const uiConfig = typeof f.uiConfig == "function" ? await f.uiConfig() : f.uiConfig || {}
      // const _schema = typeof f.schema == "function" ? f.schema() : f.schema || {}
      //@ts-ignore
      const data = { uid, type, name, uiConfig, func, input: {}, meta } as Partial<URPC_Function>
      const input = (typeof f.input == 'function' ? await f.input(v) : f.input) || {}

      await Promise.all(Object.entries(input).map(async ([k, v]: [string, any]) => {
        const input = typeof v == "function" ? await v() : v
        //@ts-ignore
        if (!data.uiConfig[k]) {
          //@ts-ignore
          data.uiConfig[k] = {}
        }
        if (input.uiConfig) {
          //@ts-ignore
          Object.assign(data.uiConfig[k], input.uiConfig)
        }

        if (input.enums) {
          set(data, `uiConfig[${k}].selectOptions`, input.enums.map(e => ({ label: e.label ?? e, value: e.value ?? e })))
        }

        //@ts-ignore
        data.input[k] = input.default || input
      }))
      return data
    },
    async formatSchema(data: URPC_Variable, ctx: any) {
      if (data._schema) {
        let value = Array.isArray(data.value) && typeof data.value[0] == "object" ? data.value[0] : data.value
        if (data.value) {
          Object.entries(value).map(([k, v]) => {
            //@ts-ignore
            if (data._schema[k]) return
            //@ts-ignore
            data._schema[k] = { type: "type", class: typeof v, default: v }
          })
        }
        //@ts-ignore
        data._schema = (await Promise.all(Object.entries(data._schema).filter(([k, v]) => {
          //@ts-ignore
          if (v.use) {
            //@ts-ignore
            return (v.use as URPC_Middleware[]).filter(i => !!i.filter).every(i => i.filter!(ctx) == true)
          }
          return true
        }).map(async ([k, v]) => {
          if (!v) return
          let s = typeof v == "function" ? v() : v
          //@ts-ignore
          // data._schema[k] = s
          let sc = s as URPC_Class

          if (sc.enums) {
            //@ts-ignore
            set(data._schema[k], `uiConfig.selectOptions`, sc.enums.map(e => ({ label: e.label ?? e, value: e.value ?? e })))
          }


          if (s.uiConfig && typeof s.uiConfig == "function") {
            //@ts-ignore
            s.uiConfig = s.uiConfig()
          }
          //@ts-ignore
          if (s.input) {
            //@ts-ignore
            s = await URPC.utils.formatFunc(s, data)
          }
          return [k, s]
          //@ts-ignore
        }))).reduce((p, c) => {
          //@ts-ignore
          p[c[0]] = c[1]
          return p
        }, {})
      }

    }
  }


  async loadFull(params?: { namespace: string, ctx: any }) {
    return Promise.all(Object.entries(this.falttenSchema).filter(([k, v]) => {
      if (params?.namespace && !k.startsWith(params.namespace)) return
      if (v.use) {
        return (v.use as URPC_Middleware[]).filter(i => !!i.filter).every(i => i.filter!(params?.ctx) == true)
      }
      return true
    }).map(async ([k, v]) => {

      if (v.type == "func") {
        return URPC.utils.formatFunc(v as URPC_Function)
      }
      if (v.type == "var") {
        return URPC.utils.formatVar(v as URPC_Variable, params?.ctx)
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
