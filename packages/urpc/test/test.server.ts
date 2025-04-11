
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
  default: "Banana",
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
    schema: ({ v }) => ({
      enum_item: fruit,
      update: URPC.Func({
        input: () => {
          const { enum_item, bool, foo, enums } = v._schema
          return { enum_item, bool: fruit, foo, enums }
        },
        func: ({ input, val }) => {
          data = Object.assign(data, input)
        },
      })
    }),

  }),
}

const auth = (args: { allow_teams: string[] }) => URPC.middleware<Context>({
  filter: ctx => !!ctx.user.isSuperAdmin || !!ctx.user.teams?.some(i => args.allow_teams.includes(i))
})


const object = {
  sum1: URPC.Func({
    input: { a: "text text text text text text text text text text text text text text text text text text text text text text text text text text text text ", b: 0 },
    // use: [auth({ allow_teams: ["bd", "operator"] })],
    func: ({ input }) => input.a + input.b,
    uiConfig() {
      return {
        a: {
          description: "test desc",
        }
      }
    },
  }),
  collections: URPC.Var({
    get: async () => collections,
    schema: ({ v, val }) => ({
      enum_item: fruit,
      update: URPC.Action({
        // use: [auth({ allow_teams: ["bd", "operator"] })],
        input: () => {
          const { enum_item, bool, foo } = v._schema
          return { enum_item: fruit, bool, foo, test: 1 }
        },
        func: ({ input, val }) => {
          input.enum_item
          input.foo
          input.test
        },
      }),
      create: URPC.Func({
        // use: [auth({ allow_teams: ["bd", "operator"] })],
        input: () => {
          const { enum_item, bool, foo } = v._schema
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
export type Context = {
  user: {
    isSuperAdmin?: boolean
    teams?: string[]
  }
}

export const serverClient = createServerClient<Context>({ urpc })

const app = new Hono()
app.use(cors())
app.post('/urpc', async (c) => {
  const body = await c.req.json() as any
  // TODO: decode jwt token 
  const ctx: Context = {
    user: {
      // isSuperAdmin: true,
      // teams: ["bd", "operator"]
    }
  }
  const res = await serverClient.handle(body, ctx)
  return c.json(res)
})

export default app