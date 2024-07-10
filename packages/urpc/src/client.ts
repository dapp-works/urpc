import type { URPC_Function, URPC_Variable, URPC, URPC_Schema } from "./index"
import get from "lodash.get"


export type ServerClientType<C, T extends URPC_Schema> = ReturnType<typeof createServerClient<C, T>>;

export const createSimpleHttpClient = <T extends URPC_Schema>(args: { url: string }) => {
  const createHandler = <Prefix extends string>(prefix: Prefix) => ({
    get(target: any, prop: string) {
      return async (params: any) => {
        const requestBody = {
          name: `${prefix}.${prop}`,
          params,
        };

        return fetch(`${args.url}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }).then(res => res.json());
      };
    }
  });

  return {
    schema: new Proxy<ServerClientType<any, T>['schema']>({} as any, createHandler("schema")),
    func: new Proxy<ServerClientType<any, T>['func']>({} as any, createHandler("func")),
    var: new Proxy<ServerClientType<any, T>['var']>({} as any, createHandler("var")),
  };
};

export const createServerClient = <C extends any = any, T extends URPC_Schema = URPC_Schema>({ urpc }: { urpc: URPC<T> }) => {
  const client = {
    urpc,
    handle({ name, params = {} }: { name: string, params: Record<string, any> }, ctx?: C) {
      const func = get(client, name)
      // console.log(name, params)
      if (!func) {
        throw new Error("invalid name")
      }
      params.ctx = ctx
      return func(params, ctx)
    },
    schema: {
      async loadFull(...params: Parameters<URPC<T>["loadFull"]>) {
        return urpc.loadFull(...params)
      },
      async loadVars(...params: Parameters<URPC<T>["loadFull"]>) {
        return urpc.loadVars(...params)
      }
    },
    func: {
      async call(params: { method: string, input: Record<string, any> }) {
        const ufunc = (urpc.uidSchemas[params.method] || urpc.falttenSchema[params.method]) as URPC_Function
        if (!ufunc) {
          throw new Error("invalid func name")
        }
        return ufunc.func(params) ?? { ok: true }
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
        return action.func({ ...params, val: params.value }) ?? { ok: true }
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
        return func.func({ ...params, val: uvar.value }) ?? { ok: true }
      },
    }
  }

  return client
}











