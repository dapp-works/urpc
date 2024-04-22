# urpc

To install dependencies:

```bash
bun add @dappworks/urpc
```

```ts
import URPC from "@dappworks/urpc";

const urpc = new URPC({
  schemas: {
    sum: URPC.Func({
      input: { a: 0, b: 0 },
      func: ({ input }) => input.a + input.b,
    }),
    foo: URPC.Var({ get: () => data.foo }),
  },
});

urpc.loadFull();
urpc.loadVars();
urpc.schemas.sum.func({ input: { a: 1, b: 2 } });
urpc.schemas.foo.get();
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
