// Dashboard — analytics view. SVG-rendered charts, no chart library.
const { useState, useEffect, useRef } = React;

// --- chart helpers ---
function Sparkline({ data, color = "var(--gold)", height = 80, fill = true }) {
  const w = 300, h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / range) * (h - 8) - 4;
    return [x, y];
  });
  const linePath = pts.map(([x, y], i) => (i === 0 ? `M${x} ${y}` : `L${x} ${y}`)).join(" ");
  const areaPath = `${linePath} L${w} ${h} L0 ${h} Z`;
  const gid = "g" + Math.random().toString(36).slice(2, 8);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: h }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gid})`} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill={color} />
    </svg>
  );
}

function Donut({ segments, size = 140 }) {
  const r = 56, c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * c;
        const dasharray = `${len} ${c}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
    </svg>
  );
}

function RadialGauge({ value, max = 100, label, color = "var(--gold)" }) {
  const size = 160;
  const r = 64;
  const c = Math.PI * r; // half-circle
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 16}`} style={{ width: "100%", maxWidth: size }}>
      <path d={`M${size / 2 - r} ${size / 2} A${r} ${r} 0 0 1 ${size / 2 + r} ${size / 2}`} fill="none" stroke="var(--bg-3)" strokeWidth="14" strokeLinecap="round" />
      <path
        d={`M${size / 2 - r} ${size / 2} A${r} ${r} 0 0 1 ${size / 2 + r} ${size / 2}`}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontFamily="Cormorant, serif" fontSize="32" fill="var(--text)">{value}</text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--text-dim)" letterSpacing="2">{label}</text>
    </svg>
  );
}

function DashboardApp() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setApiData(null);
    window.SolverApi?.dashboardSummary()
      .then((data) => {
        if (!cancelled) setApiData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [retryKey]);

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "var(--text-mute)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.18em" }}>
        CARGANDO DATOS…
      </div>
    );
  }

  if (!apiData) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ color: "oklch(0.78 0.18 25)", fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: "0.18em", marginBottom: 16 }}>
          ERROR AL CARGAR DATOS
        </div>
        <p style={{ color: "var(--text-mute)", fontSize: 14 }}>
          No se pudo conectar con el servidor. Comprueba que el backend está en marcha.
        </p>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 16 }}
          onClick={() => setRetryKey((k) => k + 1)}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const sessionData = apiData.sessions;
  const evCurveData = apiData.evCurve;
  const actionDistributionData = apiData.actionDistribution;
  const errorData = apiData.errors;
  const handStrengthData = apiData.handStrength;
  const recentData = apiData.recent;
  const handStrengthMax = Math.max(...handStrengthData.map((h) => h.count));

  const totalHands = sessionData.reduce((s, x) => s + x.hands, 0);
  const totalEV = evCurveData[evCurveData.length - 1];
  const avgWin = (sessionData.reduce((s, x) => s + x.win, 0) / sessionData.length * 100).toFixed(1);
  const avgAgg = (sessionData.reduce((s, x) => s + x.agg, 0) / sessionData.length).toFixed(0);
  const avgAlign = (sessionData.reduce((s, x) => s + x.align, 0) / sessionData.length).toFixed(0);

  return (
    <div className="dash-grid">

      {/* Top KPIs */}
      <div className="panel dash-card s4">
        <h4>Manos jugadas · últimos 7 días</h4>
        <div className="lead-no">{totalHands}</div>
        <div className="delta up">+ 14% vs semana anterior</div>
        <Sparkline data={sessionData.map(s => s.hands)} color="oklch(0.82 0.14 82)" height={60} />
      </div>

      <div className="panel dash-card s4">
        <h4>EV acumulado · bb</h4>
        <div className="lead-no" style={{ color: "oklch(0.78 0.13 150)" }}>+{totalEV.toFixed(1)}</div>
        <div className="delta up">+ 22.4 bb este mes</div>
        <Sparkline data={evCurveData} color="oklch(0.78 0.13 150)" height={60} />
      </div>

      <div className="panel dash-card s4" style={{ borderColor: "oklch(0.82 0.14 200 / 0.3)", background: "radial-gradient(ellipse at top right,oklch(0.55 0.13 220 / 0.1),transparent 60%),linear-gradient(180deg,var(--bg-2),var(--bg-1))" }}>
        <h4 style={{ color: "var(--ai)" }}>Alineación con la AI</h4>
        <div className="lead-no" style={{ color: "var(--ai)" }}>{avgAlign}%</div>
        <div className="delta up">+ 6 pp en 30 días</div>
        <Sparkline data={sessionData.map(s => s.align)} color="oklch(0.82 0.14 200)" height={60} />
      </div>

      {/* EV big chart */}
      <div className="panel dash-card s8">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h4>Curva de EV · 20 sesiones</h4>
            <div className="lead-no" style={{ fontSize: 44, marginTop: 4, color: "var(--gold)" }}>+{totalEV.toFixed(1)} bb</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="pill pill-gold">Real</span>
            <span className="pill pill-ai">AI esperado</span>
          </div>
        </div>
        <div style={{ marginTop: 20, height: 200, position: "relative" }}>
          <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id="evReal" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.14 82)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="oklch(0.82 0.14 82)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
              <line key={i} x1="0" x2="600" y1={g * 200} y2={g * 200} stroke="var(--line-soft)" />
            ))}
            {/* AI expected line (dashed cyan) */}
            <path
              d={evCurveData.map((v, i) => {
                const x = (i / (evCurveData.length - 1)) * 600;
                const expected = v * 1.18;
                const max = Math.max(...evCurveData) * 1.2;
                const y = 200 - (expected / max) * 180 - 10;
                return (i === 0 ? "M" : "L") + x + " " + y;
              }).join(" ")}
              fill="none"
              stroke="oklch(0.82 0.14 200)"
              strokeWidth="2"
              strokeDasharray="4 4"
              opacity="0.7"
            />
            {/* real EV */}
            {(() => {
              const max = Math.max(...evCurveData) * 1.2;
              const pts = evCurveData.map((v, i) => [(i / (evCurveData.length - 1)) * 600, 200 - (v / max) * 180 - 10]);
              const linePath = pts.map(([x, y], i) => (i === 0 ? "M" : "L") + x + " " + y).join(" ");
              const areaPath = `${linePath} L600 200 L0 200 Z`;
              return (
                <>
                  <path d={areaPath} fill="url(#evReal)" />
                  <path d={linePath} fill="none" stroke="oklch(0.82 0.14 82)" strokeWidth="2.5" />
                  {pts.map(([x, y], i) => i === pts.length - 1 ? <circle key={i} cx={x} cy={y} r="5" fill="oklch(0.82 0.14 82)" /> : null)}
                </>
              );
            })()}
          </svg>
          <div style={{ position: "absolute", bottom: -8, left: 0, right: 0, display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: 9, color: "var(--text-dim)" }}>
            {[1, 5, 10, 15, 20].map((s) => <span key={s}>S{s}</span>)}
          </div>
        </div>
      </div>

      {/* Donut */}
      <div className="panel dash-card s4">
        <h4>Distribución de acciones</h4>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
          <Donut segments={actionDistributionData} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            {actionDistributionData.map((a) => (
              <div key={a.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color }}></span>
                  {a.name}
                </span>
                <span className="font-mono" style={{ color: "var(--text)" }}>{a.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hand strength bar chart */}
      <div className="panel dash-card s6">
        <h4>Frecuencia por fuerza de mano</h4>
        <div className="bars">
          {handStrengthData.map((h, i) => (
            <div className="bar-row" key={i}>
              <div className="nm">{h.range}</div>
              <div className="bar"><div style={{ width: (h.count / handStrengthMax) * 100 + "%", background: i === 0 ? "var(--gold)" : i === 1 ? "var(--gold-deep)" : `oklch(${0.4 + i * 0.03} 0.04 80)` }} /></div>
              <div className="v">{h.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Errors */}
      <div className="panel dash-card s6">
        <h4>Errores más frecuentes</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {errorData.map((e, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px", gap: 12, padding: "10px 0", borderBottom: i < errorData.length - 1 ? "1px solid var(--line-soft)" : "none", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{e.name}</div>
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: e.severity === "alta" ? "oklch(0.78 0.18 25)" : e.severity === "media" ? "var(--gold)" : "var(--text-mute)", textAlign: "right" }}>
                {e.severity}
              </div>
              <div className="font-display" style={{ fontSize: 22, textAlign: "right" }}>{e.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="panel dash-card s6">
        <h4>Tu decisión vs decisión AI</h4>
        <div className="compare" style={{ marginTop: 14 }}>
          <div className="col you">
            <div className="l">Tu winrate</div>
            <div className="a">{avgWin}%</div>
          </div>
          <div className="col ai">
            <div className="l">Winrate proyectado AI</div>
            <div className="a">68.4%</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-mute)" }}>Alineación de decisiones</span>
            <span className="font-mono" style={{ fontSize: 12, color: "var(--ai)" }}>{avgAlign}%</span>
          </div>
          <div className="bar bar-ai"><div style={{ width: avgAlign + "%" }} /></div>
        </div>
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "oklch(0.82 0.14 200 / 0.08)", border: "1px solid oklch(0.82 0.14 200 / 0.2)" }}>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--ai)", letterSpacing: "0.18em" }}>POTENCIAL DE MEJORA</div>
          <div style={{ fontSize: 13, color: "var(--text)", marginTop: 6, lineHeight: 1.5 }}>
            Si tu alineación subiera al 90%, tu winrate proyectado sería de <b style={{ color: "var(--gold)" }}>+7.8 bb/100</b>. Foco: reducir calls con equity baja y over-bets con mano media.
          </div>
        </div>
      </div>

      {/* Gauges */}
      <div className="panel dash-card s6" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <h4>Indicadores del juego</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <RadialGauge value={+avgAgg} max={100} label="AGRESIVIDAD" color="oklch(0.78 0.18 25)" />
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, textAlign: "center" }}>Por encima de la media. Objetivo 35–45.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <RadialGauge value={74} max={100} label="SEGURIDAD" color="oklch(0.78 0.13 150)" />
            <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, textAlign: "center" }}>Buena selección de manos premium.</div>
          </div>
        </div>
      </div>

      {/* Recent decisions */}
      <div className="panel dash-card s12">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 style={{ margin: 0 }}>Historial reciente · tus jugadas vs la AI</h4>
          <span className="pill">Últimas 6 decisiones</span>
        </div>
        <div className="history-list" style={{ marginTop: 14 }}>
          {recentData.map((r, i) => (
            <div className="hist-row" key={i} style={{ gridTemplateColumns: "60px 130px 1fr 100px 100px 60px 60px" }}>
              <span style={{ color: "var(--gold)" }}>{r.phase}</span>
              <span className="h-cards">
                {r.cards.map((c, j) => <MiniCard key={j} code={c} />)}
                <span style={{ color: "var(--text-dim)", margin: "0 4px" }}>·</span>
                {r.board.map((c, j) => <MiniCard key={j} code={c} />)}
              </span>
              <span style={{ color: "var(--text-mute)" }}>Tú: <span style={{ color: "var(--text)" }}>{r.your}</span></span>
              <span className="h-act">AI: {r.ai}</span>
              <span style={{ color: r.match === "✓" || r.match === "OK" ? "oklch(0.78 0.13 150)" : r.match === "✗" || r.match === "NO" ? "oklch(0.78 0.18 25)" : "var(--gold)", fontSize: 14 }}>{r.match}</span>
              <span className={`h-ev ${r.ev.startsWith("+") ? "pos" : "neg"}`}>{r.ev}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function MiniCard({ code }) {
  if (!code) return null;
  const r = code[0] === "T" ? "10" : code[0];
  const suit = code[1];
  const red = suit === "h" || suit === "d";
  const glyph = { s: "♠", h: "♥", d: "♦", c: "♣" }[suit];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        padding: "1px 4px",
        borderRadius: 3,
        background: "oklch(0.95 0.005 80)",
        color: red ? "oklch(0.45 0.18 25)" : "var(--bg-0)",
        fontFamily: "Cormorant, serif",
        fontWeight: 600,
        fontSize: 11,
        lineHeight: 1.3,
        marginRight: 2,
      }}
    >
      {r}{glyph}
    </span>
  );
}

const root = ReactDOM.createRoot(document.getElementById("dashboard-root"));
root.render(<DashboardApp />);
