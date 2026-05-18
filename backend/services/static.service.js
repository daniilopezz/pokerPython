const fs = require("node:fs/promises");
const path = require("node:path");
const zlib = require("node:zlib");
const config = require("../config/app.config");
const { methodNotAllowed, notFound } = require("../utils/errors");
const { setBaseHeaders } = require("../utils/http");
const gzip = require("node:util").promisify(zlib.gzip);

const pageFiles = new Set([
  "aprende.html",
  "ranking.html",
  "practicar.html",
  "asistente.html",
  "dashboard.html",
  "trailer.html",
  "terminos.html",
  "privacidad.html",
  "juego-responsable.html",
  "contacto.html",
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") throw methodNotAllowed(req.method, ["GET", "HEAD"]);

  const target = resolveStaticTarget(pathname);
  if (!target) throw notFound();

  let stat;
  try {
    stat = await fs.stat(target.filePath);
  } catch {
    throw notFound();
  }
  if (!stat.isFile()) throw notFound();

  const etag = makeEtag(stat);
  setBaseHeaders(res, req);
  res.setHeader("ETag", etag);
  res.setHeader("Last-Modified", stat.mtime.toUTCString());
  if (req.headers["if-none-match"] === etag) {
    res.statusCode = 304;
    res.end();
    return;
  }

  const type = contentTypes[path.extname(target.filePath)] || "application/octet-stream";
  const shouldGzip = req.method !== "HEAD" && isTextType(type) && String(req.headers["accept-encoding"] || "").includes("gzip");
  const rawBody = req.method === "HEAD" ? null : await fs.readFile(target.filePath);
  const body = rawBody && shouldGzip ? await gzip(rawBody) : rawBody;

  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Length", body ? body.length : stat.size);
  if (shouldGzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Vary", appendVary(res.getHeader("Vary"), "Accept-Encoding"));
  }
  if (target.cacheControl) res.setHeader("Cache-Control", target.cacheControl);
  if (body) res.end(body);
  else res.end();
}

function resolveStaticTarget(pathname) {
  const cleanPath = decodeURIComponent(pathname);
  if (cleanPath.includes("\0")) return null;

  if (cleanPath === "/" || cleanPath === "" || cleanPath === "/index.html") {
    return safeJoin(config.rootDir, "index.html");
  }

  const pageName = cleanPath.replace(/^\//, "");
  if (pageFiles.has(pageName)) return safeJoin(config.pagesDir, pageName);

  if (cleanPath.startsWith("/assets/")) {
    return safeJoin(config.assetsDir, cleanPath.slice("/assets/".length), "public, max-age=3600");
  }

  if (cleanPath.startsWith("/src/")) {
    return safeJoin(config.frontendSrcDir, cleanPath.slice("/src/".length));
  }

  if (cleanPath.startsWith("/shared/")) {
    return safeJoin(config.sharedDir, cleanPath.slice("/shared/".length));
  }

  return null;
}

function safeJoin(root, relativePath, cacheControl = null) {
  const filePath = path.resolve(root, relativePath);
  const rootPath = path.resolve(root);
  if (!filePath.startsWith(rootPath + path.sep) && filePath !== rootPath) return null;
  return { filePath, cacheControl };
}

function makeEtag(stat) {
  return `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
}

function isTextType(type) {
  return type.startsWith("text/") || type.includes("javascript") || type.includes("json") || type.includes("svg");
}

function appendVary(current, value) {
  if (!current) return value;
  const parts = String(current).split(",").map((item) => item.trim().toLowerCase());
  return parts.includes(value.toLowerCase()) ? current : `${current}, ${value}`;
}

module.exports = { serveStatic };
