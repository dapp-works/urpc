

export interface URPC_Function<T extends Object = {}, R = any> {
    type?: "func"
    input: T
    func: (args: { input: T }) => R
}
export interface URPC_Variable<R> {
    type?: "var"
    get: R
}

export type URPC_Schema = { [key: string]: URPC_Function<any, any> | URPC_Variable<any> }

export class URPC<T extends URPC_Schema> {
    schemas: T
    static Var<R = any>(args: URPC_Variable<R>): URPC_Variable<R> {
        return { ...args, type: "var" }
    }
    static Func<T extends Object = {}, R = any>(args: URPC_Function<T, R>): URPC_Function<T, R> {
        return { ...args, type: "func" }
    }
    constructor(args: Partial<URPC<T>> = {}) {
        Object.assign(this, args)
    }


    loadFull() {
        return Object.entries(this.schemas).map(([k, v]) => {
            if (v.type == "func") {
                const { type, input } = v
                return { type, name: k, input }
            }
            if (v.type == "var") {
                const { type, get } = v
                return { type, name: k, value: get() }
            }
        })
    }

    loadVars() {
        return Object.entries(this.schemas).filter(([k, v]) => v.type == "var").map(([k, v]) => {
            const { get } = v as URPC_Variable<any>
            return { name: k, value: get() }
        })
    }
}


