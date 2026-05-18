const { badRequest } = require("../utils/errors");

const RANKS = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]);
const SUITS = new Set(["s", "h", "d", "c"]);
const POSITIONS = new Set(["BTN", "CO", "MP", "UTG", "SB", "BB"]);
const STYLES = new Set(["balanced", "aggressive", "passive", "tight", "loose"]);
const PHASES = new Set(["preflop", "flop", "turn", "river"]);
const ACTIONS = new Set(["fold", "check", "call", "bet", "raise", "allin"]);

function normalizeCard(value, field) {
  if (typeof value !== "string") throw badRequest(`${field} debe ser una carta valida`);
  const trimmed = value.trim();
  const match = trimmed.match(/^(10|[2-9TJQKA])([shdc])$/i);
  if (!match) throw badRequest(`${field} debe tener formato de carta valido`, { received: value, example: "Ah" });

  const rank = match[1].toUpperCase() === "10" ? "T" : match[1].toUpperCase();
  const suit = match[2].toLowerCase();
  if (!RANKS.has(rank) || !SUITS.has(suit)) throw badRequest(`${field} no es una carta valida`);
  return `${rank}${suit}`;
}

function normalizeCards(value, field, { exact, min = 0, max = 52 } = {}) {
  if (!Array.isArray(value)) throw badRequest(`${field} debe ser un array de cartas`);
  if (exact != null && value.length !== exact) throw badRequest(`${field} debe contener exactamente ${exact} cartas`);
  if (value.length < min || value.length > max) throw badRequest(`${field} debe contener entre ${min} y ${max} cartas`);
  return value.map((card, index) => normalizeCard(card, `${field}[${index}]`));
}

function assertNoDuplicates(cards) {
  const seen = new Set();
  for (const card of cards) {
    if (seen.has(card)) throw badRequest("No se permiten cartas duplicadas", { card });
    seen.add(card);
  }
}

function numberField(payload, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, defaultValue } = {}) {
  const raw = payload[field] ?? defaultValue;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw badRequest(`${field} debe ser un numero valido`);
  if (integer && !Number.isInteger(value)) throw badRequest(`${field} debe ser un numero entero`);
  if (value < min || value > max) throw badRequest(`${field} debe estar entre ${min} y ${max}`);
  return value;
}

function enumField(payload, field, allowed, defaultValue) {
  const value = payload[field] ?? defaultValue;
  if (!allowed.has(value)) {
    throw badRequest(`${field} tiene un valor no soportado`, { received: value, allowed: [...allowed] });
  }
  return value;
}

function validateSamples(payload, defaultValue = 120) {
  return numberField(payload, "samples", { min: 1, max: 1000, integer: true, defaultValue });
}

function validateEquityPayload(payload) {
  const hand = normalizeCards(payload.hand, "hand", { exact: 2 });
  const board = normalizeCards(payload.board || [], "board", { max: 5 });
  assertNoDuplicates([...hand, ...board]);
  return { hand, board, samples: validateSamples(payload, 160) };
}

function validateRecommendationPayload(payload) {
  const hand = normalizeCards(payload.hand, "hand", { exact: 2 });
  const board = normalizeCards(payload.board || [], "board", { max: 5 });
  assertNoDuplicates([...hand, ...board]);

  return {
    hand,
    board,
    players: numberField(payload, "players", { min: 2, max: 9, integer: true, defaultValue: 2 }),
    position: enumField(payload, "position", POSITIONS, "BTN"),
    potSize: numberField(payload, "potSize", { min: 0, max: 1_000_000, defaultValue: 0 }),
    toCall: numberField(payload, "toCall", { min: 0, max: 1_000_000, defaultValue: 0 }),
    stack: numberField(payload, "stack", { min: 0, max: 1_000_000, defaultValue: 0 }),
    phase: enumField(payload, "phase", PHASES, inferPhase(board)),
    style: enumField(payload, "style", STYLES, "balanced"),
    samples: validateSamples(payload, 200),
    persist: payload.persist === true,
  };
}

function validateAnalyzePayload(payload) {
  if (!Array.isArray(payload.history)) throw badRequest("history debe ser un array");
  if (!Array.isArray(payload.eqHistory)) throw badRequest("eqHistory debe ser un array");

  const history = payload.history.map((item, index) => {
    if (!item || typeof item !== "object") throw badRequest(`history[${index}] debe ser un objeto`);
    const actor = item.actor;
    if (actor !== "hero" && actor !== "cpu") throw badRequest(`history[${index}].actor no es valido`);
    if (!ACTIONS.has(item.action)) throw badRequest(`history[${index}].action no es valida`);
    const amount = Number(item.amount || 0);
    const potBefore = Number(item.potBefore || 0);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) throw badRequest(`history[${index}].amount no es valido`);
    if (!Number.isFinite(potBefore) || potBefore < 0 || potBefore > 1_000_000) throw badRequest(`history[${index}].potBefore no es valido`);
    const phase = String(item.phase || "preflop");
    if (!PHASES.has(phase) && phase !== "showdown") throw badRequest(`history[${index}].phase no es valida`);
    return {
      actor,
      action: item.action,
      amount,
      phase,
      potBefore,
    };
  });

  const eqHistory = payload.eqHistory.map((value, index) => {
    const eq = Number(value);
    if (!Number.isFinite(eq) || eq < 0 || eq > 1) throw badRequest(`eqHistory[${index}] debe estar entre 0 y 1`);
    return eq;
  });

  return { history, eqHistory, won: payload.won === true ? true : payload.won === false ? false : null };
}

function validateSavedHandPayload(payload) {
  const heroHand = normalizeCards(payload.heroHand, "heroHand", { exact: 2 });
  const cpuHand = payload.cpuHand ? normalizeCards(payload.cpuHand, "cpuHand", { exact: 2 }) : [];
  const board = normalizeCards(payload.board || [], "board", { max: 5 });
  assertNoDuplicates([...heroHand, ...cpuHand, ...board]);

  const history = Array.isArray(payload.history)
    ? validateAnalyzePayload({
        history: payload.history,
        eqHistory: Array.isArray(payload.eqHistory) ? payload.eqHistory : [],
        won: payload.result === "won" ? true : payload.result === "lost" ? false : null,
      }).history
    : [];

  const eqHistory = Array.isArray(payload.eqHistory)
    ? payload.eqHistory.map((value, index) => {
        const eq = Number(value);
        if (!Number.isFinite(eq) || eq < 0 || eq > 1) throw badRequest(`eqHistory[${index}] debe estar entre 0 y 1`);
        return eq;
      })
    : [];

  return {
    heroHand,
    cpuHand,
    board,
    history,
    eqHistory,
    phase: String(payload.phase || inferPhase(board)),
    pot: numberField(payload, "pot", { min: 0, max: 1_000_000, defaultValue: 0 }),
    result: enumString(payload.result, "result", new Set(["won", "lost", "tie"]), "tie"),
    winner: enumString(payload.winner, "winner", new Set(["hero", "cpu", "tie"]), "tie"),
    heroBest: textField(payload.heroBest, "heroBest", 80, ""),
    cpuBest: textField(payload.cpuBest, "cpuBest", 80, ""),
    heroAction: textField(payload.heroAction, "heroAction", 80, lastHeroAction(history)),
    aiAction: textField(payload.aiAction, "aiAction", 80, "AI"),
    match: enumString(payload.match, "match", new Set(["ok", "miss", "approx"]), "approx"),
    ev: boundedNumber(payload.ev, "ev", -1_000_000, 1_000_000, 0),
    issues: normalizeIssues(payload.issues),
  };
}

function enumString(value, field, allowed, defaultValue) {
  const normalized = value == null || value === "" ? defaultValue : String(value);
  if (!allowed.has(normalized)) throw badRequest(`${field} tiene un valor no soportado`, { received: value, allowed: [...allowed] });
  return normalized;
}

function textField(value, field, maxLength, defaultValue = "") {
  const text = value == null ? defaultValue : String(value).trim();
  if (text.length > maxLength) throw badRequest(`${field} supera la longitud maxima`);
  return text;
}

function boundedNumber(value, field, min, max, defaultValue = 0) {
  const number = Number(value ?? defaultValue);
  if (!Number.isFinite(number) || number < min || number > max) throw badRequest(`${field} debe estar entre ${min} y ${max}`);
  return number;
}

function normalizeIssues(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((issue, index) => {
    if (!issue || typeof issue !== "object") throw badRequest(`issues[${index}] debe ser un objeto`);
    return {
      severity: enumString(issue.severity, `issues[${index}].severity`, new Set(["alta", "media", "baja"]), "baja"),
      phase: textField(issue.phase, `issues[${index}].phase`, 20, "preflop"),
      msg: textField(issue.msg, `issues[${index}].msg`, 240, ""),
      advice: textField(issue.advice, `issues[${index}].advice`, 320, ""),
    };
  });
}

function lastHeroAction(history) {
  const last = [...history].reverse().find((item) => item.actor === "hero");
  if (!last) return "Sin decision";
  return `${last.action}${last.amount ? ` ${last.amount}` : ""}`;
}

function inferPhase(board) {
  if (board.length === 0) return "preflop";
  if (board.length <= 3) return "flop";
  if (board.length === 4) return "turn";
  return "river";
}

module.exports = {
  normalizeCard,
  validateAnalyzePayload,
  validateEquityPayload,
  validateRecommendationPayload,
  validateSavedHandPayload,
};
