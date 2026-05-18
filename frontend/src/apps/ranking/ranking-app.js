(function () {
  const grid = document.querySelector(".rank-grid");
  const tableBody = document.querySelector("tbody");
  if (!grid || !tableBody || !window.SolverApi?.rooms) return;

  window.SolverApi.rooms()
    .then((rooms) => {
      if (!Array.isArray(rooms) || rooms.length === 0) return;
      grid.innerHTML = rooms.slice(0, 3).map(renderCard).join("");
      tableBody.innerHTML = rooms.map(renderRow).join("");
    })
    .catch(() => {
      // Static fallback remains available if the API is offline.
    });

  function renderCard(room) {
    const metrics = room.metrics || {};
    return `
      <div class="panel rank-card ${room.featured ? "featured" : ""} reveal in">
        <div class="rank-head">
          <div>
            <div class="rank-tag">RANK ${pad(room.rank)} · ${escapeHtml(room.tag || room.advantage || "")}</div>
            <div class="rank-name">${escapeHtml(room.name)}</div>
          </div>
          <div class="rank-no">${pad(room.rank)}</div>
        </div>
        <p style="color:var(--text-mute);font-size:13px;margin:0;line-height:1.6">${escapeHtml(room.description || room.advantage || "")}</p>
        <ul class="rank-list">
          ${(room.features || []).slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="rank-meta">
          <div class="m"><span class="lbl">Nivel recomendado</span><span class="val">${escapeHtml(room.level || "-")}</span></div>
          <div class="m"><span class="lbl">Tipo de jugadores</span><span class="val">${escapeHtml(room.players || "-")}</span></div>
          <div class="m" style="grid-column:span 2">
            <span class="lbl">Metricas</span>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
              ${metricBar("Seguridad", metrics.security)}
              ${metricBar("UX", metrics.ux)}
              ${metricBar("Trafico", metrics.traffic)}
              ${metricBar("Dureza", metrics.field)}
            </div>
          </div>
        </div>
        <span class="pill ${room.featured ? "pill-gold" : ""}">${escapeHtml(room.advantage || "")}</span>
      </div>
    `;
  }

  function renderRow(room) {
    const metrics = room.metrics || {};
    const muted = Number(room.rank) > 3 ? "var(--text-dim)" : "var(--gold)";
    return `
      <tr style="border-bottom:1px solid var(--line-soft)">
        <td style="padding:16px;color:${muted}">${pad(room.rank)}</td>
        <td style="padding:16px;font-family:Cormorant,serif;font-size:18px">${escapeHtml(room.name)}</td>
        <td style="padding:16px;color:var(--text-mute)">${escapeHtml(room.level || "-")}</td>
        <td style="padding:16px;color:var(--text)">${escapeHtml(room.advantage || "-")}</td>
        <td style="padding:16px;text-align:right">${formatScore(metrics.security)}</td>
        <td style="padding:16px;text-align:right">${formatScore(metrics.ux)}</td>
        <td style="padding:16px;text-align:right">${formatScore(metrics.traffic)}</td>
        <td style="padding:16px;text-align:right;color:${Number(room.rank) <= 3 ? "var(--gold)" : "var(--text)"};font-weight:${Number(room.rank) <= 3 ? 600 : 400}">${formatScore(metrics.score)}</td>
      </tr>
    `;
  }

  function metricBar(label, value) {
    const pct = Math.max(0, Math.min(100, Number(value || 0) * 10));
    return `<div class="rank-bar"><span class="font-mono" style="font-size:10px;color:var(--text-dim);width:90px">${label}</span><div class="b"><div style="width:${pct}%"></div></div><span class="n">${formatScore(value)}</span></div>`;
  }

  function pad(value) {
    return String(value || 0).padStart(2, "0");
  }

  function formatScore(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(1) : "-";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
