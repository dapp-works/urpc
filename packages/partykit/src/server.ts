import { createServerClient, URPC } from "@dappworks/urpc";
import type * as Party from "partykit/server";


export default class Server implements Party.Server {
  urpc = new URPC({
    schemas: {
      sum: URPC.Func({
        input: { a: 0, b: 0 },
        // use: [auth({ allow_teams: ["bd", "operator"] })],
        func: ({ input }) => input.a + input.b,
      }),
    }
  })
  client = createServerClient({ urpc: this.urpc })

  constructor(readonly room: Party.Room) { }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // A websocket just connected!
    console.log(
      `Connected:
  id: ${conn.id}
  room: ${this.room.id}
  url: ${new URL(ctx.request.url).pathname}`
    );
  }


  async onMessage(message: string, sender: Party.Connection) {
    console.log(`connection ${sender.id} sent message: ${message}`);
    const msg = JSON.parse(message)
    const res = await this.client.handle(msg)
    console.log(res)
    sender.send(JSON.stringify(res))
  }


}

Server satisfies Party.Worker;
