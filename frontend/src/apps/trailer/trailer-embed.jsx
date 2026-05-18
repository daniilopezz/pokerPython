// Scroll-driven embed of the Solver trailer. Mounts inside a tall section;
// the playhead is driven by the user's scroll position through that section.
// Requires animations.jsx + trailer-scenes.jsx to be loaded first.

function ScrollTrailerStage() {
  const [time, setTime] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const sectionRef = React.useRef(null);
  const stickyRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const W = 1920, H = 1080;
  const DURATION = window.TrailerDuration || 16;

  // Auto-scale canvas to fit inner area width
  React.useEffect(() => {
    const measure = () => {
      const el = stickyRef.current;
      if (!el) return;
      const padY = 0;
      const w = el.clientWidth;
      const h = el.clientHeight - padY;
      const s = Math.min(w / W, h / H);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (stickyRef.current) ro.observe(stickyRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Map scroll within section → time 0..duration
  React.useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const sec = sectionRef.current;
        if (!sec) return;
        const rect = sec.getBoundingClientRect();
        const total = sec.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / total));
        setTime(progress * DURATION);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [DURATION]);

  const ctxValue = React.useMemo(
    () => ({ time, duration: DURATION, playing: false, setTime: () => {}, setPlaying: () => {} }),
    [time]
  );

  // progress bar pct
  const progressPct = (time / DURATION) * 100;

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        height: "320vh",
        background: "oklch(0.06 0.01 60)",
      }}
      data-screen-label="trailer-scroll"
    >
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Eyebrow + scroll hint */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 50,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 18px",
              borderRadius: 999,
              background: "oklch(0 0 0 / 0.55)",
              backdropFilter: "blur(14px)",
              border: "1px solid oklch(0.28 0.01 60)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--gold)",
                boxShadow: "0 0 12px var(--gold)",
              }}
            />
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-mute)",
              }}
            >
              Scroll para reproducir · Solver trailer
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{
            width: W,
            height: H,
            background: "oklch(0.09 0.01 60)",
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            flexShrink: 0,
            overflow: "hidden",
            boxShadow: "0 30px 100px oklch(0 0 0 / 0.6)",
          }}
        >
          <window.TimelineContext.Provider value={ctxValue}>
            <window.TrailerInner />
          </window.TimelineContext.Provider>
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(560px, 70%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 50,
          }}
        >
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "var(--gold)",
              letterSpacing: "0.18em",
              width: 56,
            }}
          >
            {time.toFixed(1).padStart(4, "0")}s
          </span>
          <div
            style={{
              flex: 1,
              height: 3,
              background: "oklch(0.22 0.014 60)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: progressPct + "%",
                height: "100%",
                background:
                  "linear-gradient(90deg, oklch(0.82 0.14 200), oklch(0.82 0.14 82))",
                transition: "none",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              color: "var(--text-dim)",
              letterSpacing: "0.18em",
              width: 40,
              textAlign: "right",
            }}
          >
            {DURATION}s
          </span>
        </div>
      </div>
    </section>
  );
}

const embedEl = document.getElementById("trailer-embed-root");
if (embedEl) {
  const root = ReactDOM.createRoot(embedEl);
  root.render(<ScrollTrailerStage />);
}
