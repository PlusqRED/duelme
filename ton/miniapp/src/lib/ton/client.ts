// TON HTTP client singleton. We use `@ton/ton`'s `TonClient` against Toncenter
// for both reads and (indirectly) writes. Writes still flow through TON Connect
// to the user's wallet — the client is only used to invoke `runMethod` for the
// contract's getters and to fetch transaction history.

import { TonClient } from "@ton/ton";
import { config } from "../constants";

let client: TonClient | null = null;

export function getTonClient(): TonClient {
  if (client) {
    return client;
  }
  client = new TonClient({
    endpoint: config.toncenterUrl,
    apiKey: config.toncenterApiKey || undefined,
  });
  return client;
}
