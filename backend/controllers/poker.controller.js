const {
  validateAnalyzePayload,
  validateEquityPayload,
  validateRecommendationPayload,
  validateSavedHandPayload,
} = require("../schemas/poker.schema");
const PokerService = require("../services/poker.service");

function equity(payload) {
  const input = validateEquityPayload(payload);
  return PokerService.calculateEquity(input);
}

async function recommendation(payload) {
  const input = validateRecommendationPayload(payload);
  return PokerService.buildRecommendation(input);
}

function analyzeHand(payload) {
  const input = validateAnalyzePayload(payload);
  return PokerService.analyzeHand(input);
}

async function saveHand(payload) {
  const input = validateSavedHandPayload(payload);
  return PokerService.saveHand(input);
}

async function hands() {
  return PokerService.listHands();
}

async function recommendations() {
  return PokerService.listRecommendations();
}

async function rooms() {
  return PokerService.listRooms();
}

module.exports = { analyzeHand, equity, hands, recommendation, recommendations, rooms, saveHand };
