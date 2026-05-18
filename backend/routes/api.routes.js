const DashboardController = require("../controllers/dashboard.controller");
const HealthController = require("../controllers/health.controller");
const PokerController = require("../controllers/poker.controller");
const { methodNotAllowed, notFound } = require("../utils/errors");
const { readJson, sendData, sendJson } = require("../utils/http");
const { rateLimit } = require("../utils/rate-limit");

async function handleApi(req, res, pathname) {
  rateLimit(req, pathname);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, null, req);
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendData(res, HealthController.health(), 200, req);
    return;
  }

  if (req.method === "GET" && pathname === "/api/dashboard/summary") {
    sendData(res, await DashboardController.summary(), 200, req);
    return;
  }

  if (req.method === "GET" && pathname === "/api/poker/rooms") {
    sendData(res, await PokerController.rooms(), 200, req);
    return;
  }

  if (req.method === "GET" && pathname === "/api/poker/hands") {
    sendData(res, await PokerController.hands(), 200, req);
    return;
  }

  if (req.method === "GET" && pathname === "/api/poker/recommendations") {
    sendData(res, await PokerController.recommendations(), 200, req);
    return;
  }

  if (pathname === "/api/poker/equity") {
    if (req.method !== "POST") throw methodNotAllowed(req.method, ["POST"]);
    sendData(res, PokerController.equity(await readJson(req)), 200, req);
    return;
  }

  if (pathname === "/api/poker/recommendation") {
    if (req.method !== "POST") throw methodNotAllowed(req.method, ["POST"]);
    sendData(res, await PokerController.recommendation(await readJson(req)), 200, req);
    return;
  }

  if (pathname === "/api/poker/analyze-hand") {
    if (req.method !== "POST") throw methodNotAllowed(req.method, ["POST"]);
    sendData(res, PokerController.analyzeHand(await readJson(req)), 200, req);
    return;
  }

  if (pathname === "/api/poker/hands") {
    if (req.method !== "POST") throw methodNotAllowed(req.method, ["POST"]);
    sendData(res, await PokerController.saveHand(await readJson(req)), 201, req);
    return;
  }

  throw notFound("Endpoint API no encontrado");
}

module.exports = { handleApi };
