// Solver Poker — cinematic trailer.
// Loaded by trailer.html. Uses animations.jsx (Stage / Sprite / Easing / interpolate / animate).

const { useMemo } = React;

// ============================================================================
// Visual primitives — cards, chips, felt
// ============================================================================

const SUIT_GLYPH_T = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_RED_T = { h: true, d: true, s: false, c: false };

function Felt() {
  // Subtle background — felt + vignette + ambient ring + grain.
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, oklch(0.36 0.08 150) 0%, oklch(0.22 0.06 150) 45%, oklch(0.13 0.03 60) 80%, oklch(0.09 0.01 60) 100%)",
        }}
      />
      {/* Felt oval table */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 1500,
          height: 820,
          marginLeft: -750,
          marginTop: -410,
          borderRadius: 410,
          background:
            "radial-gradient(ellipse at 50% 35%, oklch(0.36 0.08 150) 0%, oklch(0.26 0.07 150) 60%, oklch(0.16 0.04 150) 100%)",
          border: "16px solid oklch(0.16 0.02 30)",
          boxShadow:
            "0 0 0 2px oklch(0.78 0.13 82 / 0.35), 0 80px 160px oklch(0 0 0 / 0.7), inset 0 0 180px oklch(0 0 0 / 0.55)",
        }}
      />
      {/* inner gold ring */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 1430,
          height: 760,
          marginLeft: -715,
          marginTop: -380,
          borderRadius: 380,
          border: "1px solid oklch(0.78 0.13 82 / 0.22)",
          pointerEvents: "none",
        }}
      />
      {/* spotlight */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 36% at 50% 50%, oklch(0.55 0.1 80 / 0.18), transparent 70%)",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
      {/* grid noise */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.02) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.02) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent 85%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// A card that can be face-up, face-down, or flipping at a given t.
function PCard({
  code,
  x,
  y,
  rot = 0,
  scale = 1,
  faceUp = true,
  width = 140,
  height = 196,
  flipProgress = null, // 0 = back, 1 = front
  opacity = 1,
  zIndex = 1,
}) {
  let actuallyFaceUp = faceUp;
  let flipRotY = 0;
  if (flipProgress != null) {
    flipRotY = flipProgress * 180;
    actuallyFaceUp = flipProgress > 0.5;
  }
  // We render front + back stacked. Use rotateY to flip.
  const r = code && code[0] === "T" ? "10" : code?.[0];
  const suit = code?.[1];
  const red = suit ? SUIT_RED_T[suit] : false;
  const glyph = suit ? SUIT_GLYPH_T[suit] : "";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        marginLeft: -width / 2,
        marginTop: -height / 2,
        transform: `rotate(${rot}deg) scale(${scale})`,
        opacity,
        zIndex,
        perspective: 1200,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateY(${flipRotY}deg)`,
          transition: "none",
          filter: "drop-shadow(0 22px 28px oklch(0 0 0 / 0.65)) drop-shadow(0 6px 10px oklch(0 0 0 / 0.45))",
        }}
      >
        {/* Back */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            backfaceVisibility: "hidden",
            background:
              "repeating-linear-gradient(45deg, oklch(0.32 0.12 25) 0 12px, oklch(0.22 0.10 25) 12px 24px), linear-gradient(135deg, oklch(0.42 0.18 25), oklch(0.28 0.14 25))",
            border: "6px solid oklch(0.78 0.13 82 / 0.45)",
            boxShadow:
              "inset 0 0 0 2px oklch(0.78 0.13 82 / 0.4), 0 0 0 1px oklch(0 0 0 / 0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: 6,
              border: "1px solid oklch(0.78 0.13 82 / 0.5)",
              background:
                "radial-gradient(circle at 50% 50%, oklch(0.78 0.13 82 / 0.2), transparent 65%)",
            }}
          />
        </div>
        {/* Front */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background:
              "linear-gradient(180deg, oklch(0.98 0.005 80), oklch(0.92 0.008 80))",
            color: red ? "oklch(0.45 0.18 25)" : "oklch(0.13 0.01 60)",
            fontFamily: "Cormorant, serif",
            fontWeight: 600,
            border: "1px solid oklch(0.2 0 0 / 0.3)",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.6), 0 1px 0 oklch(1 0 0 / 0.2)",
          }}
        >
          {code ? (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 12,
                  fontSize: 32,
                  lineHeight: 1,
                }}
              >
                <div>{r}</div>
                <div style={{ fontSize: 26 }}>{glyph}</div>
              </div>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 72,
                }}
              >
                {glyph}
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 12,
                  fontSize: 32,
                  lineHeight: 1,
                  transform: "rotate(180deg)",
                }}
              >
                <div>{r}</div>
                <div style={{ fontSize: 26 }}>{glyph}</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Chip({ x, y, color = "red", value = 25, scale = 1, rot = 0, opacity = 1, zIndex = 1, shadow = true }) {
  const colors = {
    red: "oklch(0.42 0.18 25)",
    blue: "oklch(0.40 0.14 230)",
    green: "oklch(0.36 0.08 150)",
    black: "oklch(0.13 0.01 60)",
    gold: "oklch(0.66 0.13 75)",
  };
  const ringColor = "oklch(1 0 0 / 0.65)";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 70,
        height: 70,
        marginLeft: -35,
        marginTop: -35,
        borderRadius: "50%",
        transform: `scale(${scale}) rotate(${rot}deg)`,
        opacity,
        zIndex,
        background: colors[color] || colors.red,
        border: `5px dashed ${ringColor}`,
        backgroundClip: "padding-box",
        boxShadow: shadow
          ? "0 1px 0 oklch(1 0 0 / 0.35) inset, 0 -3px 0 oklch(0 0 0 / 0.28) inset, 0 10px 22px oklch(0 0 0 / 0.55)"
          : "none",
        display: "grid",
        placeItems: "center",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        fontWeight: 700,
        color: color === "gold" ? "oklch(0.13 0.01 60)" : "oklch(0.98 0.005 80)",
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          background: colors[color] || colors.red,
          border: "1px solid oklch(0 0 0 / 0.3)",
        }}
      />
      <span style={{ position: "relative", zIndex: 2 }}>
        {value >= 1000 ? value / 1000 + "K" : value}
      </span>
    </div>
  );
}

// HUD floating analytics chip
function HUD({ x, y, label, value, sub, barPct, opacity = 1, scale = 1, rot = 0, color = "var(--gold)", zIndex = 5 }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 320,
        marginLeft: -160,
        marginTop: -80,
        padding: "22px 26px",
        opacity,
        transform: `scale(${scale}) rotate(${rot}deg)`,
        zIndex,
        background: "oklch(0.14 0.012 60 / 0.92)",
        backdropFilter: "blur(20px)",
        border: "1px solid oklch(0.28 0.01 60)",
        borderRadius: 16,
        boxShadow: "0 30px 60px oklch(0 0 0 / 0.6)",
        color: "oklch(0.96 0.008 80)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "oklch(0.55 0.012 80)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Cormorant, serif",
          fontSize: 44,
          lineHeight: 1,
          color,
          background: color === "ai" ? "linear-gradient(180deg, oklch(0.82 0.14 200), oklch(0.55 0.13 220))" : undefined,
          WebkitBackgroundClip: color === "ai" ? "text" : undefined,
          backgroundClip: color === "ai" ? "text" : undefined,
          WebkitTextFillColor: color === "ai" ? "transparent" : undefined,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 12,
            color: "oklch(0.74 0.012 80)",
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
      {barPct != null && (
        <div
          style={{
            height: 5,
            borderRadius: 3,
            background: "oklch(0.22 0.014 60)",
            marginTop: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barPct}%`,
              background: "linear-gradient(90deg, oklch(0.82 0.14 200), oklch(0.78 0.13 82))",
              transition: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCENES
// ============================================================================

// SCENE 0 — Logo intro (0 → 1.8s)
function LogoScene() {
  const { localTime, progress } = useSprite();
  const t = localTime;

  // Mark opacity & scale
  const markOpacity = interpolate([0, 0.25, 1.2, 1.8], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const markScale = interpolate([0, 0.5, 1.8], [0.6, 1.0, 1.04], Easing.easeOutBack)(t);

  const textOpacity = interpolate([0.35, 0.85, 1.3, 1.8], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const textY = interpolate([0.35, 0.85], [20, 0], Easing.easeOutCubic)(t);

  // Spotlight that pulses
  const spotOpacity = interpolate([0, 0.6, 1.8], [0, 0.5, 0.2], Easing.easeOutCubic)(t);

  return (
    <>
      {/* Pulse spotlight */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 540,
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, oklch(0.78 0.13 82 / 0.45), transparent 60%)",
          opacity: spotOpacity,
          filter: "blur(20px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Logo mark */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 520,
          width: 120,
          height: 120,
          marginLeft: -60,
          marginTop: -60,
          borderRadius: 24,
          background: "linear-gradient(135deg, oklch(0.82 0.14 82), oklch(0.66 0.13 75))",
          display: "grid",
          placeItems: "center",
          fontFamily: "Cormorant, serif",
          fontSize: 76,
          color: "oklch(0.13 0.01 60)",
          opacity: markOpacity,
          transform: `scale(${markScale})`,
          boxShadow:
            "0 1px 0 oklch(1 0 0 / 0.5) inset, 0 30px 80px oklch(0.78 0.13 82 / 0.4)",
        }}
      >
        ♠
      </div>

      {/* Wordmark */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 660,
          textAlign: "center",
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "Cormorant, serif",
            fontSize: 96,
            letterSpacing: "0.1em",
            fontWeight: 500,
            color: "oklch(0.96 0.008 80)",
          }}
        >
          SOLVER
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 18,
            letterSpacing: "0.4em",
            color: "oklch(0.82 0.14 82)",
            marginTop: 6,
          }}
        >
          POKER · AI
        </div>
      </div>
    </>
  );
}

// SCENE 1 — Deal cards face-down (2.4 → 5.5s)
function DealScene() {
  const { localTime } = useSprite();
  const t = localTime;

  // 5 cards fly in from off-screen top at staggered times, land in an arc
  const positions = [
    { x: 660, y: 540, rot: -8 },
    { x: 810, y: 530, rot: -4 },
    { x: 960, y: 525, rot: 0 },
    { x: 1110, y: 530, rot: 4 },
    { x: 1260, y: 540, rot: 8 },
  ];

  return positions.map((p, i) => {
    const startT = 0.05 + i * 0.18;
    const localT = t - startT;
    if (localT < 0) return null;

    const flyDur = 0.7;
    const k = Math.min(1, localT / flyDur);
    const eased = Easing.easeOutCubic(k);

    const startX = 960;
    const startY = -200;
    const startRot = p.rot - 60;
    const startScale = 0.55;

    const cx = startX + (p.x - startX) * eased;
    const cy = startY + (p.y - startY) * eased;
    const crot = startRot + (p.rot - startRot) * eased;
    const cscale = startScale + (1 - startScale) * eased;

    // settle bounce
    const settleK = Math.max(0, Math.min(1, (localT - flyDur) / 0.3));
    const bounce = settleK > 0 ? Math.sin(settleK * Math.PI) * 8 * (1 - settleK) : 0;

    return (
      <PCard
        key={i}
        x={cx}
        y={cy - bounce}
        rot={crot}
        scale={cscale}
        faceUp={false}
        zIndex={10 + i}
      />
    );
  });
}

// SCENE 2 — Reveal hero hand A♥ K♥ (5.5 → 8.5s)
function RevealScene() {
  const { localTime } = useSprite();
  const t = localTime;

  // Move the two center-ish cards to front and flip them
  const cards = [
    { code: "Ah", finalX: 820, finalY: 700, finalRot: -10 },
    { code: "Kh", finalX: 1100, finalY: 700, finalRot: 10 },
  ];

  return cards.map((c, i) => {
    const startT = i * 0.15;
    const localT = t - startT;

    // Move from arc (from DealScene final positions) to forward positions
    const moveDur = 0.55;
    const moveK = Math.min(1, Math.max(0, localT / moveDur));
    const eased = Easing.easeOutCubic(moveK);

    const startX = i === 0 ? 810 : 1110;
    const startY = i === 0 ? 530 : 530;
    const startRot = i === 0 ? -4 : 4;
    const startScale = 1;
    const endScale = 1.25;

    const cx = startX + (c.finalX - startX) * eased;
    const cy = startY + (c.finalY - startY) * eased;
    const crot = startRot + (c.finalRot - startRot) * eased;
    const cscale = startScale + (endScale - startScale) * eased;

    // Flip start after move begins
    const flipStart = 0.35;
    const flipDur = 0.6;
    const flipK = Math.min(1, Math.max(0, (localT - flipStart) / flipDur));
    const flipProgress = Easing.easeInOutCubic(flipK);

    return (
      <PCard
        key={c.code}
        code={c.code}
        x={cx}
        y={cy}
        rot={crot}
        scale={cscale}
        flipProgress={flipProgress}
        zIndex={50 + i}
      />
    );
  });
}

// SCENE 3 — Flop deals (8.5 → 11.5s)
function FlopScene() {
  const { localTime } = useSprite();
  const t = localTime;
  // 3 cards slide in horizontally to top-center
  const boardCards = [
    { code: "7h", x: 780, y: 380 },
    { code: "2d", x: 960, y: 380 },
    { code: "Th", x: 1140, y: 380 },
  ];

  return boardCards.map((c, i) => {
    const startT = 0.1 + i * 0.28;
    const localT = t - startT;
    if (localT < 0) return null;

    // Slide in from right
    const slideDur = 0.5;
    const slideK = Math.min(1, localT / slideDur);
    const eased = Easing.easeOutCubic(slideK);

    const startX = c.x + 600;
    const startRot = 30;
    const startOp = 0;

    const cx = startX + (c.x - startX) * eased;
    const cy = c.y;
    const crot = startRot + (0 - startRot) * eased;
    const op = startOp + (1 - startOp) * eased;

    // flip during slide
    const flipK = Math.min(1, Math.max(0, (localT - 0.25) / 0.45));
    const flipProgress = Easing.easeInOutCubic(flipK);

    return (
      <PCard
        key={i}
        code={c.code}
        x={cx}
        y={cy}
        rot={crot}
        scale={1}
        flipProgress={flipProgress}
        opacity={op}
        zIndex={20 + i}
      />
    );
  });
}

// SCENE 4 — Chip toss (11.5 → 14s)
function ChipScene() {
  const { localTime } = useSprite();
  const t = localTime;

  // 10 chips arc in from various edges to a stack at center-bottom
  const chips = [
    { color: "red", value: 25, fromX: -100, fromY: 600, toX: 940, toY: 870, delay: 0 },
    { color: "blue", value: 100, fromX: 2000, fromY: 600, toX: 985, toY: 875, delay: 0.08 },
    { color: "gold", value: 500, fromX: -50, fromY: 200, toX: 950, toY: 860, delay: 0.18 },
    { color: "red", value: 25, fromX: 2050, fromY: 200, toX: 975, toY: 855, delay: 0.28 },
    { color: "blue", value: 100, fromX: 200, fromY: 1200, toX: 945, toY: 850, delay: 0.38 },
    { color: "green", value: 50, fromX: 1700, fromY: 1200, toX: 980, toY: 845, delay: 0.48 },
    { color: "black", value: 1000, fromX: 960, fromY: -100, toX: 962, toY: 840, delay: 0.6 },
    { color: "gold", value: 500, fromX: -100, fromY: 1000, toX: 925, toY: 835, delay: 0.72 },
    { color: "red", value: 25, fromX: 2100, fromY: 1000, toX: 995, toY: 830, delay: 0.84 },
    { color: "blue", value: 100, fromX: 400, fromY: -100, toX: 955, toY: 825, delay: 0.96 },
  ];

  return chips.map((c, i) => {
    const localT = t - c.delay;
    if (localT < 0) return null;
    const flyDur = 0.55;
    const k = Math.min(1, localT / flyDur);
    const eased = Easing.easeOutCubic(k);

    // Arc: parabolic Y, linear X
    const cx = c.fromX + (c.toX - c.fromX) * eased;
    const linearY = c.fromY + (c.toY - c.fromY) * eased;
    // Arc height
    const arc = Math.sin(k * Math.PI) * -180;
    const cy = linearY + arc;

    const rot = (k * 720) % 360;
    const scale = 0.4 + 0.6 * eased;
    const op = Math.min(1, k * 2);

    // Settle: small bounce
    const settleK = Math.max(0, Math.min(1, (localT - flyDur) / 0.25));
    const settleSquash = settleK > 0 && settleK < 1 ? 1 + Math.sin(settleK * Math.PI) * 0.04 : 1;

    return (
      <Chip
        key={i}
        x={cx}
        y={cy}
        color={c.color}
        value={c.value}
        rot={rot}
        scale={scale * settleSquash}
        opacity={op}
        zIndex={100 + i}
      />
    );
  });
}

// SCENE 5 — AI HUD reveal (11.3 → 13.8s, 2.5s window)
function HudScene() {
  const { localTime } = useSprite();
  const t = localTime;

  // Two HUDs animate in: equity (top-left), recommendation (bottom-right)
  const op1 = interpolate([0, 0.35, 2.1, 2.5], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const sc1 = interpolate([0, 0.45, 2.1], [0.85, 1, 1], Easing.easeOutBack)(t);

  const op2 = interpolate([0.3, 0.75, 2.1, 2.5], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const sc2 = interpolate([0.3, 0.85, 2.1], [0.85, 1, 1], Easing.easeOutBack)(t);

  const bar = interpolate([0.5, 1.8], [0, 72], Easing.easeOutCubic)(t);

  // Equity number ticks up
  const eqNum = Math.round(interpolate([0.5, 1.8], [0, 72.4], Easing.easeOutCubic)(t) * 10) / 10;

  return (
    <>
      <HUD
        x={400}
        y={300}
        label="Probabilidad de ganar"
        value={`${eqNum.toFixed(1)}%`}
        sub="Equity vs. 2 rivales"
        barPct={bar}
        opacity={op1}
        scale={sc1}
        rot={-3}
        color="oklch(0.82 0.14 82)"
      />
      <HUD
        x={1500}
        y={780}
        label="Recomendación AI"
        value="Raise"
        sub="+ 60% del bote · EV +14.2bb"
        opacity={op2}
        scale={sc2}
        rot={3}
        color="ai"
      />
    </>
  );
}

// SCENE 6 — Closing tagline (13.8 → 16s, 2.2s window)
function ClosingScene() {
  const { localTime } = useSprite();
  const t = localTime;

  const op1 = interpolate([0, 0.45, 1.7, 2.2], [0, 1, 1, 0], Easing.easeOutCubic)(t);
  const y1 = interpolate([0, 0.45], [30, 0], Easing.easeOutCubic)(t);

  const op2 = interpolate([0.35, 0.8, 1.7, 2.2], [0, 1, 1, 0], Easing.easeOutCubic)(t);

  const dimOp = interpolate([0, 0.45, 1.7, 2.2], [0, 0.55, 0.55, 0], Easing.easeOutCubic)(t);

  return (
    <>
      {/* Soft dim overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "oklch(0 0 0)",
          opacity: dimOp,
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 380,
          textAlign: "center",
          zIndex: 220,
          opacity: op1,
          transform: `translateY(${y1}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "Cormorant, serif",
            fontSize: 132,
            lineHeight: 1.0,
            color: "oklch(0.96 0.008 80)",
            letterSpacing: "-0.02em",
            fontWeight: 500,
          }}
        >
          Domina el póker.
        </div>
        <div
          style={{
            fontFamily: "Cormorant, serif",
            fontSize: 132,
            lineHeight: 1.0,
            marginTop: 4,
            background: "linear-gradient(180deg, oklch(0.82 0.14 82), oklch(0.66 0.13 75))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
            fontWeight: 500,
          }}
        >
          Decide con datos.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 760,
          textAlign: "center",
          zIndex: 220,
          opacity: op2,
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 18,
            letterSpacing: "0.4em",
            color: "oklch(0.82 0.14 82)",
            textTransform: "uppercase",
          }}
        >
          solver · poker · ai
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: "Manrope, sans-serif",
            fontSize: 16,
            color: "oklch(0.74 0.012 80)",
          }}
        >
          Aprende. Practica. Decide.
        </div>
      </div>
    </>
  );
}

// ============================================================================
// CAMERA — gentle drift/zoom across the whole canvas
// ============================================================================

function Camera({ children }) {
  const time = useTime();
  // Subtle zoom-in throughout, with key zooms at scene boundaries
  const zoom = interpolate(
    [0, 1.8, 4.3, 6.8, 9.3, 11.3, 13.8, 16],
    [1.0, 1.0, 1.06, 1.10, 1.04, 1.0, 1.06, 1.02],
    Easing.easeInOutCubic
  )(time);
  const panX = interpolate(
    [0, 1.8, 4.3, 6.8, 9.3, 11.3, 13.8, 16],
    [0, 0, -20, -40, 0, 0, 30, 0],
    Easing.easeInOutCubic
  )(time);
  const panY = interpolate(
    [0, 1.8, 4.3, 6.8, 9.3, 11.3, 13.8, 16],
    [0, 0, -10, 30, 60, 0, -20, 0],
    Easing.easeInOutCubic
  )(time);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: "center",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// SCENE LABEL — bottom-left
// ============================================================================

function SceneLabel() {
  const time = useTime();
  const scenes = [
    { start: 0, end: 1.8, label: "Solver · Poker AI" },
    { start: 1.8, end: 4.3, label: "Se reparte" },
    { start: 4.3, end: 6.8, label: "Tu mano" },
    { start: 6.8, end: 9.3, label: "Flop" },
    { start: 9.3, end: 11.3, label: "Apuesta" },
    { start: 11.3, end: 13.8, label: "Análisis AI" },
    { start: 13.8, end: 16, label: "Solver" },
  ];
  const current = scenes.find((s) => time >= s.start && time < s.end) || scenes[scenes.length - 1];
  const idx = scenes.indexOf(current);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        left: 64,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: "JetBrains Mono, monospace",
        color: "oklch(0.96 0.008 80 / 0.7)",
      }}
    >
      <span style={{ fontSize: 13, letterSpacing: "0.2em" }}>
        {String(idx + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
      </span>
      <span
        style={{
          width: 32,
          height: 1,
          background: "oklch(0.78 0.13 82 / 0.6)",
        }}
      />
      <span
        style={{
          fontSize: 13,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "oklch(0.82 0.14 82)",
        }}
      >
        {current.label}
      </span>
    </div>
  );
}

function Timecode() {
  const time = useTime();
  const { duration } = useTimeline();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        right: 64,
        zIndex: 500,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: 13,
        letterSpacing: "0.18em",
        color: "oklch(0.55 0.012 80)",
      }}
    >
      <span style={{ color: "oklch(0.82 0.14 82)" }}>{time.toFixed(2).padStart(5, "0")}</span>
      <span> / </span>
      <span>{duration.toFixed(2)}</span>
    </div>
  );
}

// ============================================================================
// MAIN — reusable inner content (shared by autoplay trailer + scroll embed)
// ============================================================================

function TrailerInner() {
  return (
    <>
      <Camera>
        <Felt />

        <Sprite start={0} end={1.8}>
          <LogoScene />
        </Sprite>

        <Sprite start={1.8} end={4.4}>
          <DealScene />
        </Sprite>

        <Sprite start={4.3} end={6.9}>
          <RevealScene />
        </Sprite>

        {/* keep hero cards visible after their reveal scene */}
        <Sprite start={6.8} end={13.8}>
          <PCard code="Ah" x={820} y={700} rot={-10} scale={1.25} flipProgress={1} zIndex={50} />
          <PCard code="Kh" x={1100} y={700} rot={10} scale={1.25} flipProgress={1} zIndex={51} />
        </Sprite>

        <Sprite start={6.8} end={13.8}>
          <FlopScene />
        </Sprite>

        {/* keep flop visible */}
        <Sprite start={9.3} end={13.8}>
          <PCard code="7h" x={780} y={380} flipProgress={1} zIndex={20} />
          <PCard code="2d" x={960} y={380} flipProgress={1} zIndex={21} />
          <PCard code="Th" x={1140} y={380} flipProgress={1} zIndex={22} />
        </Sprite>

        <Sprite start={9.3} end={13.8}>
          <ChipScene />
        </Sprite>

        {/* keep chip stack visible after toss */}
        <Sprite start={10.8} end={13.8}>
          {[
            { color: "red", value: 25, x: 940, y: 870 },
            { color: "blue", value: 100, x: 985, y: 875 },
            { color: "gold", value: 500, x: 950, y: 860 },
            { color: "red", value: 25, x: 975, y: 855 },
            { color: "blue", value: 100, x: 945, y: 850 },
            { color: "green", value: 50, x: 980, y: 845 },
            { color: "black", value: 1000, x: 962, y: 840 },
            { color: "gold", value: 500, x: 925, y: 835 },
            { color: "red", value: 25, x: 995, y: 830 },
            { color: "blue", value: 100, x: 955, y: 825 },
          ].map((c, i) => (
            <Chip key={i} {...c} zIndex={100 + i} />
          ))}
        </Sprite>

        <Sprite start={11.3} end={13.9}>
          <HudScene />
        </Sprite>

        <Sprite start={13.8} end={16}>
          <ClosingScene />
        </Sprite>
      </Camera>
    </>
  );
}

function Trailer() {
  return (
    <Stage width={1920} height={1080} duration={16} background="oklch(0.09 0.01 60)" persistKey="solver-trailer">
      <TrailerInner />
      <SceneLabel />
      <Timecode />
    </Stage>
  );
}

// Expose for the standalone trailer and the home preview.
Object.assign(window, {
  Trailer,
  TrailerInner,
  TrailerSceneLabel: SceneLabel,
  TrailerDuration: 16,
});

// Auto-mount only if standalone trailer page is present
const trailerEl = document.getElementById("trailer-root");
if (trailerEl) {
  const trailerRoot = ReactDOM.createRoot(trailerEl);
  trailerRoot.render(<Trailer />);
}
