const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");

process.env.DATA_FILE = path.join(os.tmpdir(), `solver-poker-test-${process.pid}.json`);

const { handleRequest } = require("../backend/app");

function dispatch({ method = "GET", url = "/", body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const rawBody = body == null ? null : JSON.stringify(body);
    const req = new Readable({
      read() {
        if (rawBody) this.push(rawBody);
        this.push(null);
      },
    });
    req.method = method;
    req.url = url;
    req.headers = {
      host: "test.local",
      ...(rawBody ? { "content-type": "application/json" } : {}),
      ...headers,
    };

    const chunks = [];
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        this.body = Buffer.concat(chunks).toString("utf8");
        resolve(this);
      },
    };

    Promise.resolve(handleRequest(req, res)).catch(reject);
  });
}

function jsonBody(response) {
  return response.body ? JSON.parse(response.body) : null;
}

// ─── Health ──────────────────────────────────────────────────────────────────

test("health endpoint responds", async () => {
  const response = await dispatch({ url: "/api/health" });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.status, "ok");
  assert.ok(typeof payload.data.timestamp === "string");
});

// ─── Equity ──────────────────────────────────────────────────────────────────

test("equity endpoint validates and calculates cards", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/equity",
    body: { hand: ["Ah", "Kh"], board: ["Qh", "Jh", "2c"], samples: 20 },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.hand.join(","), "Ah,Kh");
  assert.equal(payload.data.samples, 20);
  assert.equal(typeof payload.data.equity, "number");
  assert.ok(payload.data.equity >= 0 && payload.data.equity <= 1);
});

test("equity endpoint rejects invalid card format", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/equity",
    body: { hand: ["Xx", "Kh"], board: [] },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 400);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "BAD_REQUEST");
});

test("equity endpoint rejects wrong method", async () => {
  const response = await dispatch({ method: "GET", url: "/api/poker/equity" });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 405);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "METHOD_NOT_ALLOWED");
});

// ─── Recommendation ──────────────────────────────────────────────────────────

test("recommendation endpoint returns valid action", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/recommendation",
    body: {
      hand: ["Ah", "Kh"],
      board: ["7h", "2d", "Th"],
      players: 3,
      position: "BTN",
      potSize: 120,
      toCall: 40,
      stack: 960,
      style: "balanced",
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(["Fold", "Call", "Raise", "Check"].includes(payload.data.recommendation.action));
  assert.ok(typeof payload.data.equity === "number");
});

test("recommendation endpoint rejects duplicated cards", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/recommendation",
    body: {
      hand: ["Ah", "Ah"],
      board: [],
      players: 2,
      position: "BTN",
      potSize: 100,
      toCall: 0,
      stack: 900,
      phase: "preflop",
      style: "balanced",
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 400);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "BAD_REQUEST");
});

// ─── Analyze hand ─────────────────────────────────────────────────────────────

test("analyze-hand endpoint detects no issues on clean play", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/analyze-hand",
    body: {
      history: [
        { actor: "hero", action: "call", amount: 40, phase: "preflop", potBefore: 20 },
        { actor: "cpu", action: "check", amount: 0, phase: "flop", potBefore: 80 },
        { actor: "hero", action: "bet", amount: 60, phase: "flop", potBefore: 80 },
      ],
      eqHistory: [0.72, 0.65, 0.70],
      won: true,
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.data.issues));
  assert.ok(typeof payload.data.totalIssues === "number");
});

test("analyze-hand endpoint detects aggressive bet with low equity", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/analyze-hand",
    body: {
      history: [
        { actor: "hero", action: "bet", amount: 200, phase: "flop", potBefore: 100 },
      ],
      eqHistory: [0.20],
      won: false,
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(payload.data.totalIssues >= 1);
  assert.ok(payload.data.issues[0].severity === "alta");
});

test("analyze-hand endpoint rejects invalid history", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/analyze-hand",
    body: { history: "not-an-array", eqHistory: [], won: null },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 400);
  assert.equal(payload.ok, false);
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

test("dashboard summary returns all required fields", async () => {
  const response = await dispatch({ url: "/api/dashboard/summary" });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.data.sessions));
  assert.ok(Array.isArray(payload.data.evCurve));
  assert.ok(Array.isArray(payload.data.actionDistribution));
  assert.ok(Array.isArray(payload.data.errors));
  assert.ok(Array.isArray(payload.data.handStrength));
  assert.ok(Array.isArray(payload.data.recent));
  assert.ok(typeof payload.data.metrics === "object");
});

test("rooms endpoint returns ranking data from the store", async () => {
  const response = await dispatch({ url: "/api/poker/rooms" });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(Array.isArray(payload.data));
  assert.ok(payload.data.length >= 3);
  assert.equal(payload.data[0].rank, 1);
  assert.ok(payload.data[0].metrics.score > 0);
});

test("save hand endpoint persists a practice hand", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/hands",
    body: {
      heroHand: ["Ah", "Kh"],
      cpuHand: ["Qs", "Qd"],
      board: ["7h", "2d", "Th", "Qh", "3s"],
      history: [{ actor: "hero", action: "call", amount: 40, phase: "flop", potBefore: 120 }],
      eqHistory: [0.68],
      phase: "River",
      pot: 220,
      result: "won",
      winner: "hero",
      heroBest: "Color",
      cpuBest: "Trio",
      heroAction: "Call 40",
      aiAction: "Call",
      match: "ok",
      ev: 22,
      issues: [],
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.source, "practice");
  assert.equal(payload.data.heroHand.join(","), "Ah,Kh");

  const listResponse = await dispatch({ url: "/api/poker/hands" });
  const listPayload = jsonBody(listResponse);
  assert.ok(listPayload.data.some((hand) => hand.id === payload.data.id));
});

test("recommendation endpoint can persist saved recommendations", async () => {
  const response = await dispatch({
    method: "POST",
    url: "/api/poker/recommendation",
    body: {
      hand: ["As", "Ks"],
      board: [],
      players: 2,
      position: "BTN",
      potSize: 30,
      toCall: 10,
      stack: 900,
      phase: "preflop",
      style: "balanced",
      samples: 10,
      persist: true,
    },
  });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.ok(payload.data.saved.id);

  const listResponse = await dispatch({ url: "/api/poker/recommendations" });
  const listPayload = jsonBody(listResponse);
  assert.ok(listPayload.data.some((item) => item.id === payload.data.saved.id));
});

// ─── Static files ─────────────────────────────────────────────────────────────

test("frontend pages are served from the backend handler", async () => {
  const response = await dispatch({ url: "/asistente.html" });

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /assistant-root/);
  assert.match(response.body, /api-client/);
});

test("index page is served at root path", async () => {
  const response = await dispatch({ url: "/" });

  assert.equal(response.statusCode, 200);
  assert.match(response.body, /Solver/);
});

test("unknown route returns 404", async () => {
  const response = await dispatch({ url: "/api/does-not-exist" });
  const payload = jsonBody(response);

  assert.equal(response.statusCode, 404);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, "NOT_FOUND");
});

test("security headers are present", async () => {
  const response = await dispatch({ url: "/api/health" });

  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-frame-options"], "DENY");
  assert.ok(response.headers["referrer-policy"]);
  assert.ok(response.headers["content-security-policy"]);
  assert.ok(response.headers["permissions-policy"]);
});
