import { createSimpleHttpClient } from "../src/client";
import type { urpc } from "./test.server";
import { describe, it, expect } from 'bun:test'


const client = createSimpleHttpClient<typeof urpc.schemas>({ url: "http://localhost:3000/urpc" })


describe('should', () => {
    it('export 3', async () => {
        console.log(await client.func.call({
            method: "sum", input: { a: 1, b: 2 }
        }))
        expect(await client.func.call({
            method: "sum", input: { a: 1, b: 2 }
        })).toBe(3)
    })

})