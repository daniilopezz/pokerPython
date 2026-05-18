(function () {
  const grid = document.querySelector(".rank-grid");
  const tableBody = document.querySelector(".rooms-table tbody");
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
    const registerUrl = safeUrl(room.registerUrl);
    const sourceUrl = safeUrl(room.sourceUrl || room.registerUrl);

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
        <div class="room-bonus">
          <span class="lbl">Bono de registro</span>
          <strong>${escapeHtml(room.bonus || "Consulta la promoción vigente")}</strong>
          <small>${escapeHtml(room.bonusFinePrint || "Las ofertas pueden cambiar y dependen de elegibilidad.")}</small>
        </div>
        <div class="rank-meta">
          <div class="m"><span class="lbl">Mejor para</span><span class="val">${escapeHtml(room.bestFor || room.level || "-")}</span></div>
          <div class="m"><span class="lbl">Perfil</span><span class="val">${escapeHtml(room.players || "-")}</span></div>
          <div class="m" style="grid-column:span 2">
            <span class="lbl">Métricas editoriales</span>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
              ${metricBar("Seguridad", metrics.security)}
              ${metricBar("UX", metrics.ux)}
              ${metricBar("Tráfico", metrics.traffic)}
              ${metricBar("Bono", metrics.bonus)}
            </div>
          </div>
        </div>
        <div class="rank-actions">
          ${registerUrl ? `<a class="btn btn-primary btn-sm" href="${registerUrl}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(room.cta || "Abrir sala")}</a>` : ""}
          ${sourceUrl ? `<a class="room-source" href="${sourceUrl}" target="_blank" rel="noopener noreferrer nofollow">Ver términos</a>` : ""}
        </div>
      </div>
    `;
  }

  function renderRow(room) {
    const metrics = room.metrics || {};
    const muted = Number(room.rank) > 3 ? "var(--text-dim)" : "var(--gold)";
    const registerUrl = safeUrl(room.registerUrl);

    return `
      <tr style="border-bottom:1px solid var(--line-soft)">
        <td style="padding:16px;color:${muted}">${pad(room.rank)}</td>
        <td style="padding:16px;font-family:Cormorant,serif;font-size:18px">${escapeHtml(room.name)}</td>
        <td style="padding:16px;color:var(--text-mute)">${escapeHtml(room.bestFor || room.level || "-")}</td>
        <td style="padding:16px;color:${Number(room.rank) <= 3 ? "var(--text)" : "var(--text-mute)"}">${escapeHtml(room.bonus || "-")}</td>
        <td style="padding:16px;text-align:right">${formatScore(metrics.traffic)}</td>
        <td style="padding:16px;text-align:right">${formatScore(metrics.bonus)}</td>
        <td style="padding:16px;text-align:right;color:${Number(room.rank) <= 3 ? "var(--gold)" : "var(--text)"};font-weight:${Number(room.rank) <= 3 ? 600 : 400}">${formatScore(metrics.score)}</td>
        <td style="padding:16px;text-align:right">${registerUrl ? `<a class="room-link" href="${registerUrl}" target="_blank" rel="noopener noreferrer nofollow">Abrir</a>` : "-"}</td>
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

  function safeUrl(value) {
    const raw = String(value || "");
    return /^https?:\/\//i.test(raw) ? escapeHtml(raw) : "";
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
