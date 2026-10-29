// Bazaar App, case-study site.
// Screen records, money, checkout and filters come from ../src.
import { LISTINGS, SCREENS, PRODUCT, SELLER, SELLER_ORDERS } from "../src/catalog.js";
import { formatNPR, quote, settlement, rupees } from "../src/money.js";
import { CHECKOUT_STATES, PAYMENT_METHODS, CHECKOUT_FLOWS } from "../src/checkout.js";
import { applyFilters, CATEGORIES } from "../src/filters.js";

const $ = A.$, $$ = A.$$, el = A.el;

const sample = quote({ items: [{ price: LISTINGS[0].price, qty: 1 }], distanceKm: LISTINGS[0].distanceKm });
const split = settlement(sample);

/* --------------------------------------------------------------- phone mocks */

function screenBody(record) {
  if (record.id === "feed" || record.id === "listing") {
    return LISTINGS.slice(0, 3).map((listing) => el("div", { class: "bz-listing" },
      el("span", { class: "thumb" }),
      el("div", {}, el("b", { text: listing.title }), el("div", { class: "price", text: formatNPR(listing.price) }),
        el("div", { class: "meta", text: `${listing.location} · ${listing.distanceKm} km` }))));
  }
  if (record.id === "checkout") {
    return [
      el("div", { class: "bz-listing" }, el("span", { class: "thumb" }), el("div", {}, el("b", { text: "iPhone 13, 128 GB" }), el("div", { class: "price", text: "NPR 68,500" }))),
      el("div", { class: "bz-sub", text: "Deliver to Baneshwor" }),
      ["Subtotal", "Delivery", "Platform fee", "Total"].map((label, index) => el("div", { class: "quote-line" + (index === 3 ? " total" : "") },
        el("span", { text: label }),
        el("span", { text: formatNPR([sample.subtotal, sample.delivery, sample.platformFee, sample.total][index]) }))),
      el("div", { class: "bz-chips" }, ...PAYMENT_METHODS.map((method) => el("span", { text: method.label }))),
    ];
  }
  if (record.id === "seller" || record.id === "orders") {
    return SELLER_ORDERS.map((order) => el("div", { class: "bz-listing" },
      el("span", { class: "thumb" }),
      el("div", {}, el("b", { text: order.id }), el("div", { class: "meta", text: `${order.buyer} · ${order.state}` }),
        el("div", { class: "price", text: formatNPR(order.total) }))));
  }
  return [
    el("div", { class: "bz-listing" }, el("span", { class: "thumb" }), el("div", {}, el("b", { text: "Sabina M." }), el("div", { class: "meta", text: "Verified seller · replies in an hour" }))),
    el("div", { class: "bz-sub", text: "You: Is the box included?" }),
    el("div", { class: "bz-sub", text: "Sabina: Yes, with the charger." }),
    el("div", { class: "bz-sub", text: "Offer sent · NPR 65,000 · 24h" }),
  ];
}

function phone(record) {
  const screen = el("div", { class: "bz-screen" },
    el("div", { class: "bz-status" }, el("span", { text: "9:41" }), el("span", { text: "▮▮ 4G" })),
    el("div", { class: "bz-appbar", text: record.header }),
    el("div", { class: "bz-sub", text: record.role === "seller" ? "Seller workspace" : "Nearby · Kathmandu" }),
    el("div", { class: "bz-input", text: record.id === "feed" ? "⌕ Search mobiles, furniture, bikes" : record.header }),
    record.id === "feed" || record.id === "listing"
      ? el("div", { class: "bz-chips" }, ...["mobiles", "furniture", "electronics"].map((category) => el("span", { text: category })))
      : null,
    ...screenBody(record),
    el("div", { class: "bz-tabs" }, ...record.footer.map((label) => el("span", { text: label }))));
  return el("div", { class: "bz-phone" }, screen);
}

/* --------------------------------------------------------------- overview */

function statCard(label, value, sub, tone = "gold") {
  return el("div", { class: "card" },
    el("div", { class: "stat" },
      el("div", { class: "stat-label", text: label }),
      el("div", { class: `stat-value ${tone}`, text: value }),
      el("div", { class: "small muted", text: sub })));
}

function overviewPage(main) {
  main.append(el("section", { class: "bz-hero" },
    el("div", {},
      el("div", { class: "eyebrow" }, "React Native case study · live product"),
      el("h1", {}, "A national marketplace with ", el("em", { text: "cash, wallets" }), " and a cache that keeps the feed readable."),
      el("p", { class: "lede" }, PRODUCT.summary),
      el("div", { class: "bz-actions" },
        el("a", { class: "btn primary", href: "#/screens", text: "See the six screens" }),
        el("a", { class: "btn", href: "#logic", text: "Read the logic" })),
      el("div", { class: "bz-meta" },
        el("span", {}, el("b", { text: "Expo" }), " · Router"),
        el("span", {}, el("b", { text: "Live at" }), " hamrosajhabazaar.com"),
        el("span", {}, el("b", { text: String(LISTINGS.length) }), " sample listings"),
        el("span", {}, el("b", { text: "MIT" }), " licensed"))),
    el("div", { class: "phone-wrap" },
      phone(SCREENS[0]),
      el("div", { class: "phone-tag" }, el("span", { class: "badge green" }, el("span", { class: "dot pulse" }), "live"), el("span", { text: "feed, cached offline" })))));

  main.append(el("div", { class: "bz-stats" },
    statCard("Screens", String(SCREENS.length), "Buyer and seller"),
    statCard("Checkout states", String(CHECKOUT_STATES.length), `${PAYMENT_METHODS.length} payment methods`, "blue"),
    statCard("Sample listings", String(LISTINGS.length), "Prices stored in paisa"),
    statCard("Logic tests", "20", "node:test on pure modules", "green")));

  main.append(el("div", { class: "section-head" },
    el("h2", { text: "The logic worth reading" }),
    el("p", { text: "Four modules carry the behaviour that is easy to get wrong. They are plain JavaScript with JSDoc types, imported by the Expo screens and tested with node:test." })));
  main.append(el("div", { class: "logic-grid" },
    el("div", { class: "card logic-card" }, el("div", { class: "tagline" }, "checkout.js"), el("h3", { text: "Eight-state checkout" }), el("p", { text: "cart → address → review → payment → processing → paid, with a failed branch and a retry that keeps the cart." })),
    el("div", { class: "card logic-card" }, el("div", { class: "tagline" }, "money.js"), el("h3", { text: "Money in paisa" }), el("p", { text: "Integer paisa end to end, a 2% platform fee with a floor, delivery by distance and a settlement split." })),
    el("div", { class: "card logic-card" }, el("div", { class: "tagline" }, "filters.js"), el("h3", { text: "Offline search" }), el("p", { text: "Query, category, price and distance filters; five explicit sort orders and facet counts." })),
    el("div", { class: "card logic-card" }, el("div", { class: "tagline" }, "cache.js"), el("h3", { text: "Stale-while-refresh" }), el("p", { text: "A TTL cache that exposes fresh vs stale reads, so the feed never blanks while a request is in flight." }))));

  main.append(el("div", { class: "section-head", id: "logic" },
    el("h2", { text: "Checkout, made explicit" }),
    el("p", { text: "The happy path is six states. Cash on delivery changes the guard on the last one, and a failed payment returns to payment without losing the cart." })));
  main.append(el("div", { class: "bz-grid" },
    el("div", { class: "card bz-card" },
      el("h3", { text: "eSewa / Khalti path" }),
      el("div", { class: "flow-strip" }, ...CHECKOUT_FLOWS.esewa.map((state, index) => [
        !index ? null : el("span", { class: "flow-arrow", text: "→" }),
        el("span", { class: `flow-node ${state === "paid" ? "paid" : ""}`, text: state }),
      ]).flat()),
      el("div", { class: "methods" }, ...PAYMENT_METHODS.map((method, index) => el("span", { class: `method ${index === 0 ? "on" : ""}`, text: method.label }))),
      el("p", { class: "small muted", style: "margin-top:14px", text: "Cash on delivery reaches paid only after deliveryConfirmed is true. The guard is a property of the checkout, not a UI flag." })),
    el("div", { class: "card bz-card" },
      el("h3", { text: "The same order, as money" }),
      el("div", { class: "quote-lines" },
        el("div", { class: "quote-line" }, el("span", { text: "Subtotal" }), el("span", { text: formatNPR(sample.subtotal) })),
        el("div", { class: "quote-line" }, el("span", { text: "Delivery · 2.4 km" }), el("span", { text: formatNPR(sample.delivery) })),
        el("div", { class: "quote-line" }, el("span", { text: "Platform fee · 2%" }), el("span", { text: formatNPR(sample.platformFee) })),
        el("div", { class: "quote-line total" }, el("span", { text: "Buyer pays" }), el("span", { text: formatNPR(sample.total) }))),
      el("div", { class: "code-block", style: "margin-top:14px" },
        `settlement(quote) →\n  seller: ${formatNPR(split.seller)}\n  platform: ${formatNPR(split.platform)}\n  check: ${formatNPR(split.check)} = total`),
      el("p", { class: "small muted", style: "margin-top:12px", text: "The sample listing is " + formatNPR(LISTINGS[0].price) + " (" + rupees(LISTINGS[0].price) + " rupees). formatNPR is the only function that turns paisa back into a display string." }))));

  main.append(el("div", { class: "section-head" },
    el("h2", { text: "Seller side" }),
    el("p", { text: "The seller dashboard is not the buyer feed with a different label. It shows views, open orders and the settled amount after fees." })));
  main.append(el("div", { class: "bz-grid" },
    el("div", { class: "card bz-card" },
      el("h3", { text: `${SELLER.name} · ${SELLER.rating} rating` }),
      el("p", { class: "small muted", text: `${SELLER.reviews} reviews · joined ${SELLER.joined} · ${SELLER.verified ? "KYC verified" : "verification pending"}` }),
      el("div", { style: "display:flex;gap:10px;margin-top:14px" },
        ...SELLER_ORDERS.map((order) => el("div", { class: "card flat pad-sm", style: "flex:1" },
          el("div", { class: "small muted", text: order.id }),
          el("div", { style: "font-weight:600;font-size:13px;margin-top:3px", text: formatNPR(order.total) }),
          el("div", { class: "small", style: "color:var(--accent-text);margin-top:2px", text: order.state }))))),
    el("div", { class: "card bz-card" },
      el("h3", { text: "What the seller receives" }),
      el("div", { class: "quote-lines" },
        ...SELLER_ORDERS.map((order) => {
          const value = quote({ items: [{ price: order.total, qty: 1 }] });
          return el("div", { class: "quote-line" }, el("span", { text: order.id }), el("span", { text: formatNPR(settlement(value).seller) }));
        })),
      el("p", { class: "small muted", style: "margin-top:12px", text: "Fees are displayed before the seller publishes, not deducted silently at payout." }))));

  main.append(el("div", { class: "product-banner" },
    el("div", {},
      el("h3", { text: "The marketplace is live. This repository is the architecture sample." }),
      el("p", { text: "Hamro Sajha Bazaar runs at hamrosajhabazaar.com. The React Native source here is a representative slice, not the store build; no app-store link is claimed." })),
    el("a", { class: "btn primary sm", href: "https://hamrosajhabazaar.com", target: "_blank", rel: "noopener", text: "Open the product ↗" })));
  main.append(footer());
}

/* --------------------------------------------------------------- screens */

let roleFilter = "all";

function screensPage(main) {
  main.append(el("div", { class: "crumb" }, el("a", { href: "#/", text: "Overview" }), el("span", { text: "/" }), el("span", { text: "Screens" })));
  main.append(el("div", { class: "section-head" },
    el("h2", { text: "Six screens, two audiences" }),
    el("p", { text: "Rendered from the same screen records the tests check. The buyer path is four screens; the seller workspace is two." })));
  main.append(el("div", { class: "role-filter" },
    ...[["all", "All screens"], ["buyer", "Buyer"], ["seller", "Seller"]].map(([id, label]) => el("button", {
      class: roleFilter === id ? "active" : "", type: "button", text: label,
      onclick: () => { roleFilter = id; render(); },
    }))));
  const grid = el("div", { class: "screen-grid" });
  for (const record of SCREENS.filter((screen) => roleFilter === "all" || screen.role === roleFilter)) {
    grid.append(el("div", { class: "screen-card" },
      phone(record),
      el("div", { class: "screen-meta" },
        el("h3", {}, record.name, " ", el("span", { class: "badge", text: record.role })),
        el("div", { class: "route", text: record.route }),
        el("p", { text: record.summary }))));
  }
  main.append(grid);
  main.append(footer());
}

function footer() {
  return el("footer", { class: "bz-footer" },
    el("span", { text: `Hamro Sajha Bazaar case study · ${SCREENS.length} screens · ${LISTINGS.length} sample listings · MIT` }),
    el("span", { class: "spacer" }),
    el("a", { href: "https://hamrosajhabazaar.com", target: "_blank", rel: "noopener", text: "Live product" }),
    el("a", { href: "https://arviontech.net", target: "_blank", rel: "noopener", text: "Arvion Technologies" }));
}

/* --------------------------------------------------------------- routing */

function render() {
  const view = location.hash.replace(/^#\/?/, "").split("/")[0] || "overview";
  const main = $("#view");
  main.innerHTML = "";
  $$("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === view));
  if (view === "screens") screensPage(main);
  else overviewPage(main);
  document.title = `${view === "screens" ? "Screens" : "Case study"}, Hamro Sajha Bazaar`;
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/";
render();
