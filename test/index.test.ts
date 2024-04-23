import { URPC } from "../src/urpc";
import { describe, it, expect } from 'bun:test'

let data = {
    foo: 123,
};

const urpc = new URPC({
    schemas: {
        sum: URPC.Func({
            input: { a: 0, b: 0 },
            func: ({ input }) => input.a + input.b,
        }),
        data: URPC.Var({ get: () => data, set: (v) => Object.assign(data, v) }),
    },
});




describe('should', () => {
    it('export 1', () => {
        expect(urpc.schemas.sum.func({ input: { a: 1, b: 2 } })).toBe(3)
    })

    it('export 2', () => {
        data.foo++
        expect(urpc.schemas.data.get().foo).toBe(124)
    })
})