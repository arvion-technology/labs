/* Landing Kit, shared behaviour for the six templates.
   Theme persistence, mobile nav, scroll state and reveal-on-scroll. No deps. */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "landing-kit:theme";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode */ }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    });
  }

  var initial = stored() || root.getAttribute("data-theme") || "light";
  apply(initial === "dark" ? "dark" : "light");

  document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  // Mobile navigation
  var nav = document.querySelector("[data-nav]");
  var burger = document.querySelector("[data-nav-toggle]");
  if (nav && burger) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll(".lk-nav-links a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Sticky nav gets a border only after the page moves.
  if (nav) {
    var onScroll = function () { nav.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Reveal on scroll, with an instant path for reduced motion and no-IO browsers.
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (node) { node.classList.add("is-visible"); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (node) { observer.observe(node); });
  }

  // Footer year is computed; no build step to update it.
  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  // The capture script and the gallery thumbnails ask for clean pages: hide the
  // "back to gallery" pill so the page is shown as a stand-alone template.
  if (/[?&]shot=1(?:&|$)/.test(location.search)) root.classList.add("shot");
  if (/[?&]embed=1(?:&|$)/.test(location.search)) root.classList.add("embed");
})();
