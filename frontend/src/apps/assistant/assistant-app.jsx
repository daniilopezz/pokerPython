// AI Assistant — real-time recommendation builder.
const { useState, useMemo, useEffect, useRef } = React;

const A_SUIT_GLYPH = { s: "♠", h: "♥", d: "♦", c: "♣" };
const A_SUIT_RED = { h: true, d: true, s: false, c: false };
const A_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

function ACard({ code, size = "md", placeholder, onClick, dim }) {
  if (!code)
    return (
      <div className={`card-empty ${size === "sm" ? "card-sm" : ""}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default", opacity: dim ? 0.5 : 1 }}>
        <span>{placeholder || "+"}</span>
      </div>
    );
  const r = code[0] === "T" ? "10" : code[0];
  const suit = code[1];
  const red = A_SUIT_RED[suit];
  return (
    <div className={`card-3d ${red ? "red" : ""} ${size === "sm" ? "card-sm" : ""}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="corner tl">
        <span className="rank">{r}</span>
        <span className="suit">{A_SUIT_GLYPH[suit]}</span>
      </div>
      <div className="pip">{A_SUIT_GLYPH[suit]}</div>
      <div className="corner br">
        <span className="rank">{r}</span>
        <span className="suit">{A_SUIT_GLYPH[suit]}</span>
      </div>
    </div>
  );
}

function CardPicker({ open, onClose, onPick, used = [] }) {
  if (!open) return null;
  const used2 = new Set(used);
  const pick = (code, isUsed) => {
    if (!isUsed) {
      onPick(code);
      onClose();
    }
  };
  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label="Selector de cartas" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3>Selecciona una carta</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
        </div>
        {["s", "h", "d", "c"].map((suit) => (
          <div key={suit} style={{ marginBottom: 8 }}>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, color: A_SUIT_RED[suit] ? "oklch(0.78 0.18 25)" : "var(--text)" }}>{A_SUIT_GLYPH[suit]}</span>
              {suit === "s" ? "ESPADAS" : suit === "h" ? "CORAZONES" : suit === "d" ? "DIAMANTES" : "TRÉBOLES"}
            </div>
            <div className="suit-row">
              {A_RANKS.map((r) => {
                const code = r + suit;
                const isUsed = used2.has(code);
                return (
                  <div
                    key={code}
                    className={`pick-cell ${A_SUIT_RED[suit] ? "red" : ""} ${isUsed ? "used" : ""}`}
                    role="button"
                    tabIndex={isUsed ? "-1" : "0"}
                    aria-disabled={isUsed ? "true" : "false"}
                    aria-label={`Carta ${r === "T" ? "10" : r} ${A_SUIT_GLYPH[suit]}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        pick(code, isUsed);
                      }
                    }}
                    onClick={() => pick(code, isUsed)}
                  >
                    {r === "T" ? "10" : r}
                    <span className="s">{A_SUIT_GLYPH[suit]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const recommendAction = (input) => window.PokerStrategy.recommendAction(input);
const rangeGuess = (board) => window.PokerStrategy.rangeGuess(board);

function AssistantApp() {
  const [hand, setHand] = useState([]);
  const [board, setBoard] = useState([]);
  const [picker, setPicker] = useState(null); // { kind: 'hand' | 'board', index }
  const [players, setPlayers] = useState(3);
  const [position, setPosition] = useState("BTN");
  const [potSize, setPotSize] = useState(120);
  const [toCall, setToCall] = useState(40);
  const [stack, setStack] = useState(960);
  const [phase, setPhase] = useState("flop");
  const [style, setStyle] = useState("balanced");
  const [equity, setEquity] = useState(null);
  const [calc, setCalc] = useState(false);
  const [serverRecommendation, setServerRecommendation] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  const selectedHand = hand.filter(Boolean);
  const selectedBoard = board.filter(Boolean);
  const used = [...selectedHand, ...selectedBoard];

  // Auto-set phase from board length
  useEffect(() => {
    if (selectedBoard.length === 0) setPhase("preflop");
    else if (selectedBoard.length === 3) setPhase("flop");
    else if (selectedBoard.length === 4) setPhase("turn");
    else if (selectedBoard.length === 5) setPhase("river");
  }, [selectedBoard.length]);

  // Ask the backend for the full recommendation. If the server is unavailable,
  // the UI falls back to the shared browser engine so the tool remains usable.
  useEffect(() => {
    if (selectedHand.length === 2) {
      let cancelled = false;
      const payload = {
        hand: selectedHand,
        board: selectedBoard,
        players,
        position,
        potSize,
        toCall,
        stack,
        phase,
        style,
        samples: 200,
      };

      setCalc(true);
      setServerRecommendation(null);
      const t = setTimeout(async () => {
        try {
          if (!window.SolverApi) throw new Error("API no disponible");
          const data = await window.SolverApi.recommendation(payload);
          if (cancelled) return;
          setEquity(data.equity);
          setServerRecommendation(data.recommendation);
          setApiError(null);
        } catch (e) {
          if (cancelled) return;
          try {
            setEquity(window.PokerEngine.equityRough(selectedHand, selectedBoard, 200));
          } catch {
            setEquity(null);
          }
          setApiError(e.message || "No se pudo contactar con la API");
        } finally {
          if (!cancelled) setCalc(false);
        }
      }, 150);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    } else {
      setEquity(null);
      setServerRecommendation(null);
      setApiError(null);
    }
  }, [selectedHand.join(""), selectedBoard.join(""), players, position, potSize, toCall, stack, phase, style]);

  const localRec = useMemo(
    () => recommendAction({ hand: selectedHand, board: selectedBoard, equity, position, players, potSize, toCall, stack, phase, style }),
    [selectedHand.join(""), selectedBoard.join(""), equity, position, players, potSize, toCall, stack, phase, style]
  );
  const rec = serverRecommendation || localRec;

  function openPicker(kind, index) {
    setPicker({ kind, index });
  }
  function keyActivate(event, callback) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  }
  function pickCard(code) {
    if (!picker) return;
    if (picker.kind === "hand") {
      const next = [...hand];
      next[picker.index] = code;
      setHand(next);
    } else {
      const next = [...board];
      next[picker.index] = code;
      setBoard(next);
    }
    setPicker(null);
  }
  function clearCard(kind, index) {
    if (kind === "hand") {
      const next = hand.filter((_, i) => i !== index);
      setHand(next);
    } else {
      const next = board.filter((_, i) => i !== index);
      setBoard(next);
    }
  }

  function loadExample() {
    setHand(["Ah", "Kh"]);
    setBoard(["7h", "2d", "Th"]);
    setPlayers(3);
    setPosition("BTN");
    setPotSize(120);
    setToCall(40);
    setStack(960);
    setStyle("balanced");
  }

  async function saveRecommendation() {
    if (selectedHand.length !== 2 || !window.SolverApi?.recommendation) return;
    setSaveStatus("Guardando...");
    try {
      await window.SolverApi.recommendation({
        hand: selectedHand,
        board: selectedBoard,
        players,
        position,
        potSize,
        toCall,
        stack,
        phase,
        style,
        samples: 200,
        persist: true,
      });
      setSaveStatus("Guardado en dashboard");
    } catch (error) {
      setSaveStatus(error.message || "No se pudo guardar");
    }
  }

  return (
    <div className="ai-grid">
      {/* LEFT — builder */}
      <div className="panel ai-builder">
        {/* Hand */}
        <div className="builder-row">
          <div className="lbl-row">
            <span className="lbl">Tu mano · 2 cartas</span>
            {hand.length > 0 && <span className="clr" role="button" tabIndex="0" onKeyDown={(e) => keyActivate(e, () => setHand([]))} onClick={() => setHand([])}>Limpiar</span>}
          </div>
          <div className="card-slots">
            {[0, 1].map((i) => (
              <div className="card-slot" key={i} role="button" tabIndex="0" aria-label={`Seleccionar carta ${i + 1} de tu mano`} onKeyDown={(e) => keyActivate(e, () => openPicker("hand", i))} onClick={() => openPicker("hand", i)}>
                {hand[i] && (
                  <span className="x" role="button" tabIndex="0" aria-label="Quitar carta" onKeyDown={(e) => keyActivate(e, () => clearCard("hand", i))} onClick={(e) => { e.stopPropagation(); clearCard("hand", i); }}>×</span>
                )}
                <ACard code={hand[i]} placeholder={i === 0 ? "1ª" : "2ª"} />
              </div>
            ))}
          </div>
        </div>

        {/* Board */}
        <div className="builder-row">
          <div className="lbl-row">
            <span className="lbl">Cartas comunitarias · 0–5</span>
            {board.length > 0 && <span className="clr" role="button" tabIndex="0" onKeyDown={(e) => keyActivate(e, () => setBoard([]))} onClick={() => setBoard([])}>Limpiar</span>}
          </div>
          <div className="card-slots">
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="card-slot" key={i} role="button" tabIndex="0" aria-label={`Seleccionar carta comunitaria ${i + 1}`} onKeyDown={(e) => keyActivate(e, () => openPicker("board", i))} onClick={() => openPicker("board", i)}>
                {board[i] && (
                  <span className="x" role="button" tabIndex="0" aria-label="Quitar carta comunitaria" onKeyDown={(e) => keyActivate(e, () => clearCard("board", i))} onClick={(e) => { e.stopPropagation(); clearCard("board", i); }}>×</span>
                )}
                <ACard code={board[i]} placeholder={["FLOP", "FLOP", "FLOP", "TURN", "RIVER"][i]} dim={i > board.length && board.length < i} />
              </div>
            ))}
          </div>
        </div>

        {/* Phase indicator */}
        <div className="builder-row">
          <span className="lbl">Fase actual</span>
          <div className="seg" style={{ marginTop: 8 }}>
            {["preflop", "flop", "turn", "river"].map((p) => (
              <button key={p} className={phase === p ? "active" : ""} onClick={() => setPhase(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Context grid */}
        <div className="builder-row">
          <div className="context-grid">
            <div className="field">
              <label>Jugadores en la mano</label>
              <select value={players} onChange={(e) => setPlayers(+e.target.value)}>
                {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tu posición</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)}>
                <option>BTN</option>
                <option>CO</option>
                <option>MP</option>
                <option>UTG</option>
                <option>SB</option>
                <option>BB</option>
              </select>
            </div>
            <div className="field">
              <label>Tamaño del bote</label>
              <input type="number" value={potSize} onChange={(e) => setPotSize(+e.target.value || 0)} />
            </div>
            <div className="field">
              <label>Para igualar (call)</label>
              <input type="number" value={toCall} onChange={(e) => setToCall(+e.target.value || 0)} />
            </div>
            <div className="field">
              <label>Tu stack</label>
              <input type="number" value={stack} onChange={(e) => setStack(+e.target.value || 0)} />
            </div>
            <div className="field">
              <label>Estilo del rival</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="balanced">Equilibrado</option>
                <option value="aggressive">Agresivo</option>
                <option value="passive">Pasivo</option>
                <option value="tight">Tight</option>
                <option value="loose">Loose</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={loadExample}>Cargar ejemplo</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setHand([]); setBoard([]); setToCall(0); }}>Empezar de cero</button>
          <button className="btn btn-ghost btn-sm" disabled={selectedHand.length !== 2} onClick={saveRecommendation}>Guardar</button>
        </div>
        {saveStatus && <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 10, letterSpacing: "0.12em" }}>{saveStatus}</div>}
      </div>

      {/* RIGHT — AI recommendation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="panel ai-rec">
          <div className="ai-rec-head">
            <span className="t">Recomendación AI</span>
            <span className="live">{calc ? "Calculando…" : apiError ? "Modo local" : "En vivo"}</span>
          </div>
          <div className="ai-rec-body">
            <div className="ai-action-display">{rec.action}</div>
            {rec.sizing && <div className="ai-action-sub">{rec.sizing}</div>}

            <div className="ai-confidence">
              <div>
                <div className="row"><span className="l">Probabilidad de ganar</span><span className="v">{equity != null ? Math.round(equity * 100) + "%" : "—"}</span></div>
                <div className="bar bar-ai"><div style={{ width: (equity ? Math.round(equity * 100) : 0) + "%" }} /></div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="row"><span className="l">Fuerza ajustada de la mano</span><span className="v">{rec.strength != null ? rec.strength + "/100" : "—"}</span></div>
                <div className="bar bar-strength"><div style={{ width: (rec.strength || 0) + "%" }} /></div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="row"><span className="l">Nivel de riesgo</span><span className="v">{rec.risk}%</span></div>
                <div className="bar bar-risk"><div style={{ width: (rec.risk || 0) + "%" }} /></div>
              </div>
            </div>
          </div>

          <div className="ai-explain">
            <p>{rec.reason}</p>
            <div className="meta">
              <div className="m"><div className="l">Pot odds requeridas</div><div className="v">{toCall > 0 ? Math.round((toCall / (potSize + toCall)) * 100) + "%" : "—"}</div></div>
              <div className="m"><div className="l">SPR</div><div className="v">{(stack / Math.max(potSize, 1)).toFixed(1)}</div></div>
            </div>
          </div>
        </div>

        {/* Opponent range */}
        <div className="panel" style={{ padding: 22 }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 12 }}>
            POSIBLES MANOS DEL RIVAL
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {rangeGuess(selectedBoard).map((r, i) => (
              <span key={i} className="pill" style={{ fontSize: 11 }}>{r}</span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-mute)", margin: "14px 0 0", lineHeight: 1.5 }}>
            Estimación basada en la textura del board y la estructura habitual de un rival {style === "balanced" ? "equilibrado" : style === "aggressive" ? "agresivo" : style === "passive" ? "pasivo" : style === "tight" ? "tight" : "loose"}.
          </p>
        </div>

        {/* Alternatives */}
        {rec.alternatives && rec.alternatives.length > 0 && (
          <div className="panel" style={{ padding: 22 }}>
            <div className="font-mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 12 }}>
              ALTERNATIVAS A CONSIDERAR
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {rec.alternatives.map((a, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-mute)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--gold)", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>→</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="disclaimer" style={{ marginTop: 0 }}>
          <span className="ico">!</span>
          <div>
            Esta recomendación es una <b style={{ color: "var(--text)" }}>herramienta de apoyo</b>, no una garantía. La AI calcula equity y aplica reglas estratégicas, pero no puede leer dinámicas de mesa, tells físicos ni historiales largos. Decide tú con criterio.
          </div>
        </div>
      </div>

      {/* Card picker modal */}
      <CardPicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={pickCard}
        used={used}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("assistant-root"));
root.render(<AssistantApp />);
