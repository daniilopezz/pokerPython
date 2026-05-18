// Strategy helpers shared by the assistant UI and backend recommendation API.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PokerStrategy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function recommendAction({ hand = [], board = [], equity, position, players, potSize, toCall, stack, phase, style }) {
    if (hand.length < 2) {
      return {
        action: "-",
        sizing: null,
        reason: "Selecciona tus dos cartas para empezar.",
        risk: 0,
        strength: 0,
        alternatives: [],
      };
    }

    const eq = equity ?? 0.5;
    const potOdds = toCall > 0 ? toCall / (potSize + toCall) : 0;
    const spr = stack / Math.max(potSize, 1);

    const posMult =
      position === "BTN" ? 1.1 : position === "CO" ? 1.05 : position === "MP" ? 0.95 : position === "UTG" ? 0.9 : 1;
    const styleMult =
      style === "aggressive" ? 0.95 : style === "passive" ? 1.05 : style === "tight" ? 1.05 : style === "loose" ? 0.92 : 1;
    const playerMult = players <= 2 ? 1.05 : players === 3 ? 0.98 : players === 4 ? 0.92 : 0.85;

    const adjEq = Math.min(0.99, eq * posMult * styleMult * playerMult);

    let action;
    let sizing;
    let reason;
    let alternatives;

    if (toCall > 0) {
      if (adjEq < potOdds - 0.05) {
        action = "Fold";
        sizing = null;
        reason = `Necesitas ${Math.round(potOdds * 100)}% de equity para llamar de forma rentable; tienes ${Math.round(adjEq * 100)}%. Pagar es perder dinero a largo plazo.`;
        alternatives = ["Si lees al rival como un faroleador frecuente, el call defiende con bottom range."];
      } else if (adjEq > 0.72) {
        action = "Raise";
        const amt = Math.round(potSize * 0.7 + toCall);
        const pressure = Math.max(0, amt - toCall);
        sizing = `${amt} total (subida ≈ ${Math.round((pressure / Math.max(potSize, 1)) * 100)}% del bote)`;
        reason = `Tu mano va por delante con ${Math.round(adjEq * 100)}% de equity. Subir maximiza valor y protege contra proyectos.`;
        alternatives = ["Call si quieres ocultar la fuerza para el river.", spr < 4 ? "Considera all-in si SPR es bajo." : null].filter(Boolean);
      } else if (adjEq > 0.5) {
        action = "Call";
        sizing = `${toCall}`;
        reason = `Equity ${Math.round(adjEq * 100)}% supera el ${Math.round(potOdds * 100)}% que pide el bote. Ver una carta más es +EV.`;
        alternatives = ["Raise pequeño para ganar la iniciativa si el rival muestra debilidad."];
      } else {
        action = "Call";
        sizing = `${toCall}`;
        reason = `Equity ${Math.round(adjEq * 100)}% justo por encima del precio del bote. Llamar es marginalmente rentable.`;
        alternatives = ["Fold si la mesa es muy multiway o el rival raramente farolea."];
      }
    } else if (adjEq > 0.65) {
      action = "Raise";
      const sizingPct = phase === "preflop" ? 0.6 : 0.66;
      const amt = Math.max(20, Math.round(potSize * sizingPct));
      sizing = potSize > 0 ? `${amt} (≈ ${Math.round(sizingPct * 100)}% del bote)` : `${amt}`;
      reason = `Mano fuerte con ${Math.round(adjEq * 100)}% de equity. Apostar por valor extrae fichas de pares medios y proyectos.`;
      alternatives = ["Check si quieres trapear contra un rival muy agresivo que tomará la iniciativa por ti."];
    } else if (adjEq > 0.45) {
      action = "Check";
      sizing = null;
      reason = `Mano marginal (${Math.round(adjEq * 100)}% equity). Pasar controla el bote y deja que el rival defina.`;
      alternatives = ["Bet semi-bluff de 33% si esperas mucho fold."];
    } else {
      action = "Check";
      sizing = null;
      reason = `Equity baja (${Math.round(adjEq * 100)}%). Pasar minimiza pérdidas; apostar aquí sería un farol no rentable.`;
      alternatives = ["Fold si el rival sube. No te enamores de la mano."];
    }

    const strength = Math.round(adjEq * 100);
    const risk = action === "Fold" ? 5 : action === "Check" ? 15 : action === "Call" ? 40 : action === "Raise" ? 65 : 90;

    return { action, sizing, reason, alternatives: alternatives || [], strength, risk, adjEq, potOdds };
  }

  function rangeGuess(board = []) {
    if (board.length < 3) return ["Pares medios y altos", "Conectores suited", "Ax suited"];
    const top = board[0]?.[0] === "T" ? "10" : board[0]?.[0];
    return [`Set de ${top}`, "Top pair top kicker", "Proyecto de color", "Proyecto de escalera", "Overpair"];
  }

  return { recommendAction, rangeGuess };
});
