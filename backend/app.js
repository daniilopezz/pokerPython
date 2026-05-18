const { handleApi } = require("./routes/api.routes");
const { serveStatic } = require("./services/static.service");
const { parseRequestUrl, sendError } = require("./utils/http");

async function handleRequest(req, res) {
  try {
    const { pathname } = parseRequestUrl(req);
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (error) {
    sendError(res, error, req);
  }
}

module.exports = { handleRequest };
