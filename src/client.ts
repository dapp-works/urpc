import type { URPC_Schema } from "../dist"
import type { URPC_Function, URPC_Variable, URPC } from "./index"



export const createSimpleHttpClient = (args: { url: string }) => {
    return {
        schema: {
            async loadFull(): Promise<ReturnType<URPC<any>["loadFull"]>> {
                return fetch(`${args.url}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "schema.loadFull",
                    })
                }).then(res => res.json())
            },
            async loadVars(): Promise<ReturnType<URPC<any>["loadVars"]>> {
                return fetch(`${args.url}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "schema.loadVars",
                    })
                }).then(res => res.json())
            }
        },
        func: {
            async call(params: { method: string, input: Record<string, any> }) {
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
            async overwrite(params: { name: string, value: any }) {
                return fetch(`${args.url}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "var.overwrite",
                        params
                    })
                }).then(res => res.json())
            },
            async patch(params: { name: string, value: any }) {
                return fetch(`${args.url}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "var.patch",
                        params
                    })
                }).then(res => res.json())
            }
        }
    }
}

export const createServerClient = <T extends URPC_Schema>({ urpc }: { urpc: URPC<T> }) => {
    return {
        urpc,
        schema: {
            async loadFull() {
                return urpc.loadFull()
            },
            async loadVars() {
                return urpc.loadVars()
            }
        },
        func: {
            async call(params: { method: string, input: Record<string, any> }) {
                const ufunc = urpc.schemas[params.method] as URPC_Function
                if (!ufunc) {
                    throw new Error("invalid func name")
                }
                return ufunc.func({ input: params.input })
            }
        },
        var: {
            async overwrite(params: { name: string, value: any }) {
                const uvar = urpc.schemas[params.name] as URPC_Variable
                if (!uvar) {
                    throw new Error("invalid var name")
                }
                if (!uvar.set) {
                    throw new Error("variable can't be set")
                }
                return uvar.set({ value: params.value })
            },
            async patch(params: { name: string, value: any }) {
                throw new Error("TBD")
            }
        }
    }
}











