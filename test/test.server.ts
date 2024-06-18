
import { Hono } from 'hono'
import { cors } from "hono/cors"
import { URPC } from "../src/urpc";
import { createServerClient } from '../src/client';


let data = {
  foo: 123,
  bool: true,
  enum_item: "Apple",
  enums: ["Apple", "Banana", "Orange"],
};
let collections = [{ name: "Data1" }, { name: "Data2" }]


const fruit = URPC.enum(() => ({
  enums: data.enums,
  default: "Apple"
}))


const func1 = URPC.Func({
  input: { add_fruit: fruit },
  func: ({ input }) => {
    data.enums.push(input.add_fruit)
  },
})

const test = URPC.Namespace({
  test: URPC.Var({
    get: async () => data,
    schema: () => ({
      enum_item: {
        type: fruit
      }
    })
  }),
})

const object = URPC.Namespace({
  func1,
  sum1: URPC.Func({
    input: { a: 0, b: 0 },
    func: ({ input }) => input.a + input.b,
  }),
  collections: URPC.Var({
    get: async () => collections,
    schema: (val) => ({
      name: {
        enums: [1, 2, 3],
        required: true,
        schema: () => ({
          log: URPC.Action({
            func: ({ val }) => {
              console.log(val)
            }
          }),
          create: URPC.Func({
            input: { name: "" },
            func: ({ input, val }) => {
              collections.push({ name: input.name })
            },
          }),
        })
      },
      log: URPC.Action({
        input: { i: 0 },
        func: ({ input, val }) => {
          console.log(val)
        },
      }),
      create: URPC.Func({
        input: { name: "" },
        func: ({ input, val }) => {
          collections.push({ name: input.name })
        },
        uiConfig: {
          name: {
            required: true,
          }
        },
        schema: () => ({
          log: URPC.Action({
            input: { i: 0 },
            func: ({ input, val }) => {
              console.log(val)
            },
          }),
        })
      }),
    })
  })
})


export const urpc = new URPC({
  schemas: {
    test, object
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