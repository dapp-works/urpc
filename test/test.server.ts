
import { Hono } from 'hono'
import { cors } from "hono/cors"
import { URPC } from "../src/urpc";
import { createServerClient } from '../src/client';


let data = {
  foo: 123,
  bar: "test1234"
};
// server
export const urpc = new URPC({
  schemas: {
    sum: URPC.Func({
      input: { a: 0, b: 0 },
      func: ({ input }) => input.a + input.b,
    }),
    data: URPC.Var({
      get: () => data, set: (v) => Object.assign(data, v), uiConfig: {
        foo: {
          "ui:widget": "Input"
        },
        bar: {
          "ui:widget": "Textarea",

        }
      }
    }),
    object: {
      sum1: URPC.Func({
        input: { a: 0, b: 0 },
        func: ({ input }) => input.a + input.b,
      }),
      data1: URPC.Var({ get: () => data, set: (v) => Object.assign(data, v) }),
      test: {
        sum2: URPC.Func({
          input: { a: 0, b: 0 },
          func: ({ input }) => input.a + input.b,
        }),
        data3: URPC.Var({ get: () => data.foo, set: (v) => data.foo = v }),
      }
    },

  },
});


const serverClient = createServerClient({ urpc })

const app = new Hono()
app.use(cors())
app.post('/urpc', async (c) => {
  const body = await c.req.json() as any
  const res = await serverClient.handle(body)
  return c.json(res)
})

export default app