// Gallery filtering. No dependencies, no tracking.
(() => {
  const cards = Array.from(document.querySelectorAll(".project-card"));
  const buttons = Array.from(document.querySelectorAll(".filter"));
  const input = document.getElementById("filter-input");
  const empty = document.getElementById("no-results");
  let category = "all";

  function apply() {
    const q = (input?.value || "").trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const matchesCategory = category === "all" || card.dataset.category === category;
      const matchesText = !q || card.dataset.search.includes(q);
      const show = matchesCategory && matchesText;
      card.hidden = !show;
      if (show) visible++;
    }
    if (empty) empty.hidden = visible !== 0;
  }
  buttons.forEach((b) => b.addEventListener("click", () => {
    category = b.dataset.filter;
    buttons.forEach((x) => x.classList.toggle("active", x === b));
    apply();
  }));
  input?.addEventListener("input", apply);

  // show the recorded demo on hover (loaded lazily, once)
  for (const img of document.querySelectorAll("img[data-gif]")) {
    const card = img.closest(".shot");
    if (!card) continue;
    const swap = () => {
      if (img.dataset.swapped) return;
      img.dataset.staticSrc = img.src;
      img.src = img.dataset.gif;
      img.dataset.swapped = "1";
    };
    const restore = () => {
      if (!img.dataset.staticSrc) return;
      img.src = img.dataset.staticSrc;
      img.dataset.swapped = "";
    };
    card.addEventListener("mouseenter", swap);
    card.addEventListener("mouseleave", restore);
    card.addEventListener("focus", swap);
    card.addEventListener("blur", restore);
  }
})();
