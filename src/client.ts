import type { URPC_Function, URPC_Variable, URPC, URPC_Schema } from "./index"
import get from "lodash.get"


export const createSimpleHttpClient = <T extends URPC_Schema>(args: { url: string }) => {
  return {
    schema: {
      async loadFull(params?: Parameters<URPC<T>["loadFull"]>[0]): Promise<ReturnType<URPC<T>["loadFull"]>> {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "schema.loadFull",
            params,
          })
        }).then(res => res.json())
      },
      async loadVars(params?: Parameters<URPC<T>["loadVars"]>[0]): Promise<ReturnType<URPC<T>["loadVars"]>> {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "schema.loadVars",
            params
          })
        }).then(res => res.json())
      }
    },
    func: {
      async call<R extends keyof T>(params: {
        method: R, input: Partial<T[R] extends URPC_Function<infer Z, any> ? Z : never>
      }): Promise<T[R] extends URPC_Function<any, infer Z> ? Z : never> {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "func.call",
            params
          })
        }).then(res => res.json())
      },

    },
    var: {
      async set<R extends keyof T, V extends T[R] extends URPC_Variable<infer Z> ? Z : never>(params: { name: R, value: ReturnType<V> }) {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "var.set",
            params
          })
        }).then(res => res.json())
      },
      async action(params: { name: string, action: string, value: any, input?: any }) {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "var.action",
            params
          })
        }).then(res => res.json())
      },
      async call<R extends keyof T>(params: {
        name: string,
        method: R, input: Partial<T[R] extends URPC_Function<infer Z, any> ? Z : never>
      }): Promise<T[R] extends URPC_Function<any, infer Z> ? Z : never> {
        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "var.call",
            params
          })
        }).then(res => res.json())
      },
    }
  }
}

export const createServerClient = <T extends URPC_Schema>({ urpc }: { urpc: URPC<T> }) => {
  const client = {
    urpc,
    handle({ name, params }: { name: string, params: Record<string, any> }) {
      const func = get(client, name)
      // console.log(name, params)
      if (!func) {
        throw new Error("invalid name")
      }
      return func(params)
    },
    schema: {
      async loadFull(params: Parameters<URPC<T>["loadFull"]>[0]) {
        return urpc.loadFull(params)
      },
      async loadVars(params?: Parameters<URPC<T>["loadFull"]>[0]) {
        return urpc.loadVars(params)
      }
    },
    func: {
      async call(params: { method: string, input: Record<string, any> }) {
        const ufunc = (urpc.uidSchemas[params.method] || urpc.falttenSchema[params.method]) as URPC_Function
        if (!ufunc) {
          throw new Error("invalid func name")
        }
        return ufunc.func(params)
      }
    },
    var: {
      async set(params: { name: string, value: any }) {
        const uvar = (urpc.uidSchemas[params.name] || urpc.falttenSchema[params.name]) as URPC_Variable
        if (!uvar) {
          throw new Error("invalid var name")
        }
        if (!uvar.set) {
          throw new Error("variable can't be set")
        }
        return uvar.set(params.value)
      },

      async action(params: { name: string, action: string, value: any, input?: any }) {
        const uvar = (urpc.uidSchemas[params.name] || urpc.falttenSchema[params.name]) as URPC_Variable
        if (!uvar) {
          throw new Error("invalid var name")
        }
        const action = uvar._schema![params.action]
        if (!action) {
          throw new Error("invalid action name")
        }
        //@ts-ignore
        return action.func({ ...params, val: params.value })
      },
      async call(params: { name: string, method: string, value: any, input?: any, }) {
        const uvar = (urpc.uidSchemas[params.name] || urpc.falttenSchema[params.name]) as URPC_Variable
        if (!uvar) {
          throw new Error("invalid var name")
        }
        const func = uvar._schema![params.method]
        if (!func) {
          throw new Error("invalid func name")
        }
        params.value = uvar.value
        //@ts-ignore
        return func.func({ ...params, val: uvar.value })
      },
    }
  }

  return client
}











