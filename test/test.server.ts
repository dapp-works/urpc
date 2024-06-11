
import { Hono } from 'hono'
import { cors } from "hono/cors"
import { URPC } from "../src/urpc";
import { createServerClient } from '../src/client';
import { applyPatch } from 'fast-json-patch';


let data = {
  foo: 123,
  bar: "test1234",
  enums: ["apple", "orange"],
};

const func1 = URPC.Func({
  input: { add_fruit: "banana", fruits: [] },
  func: ({ input }) => data.enums.push(input.add_fruit),
  uiConfig: () => ({
    fruits: {
      selectOptions: data.enums.map(i => ({ label: i, value: i }))
    }
  })
})

const collections = [{ name: "Data1" }, { name: "Data2" }]
const collectionProxy = new Proxy(collections, {
  set(t, p: string, v) {
    console.log(`set path ${p} value ${JSON.stringify(v, null, 2)}`)
    return Reflect.set(t, p, v)
  },
  deleteProperty(t, p: string) {
    console.log(`delete path ${p}`)
    return Reflect.deleteProperty(t, p)
  }
})


// server
export const urpc = new URPC({
  schemas: {
    object: {
      func1,
      object1: {
        sum1: URPC.Func({
          input: { a: 0, b: 0 },
          func: ({ input }) => input.a + input.b,
        }),
        data1: URPC.Var({ get: () => data }),
        collections: URPC.Var({
          get: () => collectionProxy,
          uiConfig: () => {
            return {
              name: {}
            }
          }
        }),
      }
    },
  },
});


export const serverClient = createServerClient({ urpc })

const app = new Hono()
app.use(cors())
app.post('/urpc', async (c) => {
  const body = await c.req.json() as any
  const res = await serverClient.handle(body)
  return c.json(res)
})

export default app