// Heads-up No-Limit Hold'em poker engine shared by the browser and backend.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PokerEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const RANKS = "23456789TJQKA"; // index = strength
  const SUITS = ["s", "h", "d", "c"];

  function newDeck() {
    const d = [];
    for (const r of RANKS) for (const s of SUITS) d.push(r + s);
    // shuffle
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  function rankVal(card) {
    return RANKS.indexOf(card[0]);
  }
  function suitOf(card) {
    return card[1];
  }

  // 5-from-7 evaluator — returns numeric score (higher = better) and label.
  function evaluate7(cards) {
    // For each combination of 5 from 7, compute hand score; keep max.
    const idxs = [0, 1, 2, 3, 4, 5, 6];
    let best = null;
    const combos = combinations(idxs, 5);
    for (const c of combos) {
      const five = c.map((i) => cards[i]);
      const sc = score5(five);
      if (!best || sc.score > best.score) best = sc;
    }
    return best;
  }

  function combinations(arr, k) {
    const out = [];
    function rec(start, picked) {
      if (picked.length === k) {
        out.push(picked.slice());
        return;
      }
      for (let i = start; i < arr.length; i++) {
        picked.push(arr[i]);
        rec(i + 1, picked);
        picked.pop();
      }
    }
    rec(0, []);
    return out;
  }

  function score5(five) {
    // Counts
    const ranks = five.map(rankVal).sort((a, b) => b - a);
    const suits = five.map(suitOf);
    const countByRank = {};
    for (const r of ranks) countByRank[r] = (countByRank[r] || 0) + 1;
    const groups = Object.entries(countByRank)
      .map(([r, c]) => ({ r: +r, c }))
      .sort((a, b) => b.c - a.c || b.r - a.r);

    const flush = suits.every((s) => s === suits[0]);

    // Straight: ranks unique consecutive (Ace can be low)
    const unique = [...new Set(ranks)].sort((a, b) => b - a);
    let straightHigh = -1;
    if (unique.length >= 5) {
      for (let i = 0; i <= unique.length - 5; i++) {
        if (unique[i] - unique[i + 4] === 4) {
          straightHigh = unique[i];
          break;
        }
      }
      // wheel: A-2-3-4-5
      if (
        straightHigh === -1 &&
        unique[0] === 12 &&
        unique.includes(3) &&
        unique.includes(2) &&
        unique.includes(1) &&
        unique.includes(0)
      )
        straightHigh = 3; // 5-high straight
    }

    // category coding: cat*10^10 + tiebreakers
    let cat;
    let tb;
    if (flush && straightHigh === 12) {
      cat = 9; tb = [straightHigh];
    } else if (flush && straightHigh !== -1) {
      cat = 8; tb = [straightHigh];
    } else if (groups[0].c === 4) {
      cat = 7; tb = [groups[0].r, groups[1].r];
    } else if (groups[0].c === 3 && groups[1].c === 2) {
      cat = 6; tb = [groups[0].r, groups[1].r];
    } else if (flush) {
      cat = 5; tb = ranks;
    } else if (straightHigh !== -1) {
      cat = 4; tb = [straightHigh];
    } else if (groups[0].c === 3) {
      cat = 3; tb = [groups[0].r, ...ranks.filter((r) => r !== groups[0].r).slice(0, 2)];
    } else if (groups[0].c === 2 && groups[1].c === 2) {
      cat = 2;
      const kicker = ranks.find((r) => r !== groups[0].r && r !== groups[1].r);
      tb = [groups[0].r, groups[1].r, kicker];
    } else if (groups[0].c === 2) {
      cat = 1; tb = [groups[0].r, ...ranks.filter((r) => r !== groups[0].r).slice(0, 3)];
    } else {
      cat = 0; tb = ranks.slice(0, 5);
    }

    let score = cat * 1e10;
    let mult = 1e8;
    for (const v of tb) {
      score += v * mult;
      mult /= 100;
    }

    const labels = [
      "Carta alta",
      "Pareja",
      "Doble pareja",
      "Trío",
      "Escalera",
      "Color",
      "Full House",
      "Póker",
      "Escalera de color",
      "Escalera Real",
    ];

    return { score, cat, label: labels[cat] };
  }

  // Rough Monte-Carlo equity vs random hand (very small N for speed).
  function equityRough(hero, board, samples = 80) {
    const known = new Set([...hero, ...board]);
    let wins = 0, ties = 0;
    for (let i = 0; i < samples; i++) {
      const deck = newDeck().filter((c) => !known.has(c));
      // shuffle
      for (let k = deck.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [deck[k], deck[j]] = [deck[j], deck[k]];
      }
      const cpu = [deck[0], deck[1]];
      const needBoard = 5 - board.length;
      const fullBoard = board.concat(deck.slice(2, 2 + needBoard));
      const a = evaluate7(hero.concat(fullBoard)).score;
      const b = evaluate7(cpu.concat(fullBoard)).score;
      if (a > b) wins++;
      else if (a === b) ties++;
    }
    return (wins + ties / 2) / samples;
  }

  // Very simple CPU decision based on rough equity.
  function cpuDecide(state) {
    const { cpuHand, board, pot, toCall, cpuStack, phase, lastAction } = state;
    const eq = equityRough(cpuHand, board, 50);
    const random = Math.random();

    // If facing a bet
    if (toCall > 0) {
      if (eq < 0.3 && random < 0.85) return { action: "fold" };
      if (eq > 0.75 && random < 0.6) {
        const raise = Math.min(cpuStack, Math.round(pot * 0.7 + toCall));
        return { action: "raise", amount: raise };
      }
      return { action: "call" };
    }
    // No bet to call
    if (eq > 0.6 && random < 0.7) {
      const bet = Math.min(cpuStack, Math.round(pot * 0.6));
      return { action: "bet", amount: Math.max(bet, 20) };
    }
    if (eq > 0.45 && random < 0.4) {
      const bet = Math.min(cpuStack, Math.round(pot * 0.4));
      return { action: "bet", amount: Math.max(bet, 20) };
    }
    return { action: "check" };
  }

  // Mistake detector: very simple post-hand analyzer.
  function analyzeHand(history, eqHistory, won) {
    // history: array of {actor:'hero'|'cpu', action, amount?, phase, potBefore}
    // eqHistory: hero equity at each hero decision
    let issues = [];
    history.forEach((h, i) => {
      if (h.actor !== "hero") return;
      const eq = eqHistory[i] ?? null;
      if (eq === null) return;
      if (h.action === "raise" || h.action === "bet") {
        if (eq < 0.35 && h.amount > h.potBefore * 0.5) {
          issues.push({
            severity: "alta",
            phase: h.phase,
            msg: `Apostaste ${Math.round((h.amount/h.potBefore)*100)}% del bote en ${h.phase} con equity ${Math.round(eq*100)}%. Demasiado agresivo para una mano débil.`,
            advice: "Con manos por debajo del 35% de equity y rivales activos, es mejor pasar o tirar.",
          });
        }
      }
      if (h.action === "call" && eq < 0.25) {
        issues.push({
          severity: "media",
          phase: h.phase,
          msg: `Igualaste con equity de solo ${Math.round(eq*100)}% en ${h.phase}.`,
          advice: "El precio del bote no compensa. Foldear ahora habría sido la jugada de menor varianza.",
        });
      }
      if (h.action === "fold" && eq > 0.6) {
        issues.push({
          severity: "media",
          phase: h.phase,
          msg: `Tiraste una mano con ${Math.round(eq*100)}% de equity en ${h.phase}.`,
          advice: "Ese fold cuesta valor a largo plazo. La mano era favorita.",
        });
      }
    });
    return issues;
  }

  return { newDeck, evaluate7, equityRough, cpuDecide, analyzeHand, rankVal, suitOf, RANKS, SUITS };
});
