import { type ServerClientType, type URPC_Schema } from "@dappworks/urpc";
import { PartySocket, type PartySocketOptions } from "partysocket";

export const createPartikyClient = <T extends URPC_Schema>(args: PartySocketOptions) => {
  const socket = new PartySocket(args);

  socket.binaryType = "arraybuffer";
  const createHandler = <Prefix extends string>(prefix: Prefix) => ({
    get(target: any, prop: string) {
      return async (params: any) => {
        const requestBody = {
          name: `${prefix}.${prop}`,
          params,
        };

        return new Promise((resolve, reject) => {

          socket.addEventListener("message", e => {
            resolve(JSON.parse(e.data))
          });

          socket.addEventListener("error", (event: Event) => {
            reject(event);
          });

          socket.send(JSON.stringify(requestBody));
        });
      };
    }
  });

  return {
    schema: new Proxy<ServerClientType<any, T>['schema']>({} as any, createHandler("schema")),
    func: new Proxy<ServerClientType<any, T>['func']>({} as any, createHandler("func")),
    var: new Proxy<ServerClientType<any, T>['var']>({} as any, createHandler("var")),
  };
};