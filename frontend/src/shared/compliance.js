// Age gate, cookie preferences and Vercel Web Analytics bootstrap.
(function () {
  const AGE_COOKIE = "solver_age_verified";
  const CONSENT_COOKIE = "solver_cookie_consent";
  const ONE_YEAR = 60 * 60 * 24 * 365;
  const SIX_MONTHS = 60 * 60 * 24 * 180;

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    const item = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return item ? decodeURIComponent(item.slice(prefix.length)) : "";
  }

  function setCookie(name, value, maxAge) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function ensureAnalyticsQueue() {
    window.va =
      window.va ||
      function () {
        (window.vaq = window.vaq || []).push(arguments);
      };
  }

  function loadVercelAnalytics() {
    if (window.__solverAnalyticsLoaded) return;
    window.__solverAnalyticsLoaded = true;

    const script = document.createElement("script");
    script.defer = true;
    script.src = "/_vercel/insights/script.js";
    script.dataset.solverAnalytics = "true";
    document.head.appendChild(script);
  }

  function enableAnalyticsIfAllowed() {
    if (getCookie(CONSENT_COOKIE) === "all") loadVercelAnalytics();
  }

  function showAgeGate() {
    if (document.querySelector("[data-age-gate]")) return;

    document.documentElement.classList.add("solver-age-lock");

    const overlay = createElement("div", "solver-age-gate");
    overlay.dataset.ageGate = "true";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "age-gate-title");

    const card = createElement("div", "solver-age-card");
    const eyebrow = createElement("div", "solver-age-eyebrow", "+18 · Acceso restringido");
    const title = createElement("h2", "", "¿Eres mayor de edad?");
    title.id = "age-gate-title";
    const text = createElement(
      "p",
      "",
      "Solver Poker contiene contenido relacionado con póker y solo está disponible para usuarios mayores de edad."
    );

    const actions = createElement("div", "solver-age-actions");
    const yesButton = createElement("button", "btn btn-primary", "Sí, soy mayor de 18");
    const noButton = createElement("button", "btn btn-ghost", "No, soy menor");

    yesButton.type = "button";
    noButton.type = "button";
    yesButton.addEventListener("click", () => {
      setCookie(AGE_COOKIE, "yes", ONE_YEAR);
      document.documentElement.classList.remove("solver-age-lock");
      overlay.remove();
      showCookieBanner();
    });
    noButton.addEventListener("click", () => showDeniedScreen(overlay));

    actions.append(yesButton, noButton);
    card.append(eyebrow, title, text, actions);
    overlay.append(card);
    document.body.appendChild(overlay);
    yesButton.focus({ preventScroll: true });
  }

  function showDeniedScreen(overlay) {
    document.documentElement.classList.add("solver-age-lock", "solver-age-denied-lock");
    overlay.classList.add("solver-age-denied");
    overlay.innerHTML = "";

    const card = createElement("div", "solver-age-card");
    const eyebrow = createElement("div", "solver-age-eyebrow", "Acceso bloqueado");
    const title = createElement("h2", "", "No puedes entrar a esta web");
    const text = createElement(
      "p",
      "",
      "Este contenido es solo para mayores de edad. Si has marcado esta opción por error, refresca la página para volver a verificar."
    );

    card.append(eyebrow, title, text);
    overlay.append(card);
    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
  }

  function showCookieBanner() {
    const consent = getCookie(CONSENT_COOKIE);
    if (consent) {
      enableAnalyticsIfAllowed();
      return;
    }
    if (document.querySelector("[data-cookie-banner]")) return;

    const banner = createElement("div", "solver-cookie-banner");
    banner.dataset.cookieBanner = "true";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Preferencias de cookies");

    const copy = createElement("div", "solver-cookie-copy");
    const title = createElement("strong", "", "Cookies y medición");
    const text = createElement(
      "p",
      "",
      "Usamos cookies necesarias para recordar tu verificación de edad y tus preferencias. Con tu consentimiento activamos Vercel Web Analytics para medir visitas de forma agregada."
    );
    const link = createElement("a", "", "Privacidad");
    link.href = "privacidad.html";
    copy.append(title, text, link);

    const actions = createElement("div", "solver-cookie-actions");
    const accept = createElement("button", "btn btn-primary btn-sm", "Aceptar");
    const necessary = createElement("button", "btn btn-ghost btn-sm", "Solo necesarias");
    accept.type = "button";
    necessary.type = "button";

    accept.addEventListener("click", () => {
      setCookie(CONSENT_COOKIE, "all", SIX_MONTHS);
      banner.remove();
      loadVercelAnalytics();
    });
    necessary.addEventListener("click", () => {
      setCookie(CONSENT_COOKIE, "necessary", SIX_MONTHS);
      banner.remove();
    });

    actions.append(accept, necessary);
    banner.append(copy, actions);
    document.body.appendChild(banner);
  }

  ready(() => {
    ensureAnalyticsQueue();
    if (getCookie(AGE_COOKIE) === "yes") {
      showCookieBanner();
      return;
    }
    showAgeGate();
  });
})();
