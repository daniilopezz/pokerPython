const http = require("node:http");
const { host, port } = require("./config/app.config");
const { handleRequest } = require("./app");

const server = http.createServer(handleRequest);

server.listen(port, host, () => {
  console.log(`Solver Poker listo en http://${host}:${port}`);
});

server.on("error", (error) => {
  process.stderr.write(`[FATAL] No se pudo iniciar el servidor: ${error.message}\n`);
  process.exit(1);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
}
