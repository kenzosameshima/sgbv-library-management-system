import app from "./app";
import { closePool } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { SHUTDOWN_TIMEOUT_MS } from "./utils/constants";

const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, "SGB MVP listening");
});

let shuttingDown = false;

/** Stop accepting connections, let in-flight requests finish, then release the database pool. */
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");

  const forceExit = setTimeout(() => {
    logger.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((closeError) => {
    closePool()
      .catch((poolError: unknown) => logger.error({ err: poolError }, "Failed to close the database pool"))
      .finally(() => process.exit(closeError ? 1 : 0));
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
