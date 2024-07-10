import { createSimpleHttpClient } from "../src";
import { URPC } from "../src/urpc";
import { describe, it, expect } from 'bun:test'
const client = createSimpleHttpClient({ url: "http://localhost:3000/urpc" })

describe('should', () => {
  it('export 1', async () => {
    console.log(await client.schema.loadFull())
    // not null
    expect(await client.schema.loadFull()).not.toBeNull()
  })

})