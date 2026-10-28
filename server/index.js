import app from "./app.js";
import { pool } from "./db.js";
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, "127.0.0.1", () =>
  console.log(`SmartKos API http://127.0.0.1:${port}`),
);
const cleanup = setInterval(
  () =>
    pool
      .execute("DELETE FROM sessions WHERE expires_at<UTC_TIMESTAMP()")
      .catch(() => {}),
  3600000,
);
cleanup.unref();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      clearInterval(cleanup);
      await pool.end();
      process.exit(0);
    }),
  );
