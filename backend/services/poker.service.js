const PokerEngine = require("../../shared/poker/engine");
const PokerStrategy = require("../../shared/poker/strategy");
const DataStore = require("../data/database");

function calculateEquity({ hand, board, samples }) {
  const equity = PokerEngine.equityRough(hand, board, samples);
  return {
    hand,
    board,
    samples,
    equity,
    percent: Math.round(equity * 1000) / 10,
  };
}

async function buildRecommendation(input) {
  const { equity } = calculateEquity(input);
  const recommendation = PokerStrategy.recommendAction({ ...input, equity });

  const payload = {
    hand: input.hand,
    board: input.board,
    context: {
      players: input.players,
      position: input.position,
      potSize: input.potSize,
      toCall: input.toCall,
      stack: input.stack,
      phase: input.phase,
      style: input.style,
    },
    samples: input.samples,
    equity,
    percent: Math.round(equity * 1000) / 10,
    recommendation,
    opponentRange: PokerStrategy.rangeGuess(input.board),
  };

  if (input.persist) {
    payload.saved = await DataStore.addRecommendation(payload);
  }

  return payload;
}

function analyzeHand({ history, eqHistory, won }) {
  const issues = PokerEngine.analyzeHand(history, eqHistory, won);
  return {
    issues,
    totalIssues: issues.length,
    severity: summarizeSeverity(issues),
  };
}

function summarizeSeverity(issues) {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    { alta: 0, media: 0, baja: 0 }
  );
}

async function saveHand(hand) {
  const computedIssues = PokerEngine.analyzeHand(
    hand.history || [],
    hand.eqHistory || [],
    hand.result === "won" ? true : hand.result === "lost" ? false : null
  );
  const issues = hand.issues?.length ? hand.issues : computedIssues;
  return DataStore.addHand({
    ...hand,
    issues,
    totalIssues: issues.length,
    severity: summarizeSeverity(issues),
  });
}

async function listHands() {
  return DataStore.listHands({ includeSeed: true, limit: 50 });
}

async function listRecommendations() {
  return DataStore.listRecommendations({ limit: 50 });
}

async function listRooms() {
  return DataStore.listRooms();
}

module.exports = {
  analyzeHand,
  buildRecommendation,
  calculateEquity,
  listHands,
  listRecommendations,
  listRooms,
  saveHand,
};
