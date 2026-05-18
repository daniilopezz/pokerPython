// Shared UI helpers — reveal on scroll, mobile nav toggle, active link highlighting.
(function () {
  // Reveal-on-scroll
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // Mobile menu toggle (if present)
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");
  if (burger && drawer) {
    burger.setAttribute("aria-expanded", "false");
    burger.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        drawer.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        drawer.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Highlight active nav link based on filename
  const file =
    (location.pathname.split("/").pop() || "index.html").toLowerCase() ||
    "index.html";
  document.querySelectorAll("[data-nav-link]").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (
      href === file ||
      (file === "" && href === "index.html") ||
      (file === "index.html" && href === "index.html")
    ) {
      a.classList.add("active");
    }
  });

  // Nav shadow on scroll
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 12) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
