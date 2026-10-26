import { isServer, QueryClient } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** The tab's one client, made on the first render in the browser. */
let browserQueryClient: QueryClient | undefined;

/**
 * The query cache the providers hand down: a fresh one for each page the server renders, so no
 * request's reads reach another's page, and one for the tab's life in the browser.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
