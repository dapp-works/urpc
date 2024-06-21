
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
    schema: ({ v }) => ({
      enum_item: fruit,
      update: URPC.Func({
        input: (v) => {
          const { enum_item, bool, foo, enums } = v._schema!
          return { enum_item, bool, foo, enums }
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
    input: { a: 0, b: 0 },
    meta: {
      layoutConfig: {
        filedLayout: ['a', 'b']
      }
    },
    // use: [auth({ allow_teams: ["bd", "operator"] })],
    func: ({ input }) => input.a + input.b,
  }),
  collections: URPC.Var({
    get: async () => collections,
    meta: {
      layoutConfig: {
        filedLayout: ["bool", ["enum_item", "foo"]]
      }
    },
    schema: ({ v, val, ctx }) => ({
      enum_item: fruit,
      update: URPC.Action({
        input: () => {
          return { enum_item: fruit, }
        },
        func: ({ input, val }) => {
          console.log(val)
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