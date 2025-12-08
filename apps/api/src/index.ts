import { createServer } from "node:http";
import { app } from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env.PORT ?? 3001);

const server = createServer(app);

server.listen(port, () => {
  logger.info({ port }, "API server running");
});
