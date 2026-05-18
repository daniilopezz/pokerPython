const DataStore = require("../data/database");

const ACTION_COLORS = {
  Fold: "oklch(0.52 0.20 25)",
  Check: "oklch(0.55 0.13 220)",
  Call: "oklch(0.42 0.04 80)",
  Raise: "oklch(0.78 0.13 82)",
  "All-in": "oklch(0.78 0.18 25)",
};

async function getSummary() {
  const [seedSessions, hands, recommendations] = await Promise.all([
    DataStore.listSessions(),
    DataStore.listHands({ includeSeed: true, limit: 250 }),
    DataStore.listRecommendations({ limit: 250 }),
  ]);

  const realHands = hands.filter((hand) => hand.source !== "seed");
  const sessions = buildSessions(seedSessions, realHands);
  const evCurve = buildEvCurve(hands);
  const actionDistribution = buildActionDistribution(hands);
  const errors = buildErrors(hands);
  const handStrength = buildHandStrength(hands);
  const recent = buildRecent(hands);

  const totalHands = sessions.reduce((sum, item) => sum + Number(item.hands || 0), 0);
  const totalEV = evCurve[evCurve.length - 1] || 0;
  const avgWin = safeAverage(sessions.map((item) => item.win));
  const avgAgg = safeAverage(sessions.map((item) => item.agg));
  const avgAlign = safeAverage(sessions.map((item) => item.align));

  return {
    metrics: {
      totalHands,
      totalEV,
      avgWin,
      avgAgg,
      avgAlign,
      savedHands: realHands.length,
      savedRecommendations: recommendations.length,
    },
    sessions,
    evCurve,
    actionDistribution,
    errors,
    handStrength,
    recent,
  };
}

function buildSessions(seedSessions, realHands) {
  if (!realHands.length) return seedSessions;
  const byDay = new Map();
  for (const hand of realHands) {
    const day = dayLabel(hand.createdAt);
    const current = byDay.get(day) || { day, hands: 0, ev: 0, wins: 0, aggressive: 0, aligned: 0 };
    current.hands += 1;
    current.ev += Number(hand.ev || 0);
    if (hand.result === "won") current.wins += 1;
    if (isAggressive(hand.heroAction)) current.aggressive += 1;
    if (hand.match === "ok" || hand.match === "approx") current.aligned += 1;
    byDay.set(day, current);
  }

  return [...byDay.values()].slice(-7).map((item) => ({
    day: item.day,
    hands: item.hands,
    ev: round1(item.ev),
    win: item.hands ? item.wins / item.hands : 0,
    agg: item.hands ? Math.round((item.aggressive / item.hands) * 100) : 0,
    align: item.hands ? Math.round((item.aligned / item.hands) * 100) : 0,
    source: "practice",
  }));
}

function buildEvCurve(hands) {
  const ordered = [...hands].reverse();
  let total = 0;
  const curve = [0];
  for (const hand of ordered) {
    total += Number(hand.ev || 0);
    curve.push(round1(total));
  }
  return curve.slice(-20);
}

function buildActionDistribution(hands) {
  const counts = new Map([
    ["Fold", 0],
    ["Check", 0],
    ["Call", 0],
    ["Raise", 0],
    ["All-in", 0],
  ]);
  for (const hand of hands) {
    const action = normalizeAction(hand.heroAction);
    counts.set(action, (counts.get(action) || 0) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0) || 1;
  return [...counts.entries()].map(([name, count]) => ({
    name,
    value: Math.round((count / total) * 100),
    color: ACTION_COLORS[name],
  }));
}

function buildErrors(hands) {
  const counts = new Map();
  for (const hand of hands) {
    for (const issue of hand.issues || []) {
      const name = issue.msg || issue.advice || "Decision mejorable";
      const current = counts.get(name) || { name, count: 0, severity: issue.severity || "baja" };
      current.count += 1;
      counts.set(name, current);
    }
  }
  const errors = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  if (errors.length) return errors;
  return [{ name: "Sin errores criticos registrados", count: 0, severity: "baja" }];
}

function buildHandStrength(hands) {
  const buckets = new Map([
    ["Premium (AA-QQ, AK)", 0],
    ["Fuerte (JJ-99, AQ-AJ)", 0],
    ["Media (88-22, KQ-KT)", 0],
    ["Suited connectors", 0],
    ["Marginal", 0],
  ]);
  for (const hand of hands) {
    const bucket = classifyHand(hand.heroHand || []);
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  return [...buckets.entries()].map(([range, count]) => ({ range, count }));
}

function buildRecent(hands) {
  return hands.slice(0, 8).map((hand) => ({
    phase: hand.phase || "Preflop",
    cards: hand.heroHand || [],
    board: hand.board || [],
    your: hand.heroAction || "Sin decision",
    ai: hand.aiAction || "AI",
    match: hand.match === "ok" ? "OK" : hand.match === "miss" ? "NO" : "≈",
    ev: `${Number(hand.ev || 0) >= 0 ? "+" : ""}${round1(Number(hand.ev || 0))}`,
  }));
}

function normalizeAction(value = "") {
  const text = String(value).toLowerCase();
  if (text.includes("all")) return "All-in";
  if (text.includes("raise") || text.includes("bet")) return "Raise";
  if (text.includes("call")) return "Call";
  if (text.includes("fold")) return "Fold";
  return "Check";
}

function isAggressive(action) {
  const normalized = normalizeAction(action);
  return normalized === "Raise" || normalized === "All-in";
}

function classifyHand(cards) {
  if (cards.length !== 2) return "Marginal";
  const ranks = cards.map((card) => card[0]);
  const suited = cards[0][1] === cards[1][1];
  const pair = ranks[0] === ranks[1];
  const values = ranks.map(rankValue).sort((a, b) => b - a);
  if ((pair && values[0] >= 10) || ranks.join("") === "AK" || ranks.join("") === "KA") return "Premium (AA-QQ, AK)";
  if ((pair && values[0] >= 7) || values[0] >= 12) return "Fuerte (JJ-99, AQ-AJ)";
  if (suited && Math.abs(values[0] - values[1]) <= 1) return "Suited connectors";
  if (pair || values[0] >= 10) return "Media (88-22, KQ-KT)";
  return "Marginal";
}

function rankValue(rank) {
  return "23456789TJQKA".indexOf(rank);
}

function safeAverage(values) {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function dayLabel(value) {
  const date = value ? new Date(value) : new Date();
  const labels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  return labels[Number.isNaN(date.getTime()) ? new Date().getDay() : date.getDay()];
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

module.exports = { getSummary };
