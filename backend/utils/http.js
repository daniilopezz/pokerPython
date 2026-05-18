const { corsOrigins, isProduction, jsonLimitBytes } = require("../config/app.config");
const { AppError, badRequest } = require("./errors");

function setBaseHeaders(res, req = null) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://unpkg.com 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");

  const origin = getAllowedOrigin(req);
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  if (origin && origin !== "*") res.setHeader("Vary", appendVary(res.getHeader("Vary"), "Origin"));
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
}

function sendJson(res, statusCode, payload, req = null) {
  setBaseHeaders(res, req);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (statusCode === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function sendData(res, data, statusCode = 200, req = null) {
  sendJson(res, statusCode, { ok: true, data }, req);
}

function sendError(res, error, req = null) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : "Error interno del servidor";
  const code = error instanceof AppError ? error.code : "INTERNAL_SERVER_ERROR";
  const details = error instanceof AppError ? error.details : null;

  if (statusCode >= 500) {
    process.stderr.write(`[ERROR] ${new Date().toISOString()} ${error.stack || error.message}\n`);
  }

  sendJson(res, statusCode, {
    ok: false,
    error: { code, message, ...(details ? { details } : {}) },
  }, req);
}

function parseRequestUrl(req) {
  return new URL(req.url, `http://${req.headers.host || "localhost"}`);
}

function readJson(req, limitBytes = jsonLimitBytes) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      reject(badRequest("El cuerpo debe enviarse como application/json"));
      return;
    }

    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > limitBytes) {
        req.destroy();
        reject(badRequest("El cuerpo de la peticion supera el limite permitido"));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(badRequest("JSON invalido"));
      }
    });
    req.on("error", reject);
  });
}

function getAllowedOrigin(req) {
  if (!req) return corsOrigins.includes("*") ? "*" : null;
  const origin = req.headers.origin;
  if (!origin) return corsOrigins.includes("*") ? "*" : null;
  if (corsOrigins.includes("*")) return "*";
  return corsOrigins.includes(origin) ? origin : null;
}

function appendVary(current, value) {
  if (!current) return value;
  const parts = String(current).split(",").map((item) => item.trim().toLowerCase());
  return parts.includes(value.toLowerCase()) ? current : `${current}, ${value}`;
}

module.exports = { parseRequestUrl, readJson, sendData, sendError, sendJson, setBaseHeaders };
