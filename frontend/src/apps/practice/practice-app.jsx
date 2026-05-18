// Practice table — heads-up vs CPU. Uses window.PokerEngine and SolverApi.
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const SUIT_GLYPH = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_RED = { h: true, d: true, s: false, c: false };

function PlayingCard({ code, size = "md", hidden = false, dealing = false, delay = 0 }) {
  if (hidden) {
    return (
      <div
        className={`card-3d back ${size === "sm" ? "card-sm" : size === "xs" ? "card-xs" : ""}`}
        style={dealing ? { animation: `dealIn 0.45s cubic-bezier(.2,.8,.2,1) ${delay}s backwards` } : null}
      />
    );
  }
  if (!code)
    return (
      <div className={`card-empty ${size === "sm" ? "card-sm" : size === "xs" ? "card-xs" : ""}`}>
        <span>?</span>
      </div>
    );
  const r = code[0] === "T" ? "10" : code[0];
  const suit = code[1];
  const red = SUIT_RED[suit];
  return (
    <div
      className={`card-3d ${red ? "red" : ""} ${size === "sm" ? "card-sm" : size === "xs" ? "card-xs" : ""}`}
      style={dealing ? { animation: `dealIn 0.45s cubic-bezier(.2,.8,.2,1) ${delay}s backwards` } : null}
    >
      <div className="corner tl">
        <span className="rank">{r}</span>
        <span className="suit">{SUIT_GLYPH[suit]}</span>
      </div>
      <div className="pip">{SUIT_GLYPH[suit]}</div>
      <div className="corner br">
        <span className="rank">{r}</span>
        <span className="suit">{SUIT_GLYPH[suit]}</span>
      </div>
    </div>
  );
}

function ChipStack({ amount }) {
  if (!amount) return null;
  // Build stack from denominations
  const denoms = [1000, 500, 100, 25];
  const colors = { 1000: "chip-black", 500: "chip-gold", 100: "chip-blue", 25: "chip-red" };
  const stacks = [];
  let remaining = amount;
  for (const d of denoms) {
    const count = Math.min(4, Math.floor(remaining / d));
    if (count > 0) {
      stacks.push({ d, count });
      remaining -= count * d;
    }
  }
  if (stacks.length === 0) stacks.push({ d: 25, count: 1 });
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", justifyContent: "center" }}>
      {stacks.map((s, i) => (
        <div key={i} style={{ position: "relative", width: 30, height: 30 + s.count * 4 }}>
          {Array.from({ length: s.count }).map((_, j) => (
            <div
              key={j}
              className={`chip ${colors[s.d]}`}
              style={{
                position: "absolute",
                left: 0,
                bottom: j * 4,
                width: 30,
                height: 30,
                fontSize: 9,
                borderWidth: 2,
              }}
            >
              <span>{s.d >= 1000 ? s.d / 1000 + "K" : s.d}</span>
            </div>
          ))}
        </div>
      ))}
      <div
        style={{
          marginLeft: 8,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 12,
          color: "var(--gold)",
        }}
      >
        {amount}
      </div>
    </div>
  );
}

const PHASE_NAMES = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
};

function PracticeApp() {
  const STARTING_STACK = 1000;
  const SB = 5;
  const BB = 10;

  const [state, setState] = useState(null);
  const [log, setLog] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [betSliderValue, setBetSliderValue] = useState(BB * 2);
  // Refs avoid stale closure issues in generateFeedback (not rendered, no UI dependency)
  const historyRef = useRef([]);
  const eqHistoryRef = useRef([]);
  const [showdownVisible, setShowdownVisible] = useState(false);
  const [currentEquity, setCurrentEquity] = useState(null);

  const logRef = useRef(null);

  function pushLog(line) {
    setLog((l) => [...l, line]);
  }

  function newHand() {
    const deck = window.PokerEngine.newDeck();
    const heroHand = [deck.pop(), deck.pop()];
    const cpuHand = [deck.pop(), deck.pop()];
    setShowdownVisible(false);
    setFeedback(null);
    historyRef.current = [];
    eqHistoryRef.current = [];
    const s = {
      deck,
      heroHand,
      cpuHand,
      board: [],
      pot: SB + BB,
      heroStack: STARTING_STACK - BB,
      cpuStack: STARTING_STACK - SB,
      heroBet: BB,
      cpuBet: SB,
      phase: "preflop",
      turn: "cpu", // BB acts last preflop, so SB (cpu) acts first
      lastAggressor: null,
      handOver: false,
      winner: null,
      heroIsBB: true,
    };
    setState(s);
    setLog([
      { tag: "system", text: "Nueva mano · Heads-up · NL10" },
      { tag: "system", text: `Blinds: SB ${SB} / BB ${BB}` },
    ]);
    setBetSliderValue(BB * 2);
    setTimeout(() => takeTurnIfCPU(s), 700);
  }

  useEffect(() => {
    newHand();
  }, []);

  // Recompute equity for hero whenever board/hand changes during play.
  useEffect(() => {
    if (!state || state.handOver) return;
    const eq = window.PokerEngine.equityRough(state.heroHand, state.board, 60);
    setCurrentEquity(eq);
  }, [state?.board?.length, state?.heroHand?.join(""), state?.handOver]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const toCallHero = state ? Math.max(0, state.cpuBet - state.heroBet) : 0;
  const toCallCPU = state ? Math.max(0, state.heroBet - state.cpuBet) : 0;

  function advanceStreet(s) {
    // Reset bets, deal next street, hero acts next (out of position is cpu, hero in BB acts last preflop only)
    let next = { ...s };
    next.pot += next.heroBet + next.cpuBet;
    next.heroBet = 0;
    next.cpuBet = 0;
    next.lastAggressor = null;

    if (s.phase === "preflop") {
      next.phase = "flop";
      next.board = [s.deck.pop(), s.deck.pop(), s.deck.pop()];
      pushLog({ tag: "system", text: `FLOP: ${next.board.join(" ")}` });
    } else if (s.phase === "flop") {
      next.phase = "turn";
      next.board = [...s.board, s.deck.pop()];
      pushLog({ tag: "system", text: `TURN: ${next.board[3]}` });
    } else if (s.phase === "turn") {
      next.phase = "river";
      next.board = [...s.board, s.deck.pop()];
      pushLog({ tag: "system", text: `RIVER: ${next.board[4]}` });
    } else if (s.phase === "river") {
      // showdown
      return runShowdown(next);
    }
    // In heads-up: hero is BB so hero acts first post-flop
    next.turn = "hero";
    return next;
  }

  function runShowdown(s) {
    const heroBest = window.PokerEngine.evaluate7([...s.heroHand, ...s.board]);
    const cpuBest = window.PokerEngine.evaluate7([...s.cpuHand, ...s.board]);
    let winner;
    let won;
    if (heroBest.score > cpuBest.score) {
      winner = "hero";
      won = true;
    } else if (heroBest.score < cpuBest.score) {
      winner = "cpu";
      won = false;
    } else {
      winner = "tie";
      won = null;
    }
    const next = { ...s, phase: "showdown", handOver: true, winner, heroBest, cpuBest };
    if (winner === "hero") {
      next.heroStack += s.pot;
      pushLog({ tag: "system", text: `Ganas ${s.pot} con ${heroBest.label}.` });
    } else if (winner === "cpu") {
      next.cpuStack += s.pot;
      pushLog({ tag: "system", text: `CPU gana ${s.pot} con ${cpuBest.label}.` });
    } else {
      next.heroStack += Math.floor(s.pot / 2);
      next.cpuStack += Math.ceil(s.pot / 2);
      pushLog({ tag: "system", text: `Empate. Bote dividido.` });
    }
    setShowdownVisible(true);
    setTimeout(() => generateFeedback(next, won), 400);
    return next;
  }

  async function generateFeedback(finalState, won) {
    let issues;
    try {
      if (window.SolverApi) {
        const result = await window.SolverApi.analyzeHand({
          history: historyRef.current,
          eqHistory: eqHistoryRef.current,
          won,
        });
        issues = result.issues;
      } else {
        issues = window.PokerEngine.analyzeHand(historyRef.current, eqHistoryRef.current, won);
      }
    } catch {
      issues = window.PokerEngine.analyzeHand(historyRef.current, eqHistoryRef.current, won);
    }
    const heroLabel = finalState.heroBest?.label;
    const cpuLabel = finalState.cpuBest?.label;
    let summary;
    let recommendation;
    if (won === true) {
      summary = `Has ganado el bote con ${heroLabel} frente al ${cpuLabel} del rival. Buen resultado.`;
      recommendation = issues.length === 0
        ? "Tu línea coincide bastante con la teoría: presión cuando el equity te respalda, contención cuando no. Mantén ese ritmo."
        : "Aunque el resultado fue favorable, hay decisiones mejorables. Repasa los puntos de abajo — ganar una mano no valida una línea débil.";
    } else if (won === false) {
      summary = `Pierdes contra ${cpuLabel}. Tu mejor mano fue ${heroLabel}.`;
      recommendation = issues.length > 0
        ? "El resultado es duro, pero hay aprendizajes claros."
        : "Mala suerte de varianza: tus decisiones fueron sólidas dada la información disponible. A largo plazo este tipo de líneas son rentables.";
    } else {
      summary = "Empate al showdown. El bote se divide.";
      recommendation = "Cuando dos manos chocan así, lo importante no es el resultado sino la línea de cada calle.";
    }
    const nextFeedback = { summary, recommendation, issues, heroBest: finalState.heroBest, cpuBest: finalState.cpuBest };
    setFeedback(nextFeedback);
    persistCompletedHand(finalState, won, nextFeedback);
  }

  async function persistCompletedHand(finalState, won, nextFeedback) {
    if (!window.SolverApi?.saveHand) return;
    const lastHero = [...historyRef.current].reverse().find((item) => item.actor === "hero");
    const lastCpu = [...historyRef.current].reverse().find((item) => item.actor === "cpu");
    const result = won === true ? "won" : won === false ? "lost" : "tie";
    const pot = finalState.pot + (finalState.heroBet || 0) + (finalState.cpuBet || 0);
    const ev = result === "won" ? pot / 10 : result === "lost" ? -pot / 10 : 0;

    try {
      await window.SolverApi.saveHand({
        heroHand: finalState.heroHand,
        cpuHand: finalState.cpuHand,
        board: finalState.board,
        history: historyRef.current,
        eqHistory: eqHistoryRef.current.filter((value) => value != null),
        phase: PHASE_NAMES[finalState.phase] || finalState.phase,
        pot,
        result,
        winner: finalState.winner,
        heroBest: finalState.heroBest?.label || "",
        cpuBest: finalState.cpuBest?.label || "",
        heroAction: formatStoredAction(lastHero),
        aiAction: formatStoredAction(lastCpu) || "CPU",
        match: nextFeedback.issues.length === 0 ? "ok" : nextFeedback.issues.length === 1 ? "approx" : "miss",
        ev,
        issues: nextFeedback.issues,
      });
      pushLog({ tag: "ai", text: "Mano guardada para el dashboard." });
    } catch (error) {
      pushLog({ tag: "ai", text: `No se pudo guardar la mano: ${error.message || "error de API"}.` });
    }
  }

  function formatStoredAction(item) {
    if (!item) return "";
    const label = item.action === "allin" ? "All-in" : item.action.charAt(0).toUpperCase() + item.action.slice(1);
    return `${label}${item.amount ? ` ${item.amount}` : ""}`;
  }

  function endHandByFold(s, folder) {
    const next = { ...s, handOver: true, phase: "showdown" };
    if (folder === "hero") {
      next.winner = "cpu";
      next.cpuStack += s.pot + s.cpuBet + s.heroBet;
      pushLog({ tag: "cpu", text: `CPU gana el bote (${s.pot + s.cpuBet + s.heroBet}). Te retiras.` });
    } else {
      next.winner = "hero";
      next.heroStack += s.pot + s.cpuBet + s.heroBet;
      pushLog({ tag: "hero", text: `Ganas el bote (${s.pot + s.cpuBet + s.heroBet}). CPU se retira.` });
    }
    setShowdownVisible(false);
    setTimeout(() => generateFeedback(next, folder !== "hero"), 400);
    return next;
  }

  // Hero action handlers
  function heroAct(action, amount = 0) {
    if (!state || state.turn !== "hero" || state.handOver) return;
    const s = { ...state };
    const potBefore = s.pot + s.heroBet + s.cpuBet;
    const eq = currentEquity;
    historyRef.current = [...historyRef.current, { actor: "hero", action, amount, phase: s.phase, potBefore }];
    eqHistoryRef.current = [...eqHistoryRef.current, eq];

    if (action === "fold") {
      pushLog({ tag: "hero", text: `Te retiras (fold).` });
      setState(endHandByFold(s, "hero"));
      return;
    }
    if (action === "check") {
      pushLog({ tag: "hero", text: `Check.` });
      // If both players acted with no bet → advance street
      if (s.cpuBet === s.heroBet && s.lastAggressor === null) {
        // Cpu has already acted with check this street if its bet equals ours and no aggressor
        // We're hero acting after cpu's check, so we close the round.
        const next = advanceStreet(s);
        setState(next);
        setTimeout(() => takeTurnIfCPU(next), 800);
        return;
      }
      // otherwise pass turn to cpu
      s.turn = "cpu";
      setState(s);
      setTimeout(() => takeTurnIfCPU(s), 800);
      return;
    }
    if (action === "call") {
      const need = Math.max(0, s.cpuBet - s.heroBet);
      const pay = Math.min(need, s.heroStack);
      s.heroStack -= pay;
      s.heroBet += pay;
      pushLog({ tag: "hero", text: `Call ${pay}.` });
      // Round closes after call
      const closed = advanceStreet(s);
      setState(closed);
      setTimeout(() => takeTurnIfCPU(closed), 900);
      return;
    }
    if (action === "raise" || action === "bet" || action === "allin") {
      let raiseTo = amount;
      if (action === "allin") raiseTo = s.heroStack + s.heroBet;
      const callPart = Math.max(0, s.cpuBet - s.heroBet);
      const extra = Math.max(callPart, raiseTo - s.heroBet);
      const pay = Math.min(extra, s.heroStack);
      s.heroStack -= pay;
      s.heroBet += pay;
      s.lastAggressor = "hero";
      pushLog({
        tag: "hero",
        text: `${action === "raise" ? "Raise" : action === "bet" ? "Bet" : "All-in"} a ${s.heroBet}.`,
      });
      s.turn = "cpu";
      setState(s);
      setTimeout(() => takeTurnIfCPU(s), 800);
      return;
    }
  }

  function takeTurnIfCPU(s) {
    if (!s || s.handOver || s.turn !== "cpu") return;
    const toCall = Math.max(0, s.heroBet - s.cpuBet);
    const decision = window.PokerEngine.cpuDecide({
      cpuHand: s.cpuHand,
      board: s.board,
      pot: s.pot + s.heroBet + s.cpuBet,
      toCall,
      cpuStack: s.cpuStack,
      phase: s.phase,
      lastAction: s.lastAggressor,
    });

    const ns = { ...s };
    if (decision.action === "fold") {
      pushLog({ tag: "cpu", text: `CPU se retira.` });
      setState(endHandByFold(ns, "cpu"));
      return;
    }
    if (decision.action === "check") {
      pushLog({ tag: "cpu", text: `CPU pasa (check).` });
      if (ns.cpuBet === ns.heroBet && ns.lastAggressor === null && ns.phase !== "preflop") {
        // postflop: cpu acts first → action returns to hero
        ns.turn = "hero";
        setState(ns);
        return;
      }
      if (ns.cpuBet === ns.heroBet && ns.lastAggressor === null && ns.phase === "preflop") {
        // preflop SB completed (call), and BB checks option — round closes via heroAct check
        ns.turn = "hero";
        setState(ns);
        return;
      }
      // Otherwise close street and continue
      const next = advanceStreet(ns);
      setState(next);
      setTimeout(() => takeTurnIfCPU(next), 800);
      return;
    }
    if (decision.action === "call") {
      const pay = Math.min(toCall, ns.cpuStack);
      ns.cpuStack -= pay;
      ns.cpuBet += pay;
      pushLog({ tag: "cpu", text: `CPU iguala (${pay}).` });
      // Round closes
      const closed = advanceStreet(ns);
      setState(closed);
      setTimeout(() => takeTurnIfCPU(closed), 900);
      return;
    }
    if (decision.action === "bet" || decision.action === "raise") {
      const target = Math.min(decision.amount, ns.cpuStack + ns.cpuBet);
      const pay = target - ns.cpuBet;
      ns.cpuStack -= pay;
      ns.cpuBet = target;
      ns.lastAggressor = "cpu";
      pushLog({ tag: "cpu", text: `CPU ${decision.action === "bet" ? "apuesta" : "sube"} a ${ns.cpuBet}.` });
      ns.turn = "hero";
      setState(ns);
      return;
    }
  }

  if (!state) return null;

  const potTotal = state.pot + state.heroBet + state.cpuBet;
  const heroEqPct = currentEquity != null ? Math.round(currentEquity * 100) : null;
  const showCpuCards = state.handOver && state.winner !== null && state.winner !== "tie" ? (state.phase === "showdown" && showdownVisible) : state.handOver && state.winner === "tie";

  return (
    <div className="table-wrap">
      {/* TABLE */}
      <div>
        <div className="poker-table">
          <div className="logo">Solver · Demo Table</div>

          {/* CPU SEAT */}
          <div className={`seat seat-cpu ${state.turn === "cpu" && !state.handOver ? "turn" : ""}`}>
            <div className="hand">
              {state.handOver && (state.winner === "cpu" || state.winner === "tie" || state.winner === "hero") && state.phase === "showdown" ? (
                <>
                  <PlayingCard code={state.cpuHand[0]} size="sm" />
                  <PlayingCard code={state.cpuHand[1]} size="sm" />
                </>
              ) : (
                <>
                  <PlayingCard hidden size="sm" />
                  <PlayingCard hidden size="sm" />
                </>
              )}
            </div>
            <div className="avatar">C</div>
            <div className="name-tag">
              <span className="nm">CPU · Niko-AI</span>
              <span className="st">{state.cpuStack}</span>
            </div>
          </div>

          {/* CPU BET CHIPS */}
          {state.cpuBet > 0 && (
            <div className="bet-chips bet-cpu">
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "var(--gold)",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                {state.cpuBet}
              </div>
              <ChipStack amount={state.cpuBet} />
            </div>
          )}

          {/* BOARD */}
          <div className="board-center">
            <div className="pot">
              POT <span className="pot-amount">{potTotal}</span>
            </div>
            <div className="board-row">
              {[0, 1, 2, 3, 4].map((i) => (
                <PlayingCard
                  key={i}
                  code={state.board[i]}
                  size="md"
                  dealing={state.board[i] != null}
                  delay={i * 0.05}
                />
              ))}
            </div>
          </div>

          {/* HERO BET CHIPS */}
          {state.heroBet > 0 && (
            <div className="bet-chips bet-hero">
              <ChipStack amount={state.heroBet} />
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "var(--gold)",
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {state.heroBet}
              </div>
            </div>
          )}

          {/* HERO SEAT */}
          <div className={`seat seat-hero ${state.turn === "hero" && !state.handOver ? "turn" : ""}`}>
            <div className="name-tag">
              <span className="nm">Tú</span>
              <span className="st">{state.heroStack}</span>
            </div>
            <div className="avatar" style={{ background: "linear-gradient(180deg,var(--gold),var(--gold-deep))", color: "var(--bg-0)" }}>
              ♠
            </div>
            <div className="hand">
              <PlayingCard code={state.heroHand[0]} size="sm" />
              <PlayingCard code={state.heroHand[1]} size="sm" />
            </div>
          </div>
        </div>

        {/* Below-table info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
          <div className="panel" style={{ padding: 14 }}>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em" }}>FASE</div>
            <div className="font-display" style={{ fontSize: 22, marginTop: 4 }}>{PHASE_NAMES[state.phase]}</div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em" }}>BOTE</div>
            <div className="font-display" style={{ fontSize: 22, marginTop: 4, color: "var(--gold)" }}>{potTotal}</div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em" }}>EQUITY</div>
            <div className="font-display" style={{ fontSize: 22, marginTop: 4, color: heroEqPct > 50 ? "oklch(0.78 0.13 150)" : heroEqPct < 35 ? "oklch(0.78 0.18 25)" : "var(--text)" }}>
              {heroEqPct != null ? heroEqPct + "%" : "—"}
            </div>
          </div>
          <div className="panel" style={{ padding: 14 }}>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em" }}>TURNO</div>
            <div className="font-display" style={{ fontSize: 22, marginTop: 4 }}>{state.handOver ? "—" : state.turn === "hero" ? "Tú" : "CPU"}</div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ACTIONS */}
        <div className="panel actions-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.18em" }}>ACCIONES</div>
            {state.handOver ? (
              <button className="btn btn-primary btn-sm" onClick={newHand}>Nueva mano →</button>
            ) : (
              <span className="pill">{state.turn === "hero" ? "Tu turno" : "CPU pensando..."}</span>
            )}
          </div>

          <div className="action-grid">
            <button
              className="action-btn fold"
              disabled={state.turn !== "hero" || state.handOver}
              onClick={() => heroAct("fold")}
            >
              <span className="lbl">Fold</span>
              <span className="v">Tirar</span>
            </button>
            {toCallHero === 0 ? (
              <button
                className="action-btn"
                disabled={state.turn !== "hero" || state.handOver}
                onClick={() => heroAct("check")}
              >
                <span className="lbl">Check</span>
                <span className="v">Pasar</span>
              </button>
            ) : (
              <button
                className="action-btn"
                disabled={state.turn !== "hero" || state.handOver}
                onClick={() => heroAct("call")}
              >
                <span className="lbl">Call</span>
                <span className="v">{toCallHero}</span>
              </button>
            )}
            <button
              className="action-btn raise"
              disabled={state.turn !== "hero" || state.handOver || state.heroStack === 0}
              onClick={() => heroAct(toCallHero > 0 ? "raise" : "bet", betSliderValue)}
              style={{ gridColumn: "span 2" }}
            >
              <span className="lbl">{toCallHero > 0 ? "Raise" : "Bet"}</span>
              <span className="v">{betSliderValue}</span>
            </button>
            <button
              className="action-btn allin"
              disabled={state.turn !== "hero" || state.handOver || state.heroStack === 0}
              onClick={() => heroAct("allin")}
            >
              All-in · {state.heroStack + state.heroBet}
            </button>
          </div>

          {/* slider */}
          {!state.handOver && state.turn === "hero" && (
            <div className="bet-slider">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--text-mute)" }}>
                <span>Tamaño</span>
                <span>{betSliderValue}</span>
              </div>
              <input
                type="range"
                min={Math.max(BB, state.cpuBet * 2)}
                max={state.heroStack + state.heroBet}
                step={5}
                value={betSliderValue}
                onChange={(e) => setBetSliderValue(+e.target.value)}
              />
              <div style={{ display: "flex", gap: 4 }}>
                {[0.33, 0.5, 0.75, 1].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => setBetSliderValue(Math.max(BB, Math.round(potTotal * mult)))}
                    style={{
                      flex: 1,
                      padding: "4px 6px",
                      background: "oklch(1 0 0 / 0.03)",
                      border: "1px solid var(--line)",
                      color: "var(--text-mute)",
                      borderRadius: 6,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      cursor: "pointer",
                    }}
                  >
                    {Math.round(mult * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Equity card */}
        <div className="panel" style={{ padding: 18 }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 12 }}>
            ASESOR EN VIVO
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-mute)" }}>Equity vs rango aleatorio</span>
            <span className="font-mono" style={{ fontSize: 12, color: "var(--text)" }}>{heroEqPct ?? "—"}%</span>
          </div>
          <div className="bar bar-ai"><div style={{ width: (heroEqPct ?? 0) + "%" }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 6px" }}>
            <span style={{ fontSize: 12, color: "var(--text-mute)" }}>Acción sugerida</span>
            <span className="font-mono" style={{ fontSize: 12, color: "var(--ai)" }}>
              {heroEqPct == null ? "—" : heroEqPct > 65 ? "RAISE" : heroEqPct > 40 ? "CALL/CHECK" : "FOLD"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
            Pista basada en equity bruto vs un rival aleatorio. La AI completa razona con posición, historial y stack.
          </div>
        </div>

        {/* Log */}
        <div className="panel log-card" ref={logRef}>
          <h4>Registro de la mano</h4>
          {log.map((l, i) => (
            <div className="log-line" key={i}>
              <span className={`tag ${l.tag}`}>[{l.tag.toUpperCase()}]</span>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className="panel feedback-card" style={{ gridColumn: "1 / -1", padding: 28 }}>
          <div className="head">
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "oklch(0.82 0.14 200 / 0.15)", display: "grid", placeItems: "center", fontFamily: "Cormorant, serif", fontSize: 20, color: "var(--ai)" }}>
              AI
            </span>
            <div>
              <div className="bdg">Feedback de la mano</div>
              <div className="font-display" style={{ fontSize: 26, marginTop: 2 }}>{feedback.summary}</div>
            </div>
          </div>
          <p>{feedback.recommendation}</p>
          {feedback.issues.length > 0 && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {feedback.issues.map((iss, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "oklch(0.52 0.20 25 / 0.06)",
                    border: "1px solid oklch(0.52 0.20 25 / 0.25)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span className="font-mono" style={{ fontSize: 10, color: "oklch(0.78 0.18 25)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                      Error · {iss.severity}
                    </span>
                    <span className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>{iss.phase}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{iss.msg}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 4, fontStyle: "italic" }}>{iss.advice}</div>
                </div>
              ))}
            </div>
          )}
          <div className="meta">
            <div className="m"><span className="l">Tu mano final</span><span className="v">{feedback.heroBest?.label ?? "—"}</span></div>
            <div className="m"><span className="l">Mano del rival</span><span className="v">{feedback.cpuBest?.label ?? "—"}</span></div>
            <div className="m"><span className="l">Resultado</span><span className="v" style={{ color: state.winner === "hero" ? "oklch(0.78 0.13 150)" : state.winner === "cpu" ? "oklch(0.78 0.18 25)" : "var(--gold)" }}>
              {state.winner === "hero" ? "Ganada" : state.winner === "cpu" ? "Perdida" : "Empate"}
            </span></div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("practice-root"));
root.render(<PracticeApp />);
