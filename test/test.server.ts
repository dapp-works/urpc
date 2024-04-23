
import { Hono } from 'hono'
import { URPC } from "../src/urpc";
import { createServerClient } from '../src/client';


let data = {
    foo: 123,
};
// server
export const urpc = new URPC({
    schemas: {
        sum: URPC.Func({
            input: { a: 0, b: 0 },
            func: ({ input }) => input.a + input.b,
        }),
        data: URPC.Var({ get: () => data, set: (v) => Object.assign(data, v) }),
    },
});

const serverClient = createServerClient({ urpc })

const app = new Hono()
app.post('/urpc', async (c) => {
    const body = await c.req.json() as any
    const res = await serverClient.handle(body)
    return c.json(res)
})

export default app