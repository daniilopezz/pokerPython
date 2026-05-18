const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { dataDir, dataFile } = require("../config/app.config");
const { createSeedStore } = require("./seed-data");

let initPromise = null;
let writeQueue = Promise.resolve();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureStore() {
  if (!initPromise) {
    initPromise = (async () => {
      await fs.mkdir(dataDir, { recursive: true });
      try {
        await fs.access(dataFile);
      } catch {
        await writeStore(createSeedStore());
      }
    })();
  }
  return initPromise;
}

async function readStore() {
  await ensureStore();
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeStore(parsed);
  } catch (error) {
    const backup = `${dataFile}.corrupt-${Date.now()}`;
    try {
      await fs.rename(dataFile, backup);
    } catch {}
    const fresh = createSeedStore();
    await writeStore(fresh);
    return fresh;
  }
}

async function writeStore(store) {
  const next = normalizeStore(store);
  next.updatedAt = new Date().toISOString();
  const tmp = path.join(dataDir, `.solver-poker-store-${process.pid}-${Date.now()}.tmp`);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, dataFile);
}

function normalizeStore(store) {
  return {
    version: Number(store?.version || 1),
    createdAt: store?.createdAt || new Date().toISOString(),
    updatedAt: store?.updatedAt || new Date().toISOString(),
    sessions: Array.isArray(store?.sessions) ? store.sessions : [],
    hands: Array.isArray(store?.hands) ? store.hands : [],
    recommendations: Array.isArray(store?.recommendations) ? store.recommendations : [],
    rooms: Array.isArray(store?.rooms) ? store.rooms : [],
  };
}

async function updateStore(mutator) {
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  });
  return writeQueue;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function listSessions() {
  const store = await readStore();
  return clone(store.sessions);
}

async function listHands({ includeSeed = true, limit = 100 } = {}) {
  const store = await readStore();
  return clone(store.hands)
    .filter((hand) => includeSeed || hand.source !== "seed")
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, limit);
}

async function listRecommendations({ limit = 100 } = {}) {
  const store = await readStore();
  return clone(store.recommendations)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, limit);
}

async function listRooms() {
  const store = await readStore();
  return clone(store.rooms).sort((a, b) => Number(a.rank) - Number(b.rank));
}

async function addHand(hand) {
  return updateStore((store) => {
    const now = new Date().toISOString();
    const record = {
      id: createId("hand"),
      createdAt: now,
      source: "practice",
      ...hand,
    };
    store.hands.push(record);
    return clone(record);
  });
}

async function addRecommendation(recommendation) {
  return updateStore((store) => {
    const now = new Date().toISOString();
    const record = {
      id: createId("rec"),
      createdAt: now,
      source: "assistant",
      ...recommendation,
    };
    store.recommendations.push(record);
    if (store.recommendations.length > 500) {
      store.recommendations = store.recommendations.slice(-500);
    }
    return clone(record);
  });
}

module.exports = {
  addHand,
  addRecommendation,
  listHands,
  listRecommendations,
  listRooms,
  listSessions,
  readStore,
};
