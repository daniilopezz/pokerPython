const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const isProduction = process.env.NODE_ENV === "production";
const defaultDataFile = path.join(rootDir, "data", "solver-poker-store.json");
const dataFile = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : defaultDataFile;

function csvEnv(name, fallback = "") {
  return String(process.env[name] || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  appName: "Solver Poker",
  isProduction,
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  jsonLimitBytes: 1_000_000,
  corsOrigins: csvEnv("CORS_ORIGIN", isProduction ? "" : "*"),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120),
  rateLimitPokerMaxRequests: Number(process.env.RATE_LIMIT_POKER_MAX_REQUESTS || 40),
  rootDir,
  dataDir: path.dirname(dataFile),
  dataFile,
  frontendDir: path.join(rootDir, "frontend"),
  pagesDir: path.join(rootDir, "frontend", "pages"),
  assetsDir: path.join(rootDir, "frontend", "assets"),
  frontendSrcDir: path.join(rootDir, "frontend", "src"),
  sharedDir: path.join(rootDir, "shared"),
};
