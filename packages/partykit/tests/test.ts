import { createPartikyClient } from "../src";


const client = createPartikyClient({ host: "localhost:1999" })

client.schema.loadFull().then(console.log)