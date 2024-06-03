import { createSimpleHttpClient } from "../src/client";
import { type urpc } from "./test.server";
import { describe, it, expect } from 'bun:test'


const client = createSimpleHttpClient<typeof urpc.schemas>({ url: "http://localhost:3000/urpc" })


describe('should', () => {

  it('', async () => {
    expect((await client.var.patch({
      name: "data", ops: [{ op: "replace", path: "/foo", value: 456 }]
    })).foo).toBe(456)
  })

})