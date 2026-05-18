// Compact autoplay trailer for the home page.
// Requires animations.jsx + trailer-scenes.jsx to be loaded first.

function HomeTrailerPreview() {
  const W = 1920;
  const H = 1080;
  const DURATION = window.TrailerDuration || 16;
  const [time, setTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(() => {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [scale, setScale] = React.useState(1);
  const frameRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  React.useEffect(() => {
    const measure = () => {
      const frame = frameRef.current;
      if (!frame) return;
      const s = Math.min(frame.clientWidth / W, frame.clientHeight / H);
      setScale(Math.max(0.05, s));
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (frameRef.current) ro.observe(frameRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      if (media.matches) setPlaying(false);
    };

    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);
    return () => media.removeEventListener("change", syncMotionPreference);
  }, []);

  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }

    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((current) => {
        const next = current + dt;
        return next >= DURATION ? next % DURATION : next;
      });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, DURATION]);

  React.useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setPlaying(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const ctxValue = React.useMemo(
    () => ({ time, duration: DURATION, playing, setTime, setPlaying }),
    [time, DURATION, playing]
  );

  const progressPct = DURATION > 0 ? (time / DURATION) * 100 : 0;
  const formatTime = (value) => {
    const seconds = Math.max(0, Math.floor(value));
    return `0:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <section className="trailer-preview" data-screen-label="trailer-preview">
      <div className="container trailer-preview-grid">
        <div className="trailer-preview-copy reveal">
          <div className="eyebrow"><span className="dot"></span>Trailer cinemático</div>
          <h2 className="font-display">Una mano en 16 segundos.</h2>
          <p>
            Un vistazo cinematográfico al flujo de Solver: cartas, equity,
            apuesta y recomendación AI en una sola secuencia.
          </p>
          <div className="trailer-preview-actions">
            <a className="btn btn-primary btn-lg" href="trailer.html">Ver en pantalla completa</a>
            <a className="btn btn-ghost btn-lg" href="practicar.html">Jugar demo</a>
          </div>
        </div>

        <div className="trailer-preview-player reveal" aria-label="Trailer de Solver Poker">
          <div className="trailer-preview-frame" ref={frameRef}>
            <div
              className="trailer-preview-canvas"
              style={{
                width: W,
                height: H,
                transform: `scale(${scale})`,
              }}
            >
              <window.TimelineContext.Provider value={ctxValue}>
                <window.TrailerInner />
              </window.TimelineContext.Provider>
            </div>
          </div>

          <div className="trailer-preview-controls">
            <button
              className="trailer-play-button"
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "Pausar trailer" : "Reproducir trailer"}
              title={playing ? "Pausar trailer" : "Reproducir trailer"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <input
              className="trailer-progress"
              type="range"
              min="0"
              max={DURATION}
              step="0.01"
              value={time}
              aria-label="Progreso del trailer"
              style={{ "--progress": `${progressPct}%` }}
              onChange={(event) => {
                setTime(Number(event.target.value));
                setPlaying(false);
              }}
            />

            <span className="trailer-time">
              {formatTime(time)} / {formatTime(DURATION)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const embedEl = document.getElementById("trailer-embed-root");
if (embedEl && window.React && window.ReactDOM && window.TimelineContext && window.TrailerInner) {
  const root = ReactDOM.createRoot(embedEl);
  root.render(<HomeTrailerPreview />);
}
