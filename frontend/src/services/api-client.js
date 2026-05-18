(function (global) {
  const DEFAULT_TIMEOUT_MS = 5000;
  const API_BASE_URL = (global.SOLVER_API_BASE_URL || "").replace(/\/$/, "");

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
    const url = path.startsWith("http") ? path : API_BASE_URL + path;

    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message || `Error HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.details = payload?.error?.details;
        throw error;
      }

      return payload?.data ?? payload;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La peticion ha tardado demasiado");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  global.SolverApi = {
    request,
    health: () => request("/api/health"),
    dashboardSummary: () => request("/api/dashboard/summary"),
    rooms: () => request("/api/poker/rooms"),
    hands: () => request("/api/poker/hands"),
    recommendations: () => request("/api/poker/recommendations"),
    equity: (payload) => request("/api/poker/equity", { method: "POST", body: payload }),
    recommendation: (payload) => request("/api/poker/recommendation", { method: "POST", body: payload }),
    analyzeHand: (payload) => request("/api/poker/analyze-hand", { method: "POST", body: payload }),
    saveHand: (payload) => request("/api/poker/hands", { method: "POST", body: payload }),
  };
})(window);
