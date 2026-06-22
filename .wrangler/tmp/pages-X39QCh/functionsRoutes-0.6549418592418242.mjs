import { onRequestGet as __septa_ts_onRequestGet } from "/Users/scottratigan/dev/septa-map/functions/septa.ts"

export const routes = [
    {
      routePath: "/septa",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__septa_ts_onRequestGet],
    },
  ]