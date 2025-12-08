import { createServer } from "node:http";
import { app } from "./app";

const port = Number(process.env.PORT ?? 3001);

const server = createServer(app);

server.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
