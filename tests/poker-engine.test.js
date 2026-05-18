const assert = require("node:assert/strict");
const { test } = require("node:test");
const PokerEngine = require("../shared/poker/engine");
const PokerStrategy = require("../shared/poker/strategy");

test("hand evaluator ranks royal flush above full house", () => {
  const royal = PokerEngine.evaluate7(["Ah", "Kh", "Qh", "Jh", "Th", "2c", "3d"]);
  const fullHouse = PokerEngine.evaluate7(["As", "Ad", "Ac", "Ks", "Kd", "2h", "3c"]);

  assert.equal(royal.label, "Escalera Real");
  assert.equal(fullHouse.label, "Full House");
  assert.ok(royal.score > fullHouse.score);
});

test("hand evaluator supports wheel straight", () => {
  const result = PokerEngine.evaluate7(["Ah", "2d", "3s", "4c", "5h", "9d", "Kd"]);

  assert.equal(result.label, "Escalera");
});

test("strategy raise sizing explains additional pressure when facing a call", () => {
  const recommendation = PokerStrategy.recommendAction({
    hand: ["Ah", "Kh"],
    board: ["7h", "2d", "Th"],
    equity: 0.82,
    position: "BTN",
    players: 2,
    potSize: 120,
    toCall: 40,
    stack: 900,
    phase: "flop",
    style: "balanced",
  });

  assert.equal(recommendation.action, "Raise");
  assert.match(recommendation.sizing, /total/);
  assert.doesNotMatch(recommendation.sizing, /103%/);
});
