// Vanilla helpers for rendering playing-card markup as HTML strings.
// Used by the static pages (home, learn). Interactive pages have their own React Card component.
(function (global) {
  const SUITS = {
    s: { glyph: "♠", red: false, name: "Spades" },
    h: { glyph: "♥", red: true, name: "Hearts" },
    d: { glyph: "♦", red: true, name: "Diamonds" },
    c: { glyph: "♣", red: false, name: "Clubs" },
  };

  function parseCard(code) {
    // code like "As", "Kh", "10d", "Tc"
    const rank = code.slice(0, code.length - 1).replace(/^10$/, "T");
    const suit = code.slice(-1).toLowerCase();
    return { rank, suit, info: SUITS[suit] };
  }

  function cardHtml(code, size = "md") {
    const cls = { md: "card-3d", sm: "card-3d card-sm", xs: "card-3d card-xs" }[size];
    const { rank, info } = parseCard(code);
    const r = rank === "T" ? "10" : rank;
    const red = info.red ? " red" : "";
    return `
      <div class="${cls}${red}">
        <div class="corner tl"><span class="rank">${r}</span><span class="suit">${info.glyph}</span></div>
        <div class="pip">${info.glyph}</div>
        <div class="corner br"><span class="rank">${r}</span><span class="suit">${info.glyph}</span></div>
      </div>`;
  }

  function backHtml(size = "md") {
    const cls = { md: "card-3d back", sm: "card-3d card-sm back", xs: "card-3d card-xs back" }[size];
    return `<div class="${cls}"></div>`;
  }

  global.PokerCard = { cardHtml, backHtml, parseCard, SUITS };
})(window);
