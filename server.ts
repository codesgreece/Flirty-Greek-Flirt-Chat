import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { attachRealtime } from "./src/server/realtime/hub";
import { getEnv } from "./src/lib/env";

async function main() {
  const env = getEnv();
  if (env.NODE_ENV === "production" && env.SESSION_SECRET.includes("dev-only")) {
    throw new Error("SESSION_SECRET must be replaced before running in production.");
  }
  const dev = env.NODE_ENV !== "production";
  const app = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();
  const server = createServer((req, res) => {
    const parsed = parse(req.url || "/", true);
    void handle(req, res, parsed);
  });
  attachRealtime(server);
  server.listen(env.PORT, () => {
    console.log(`FLIRTY ready on ${env.APP_URL}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
