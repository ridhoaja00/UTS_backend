import "../server/index.js";
import { createServer } from "vite";
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const server = await createServer({
  configFile: "client/vite.config.js",
  server: {
    host: value("--host", "127.0.0.1"),
    port: Number(value("--port", "5173")),
    strictPort: true,
  },
});
await server.listen();
server.printUrls();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
