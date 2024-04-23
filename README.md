# urpc

To install dependencies:

```bash
bun add @dappworks/urpc
```

```ts
import {
  URPC,
  createServerClient,
  createSimpleHttpClient,
} from "@dappworks/urpc";

const urpc = new URPC({
  schemas: {
    sum: URPC.Func({
      input: { a: 0, b: 0 },
      func: ({ input }) => input.a + input.b,
    }),
    foo: URPC.Var({ get: () => data.foo }),
  },
});

// server
const serverClient = createServerClient({ urpc });
const app = new Hono();
app.post("/urpc", async (c) => {
  const body = (await c.req.json()) as any;
  const res = await serverClient.handle(body);
  return c.json(res);
});

// client
const client = createSimpleHttpClient<typeof urpc.schemas>({
  url: "http://localhost:3000/urpc",
});
client.func.call();
client.var.set();
client.schema.loadFull();
client.schema.loadVars();
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
