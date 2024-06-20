
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
let collections = [{ foo: "Data1", bool: true, enum_item: "Apple" }, { foo: "Data1", bool: true, enum_item: "Apple" }]


const fruit = URPC.type(() => ({
  enums: data.enums,
  default: "Apple",
  uiConfig: {
    required: true,
  }
}))

const test = {
  update: URPC.Func({
    input: { fruit },
    func: ({ input, val }) => {
      data = Object.assign(data, input)
    },
  }),
  test: URPC.Var({
    get: async () => data,
    schema: (val) => ({
      enum_item: fruit,
      update: URPC.Func({
        input: (ctx) => {
          const { enum_item, bool, foo, enums } = ctx._schema!
          return { enum_item, bool, foo, enums }
        },
        func: ({ input, val }) => {
          data = Object.assign(data, input)
        },
      })
    }),

  }),
}

const object = {
  sum1: URPC.Func({
    input: { a: 0, b: 0 },
    func: ({ input }) => input.a + input.b,
  }),
  collections: URPC.Var({
    get: async () => collections,
    schema: (val) => ({
      enum_item: fruit,
      update: URPC.Action({
        input: (ctx) => {
          const { enum_item, bool, foo } = ctx._schema!
          return { enum_item, bool, foo }
        },
        func: ({ input, val }) => {
          console.log(val)
        },
      }),
      create: URPC.Func({
        input: (ctx) => {
          const { enum_item, bool, foo } = ctx._schema!
          return { enum_item, bool, foo }
        },
        func: ({ input, val }) => {
          console.log({ input, val })
          return true
        }
      }),
    })
  })
}


export const urpc = new URPC({
  schemas: {
    test,
    object
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