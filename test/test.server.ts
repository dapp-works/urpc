
import { Hono } from 'hono'
import { cors } from "hono/cors"
import { URPC } from "../src/urpc";
import { createServerClient } from '../src/client';


let data = {
  foo: 123,
  bar: "test1234",
  enums: ["apple", "orange"],
};

const func1 = URPC.Func({
  input: { add_fruit: "banana" },
  func: ({ input }) => data.enums.push(input.add_fruit),
  uiConfig: {
    add_fruit: {
      selectOptions: data.enums.map(i => ({ label: i, value: i }))
    }
  }
})

let collections = [{ name: "Data1" }, { name: "Data2" }]

// server
export const urpc = new URPC({
  schemas: {
    object: {
      func1,
      sum1: URPC.Func({
        input: { a: 0, b: 0 },
        func: ({ input }) => input.a + input.b,
      }),
      data1: URPC.Var({ get: async () => data }),
      collections: URPC.Var({
        get: async () => collections,
        patch: {
        },
        schema: (val) => {
          return {
            name: {
              uiConfig: {
                "description": "test"
              }
            },
            log: URPC.Action({
              input: { i: 0 },
              func: ({ input, val }) => {
                console.log(val)
              }
            }),
            create: URPC.Func({
              input: { name: "" },
              func: ({ input, val }) => {
                collections.push({ name: input.name })
              },
            }),
          }
        }
      })
    },
  }

})


export const serverClient = createServerClient({ urpc })

const app = new Hono()
app.use(cors())
app.post('/urpc', async (c) => {
  const body = await c.req.json() as any
  const res = await serverClient.handle(body)
  return c.json(res)
})

export default app